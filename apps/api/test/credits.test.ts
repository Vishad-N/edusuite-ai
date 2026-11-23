import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { CreditBalanceSchema, CreditEntrySchema, PlatformInstituteSchema } from "@edusuite/shared";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";

const skip = dbTestsSkipReason();

describe("AI credits (real Postgres)", { skip }, () => {
  let t: TestApp;
  let operator: string;
  let sa: string; // institute A super admin
  let teacher: string; // institute A
  let counselor: string; // institute A
  let otherAdmin: string; // institute B

  before(async () => {
    t = await startTestApp();
    operator = await t.token("P-PA");
    sa = await t.token("A-SA");
    teacher = await t.token("A-T");
    counselor = await t.token("A-C");
    otherAdmin = await t.token("B-BA");
  });
  after(async () => {
    await t?.close();
  });

  const grant = (token: string, instituteId: string, delta: number, note = "test grant") =>
    t.call("POST", `/api/v1/platform/institutes/${instituteId}/credits`, token, { delta, note });

  test("only the operator reaches the platform routes", async () => {
    for (const token of [sa, teacher, otherAdmin]) {
      assert.equal((await t.call("GET", "/api/v1/platform/institutes", token)).statusCode, 403);
      assert.equal((await grant(token, t.fx.instA.id, 100)).statusCode, 403);
    }
    assert.equal((await t.call("GET", "/api/v1/platform/institutes")).statusCode, 401);
  });

  test("the operator lists customer institutes, not its own", async () => {
    const res = await t.call("GET", "/api/v1/platform/institutes", operator);
    assert.equal(res.statusCode, 200);
    const list = res.json().map((r: unknown) => PlatformInstituteSchema.parse(r));
    const codes = list.map((i: { code: string }) => i.code).sort();
    assert.deepEqual(codes, ["TSTA", "TSTB"]);
    assert.equal((await grant(operator, t.fx.opInst.id, 10)).statusCode, 404, "can't credit the operator's own institute");
  });

  test("grants and adjustments move the balance, write the ledger and the audit log", async () => {
    const id = t.fx.instA.id;
    const g = await grant(operator, id, 120, "UPI ref 4411");
    assert.equal(g.statusCode, 201);
    const entry = CreditEntrySchema.parse(g.json());
    assert.equal(entry.kind, "grant");
    assert.equal(entry.balanceAfter, 120);
    assert.equal(entry.actor?.displayName, "P-PA");

    const a = CreditEntrySchema.parse((await grant(operator, id, -20, "correction")).json());
    assert.equal(a.kind, "adjust");
    assert.equal(a.balanceAfter, 100);

    // Can't take away more than there is.
    const tooMuch = await grant(operator, id, -101, "too much");
    assert.equal(tooMuch.statusCode, 409);
    assert.equal(tooMuch.json().code, "CREDITS_ADJUST_TOO_LARGE");

    const ledger = (await t.call("GET", `/api/v1/platform/institutes/${id}/credits?limit=1`, operator)).json();
    assert.equal(ledger.items[0].note, "correction", "newest first");
    assert.ok(ledger.nextCursor);
    const next = (await t.call("GET", `/api/v1/platform/institutes/${id}/credits?limit=1&cursor=${ledger.nextCursor}`, operator)).json();
    assert.equal(next.items[0].note, "UPI ref 4411");

    const audit = await t.db.auditLog.findMany({ where: { instituteId: id, action: { startsWith: "credits." } } });
    assert.deepEqual(audit.map((x) => x.action).sort(), ["credits.adjust", "credits.grant"]);

    // Validation: zero or no reason is refused.
    assert.equal((await grant(operator, id, 0)).statusCode, 400);
    assert.equal((await t.call("POST", `/api/v1/platform/institutes/${id}/credits`, operator, { delta: 5 })).statusCode, 400);
  });

  test("an institute sees its own balance and only the prices its role can use", async () => {
    const mine = CreditBalanceSchema.parse((await t.call("GET", "/api/v1/credits", teacher)).json());
    assert.equal(mine.balance, 100);
    assert.ok(mine.prices.some((p) => p.jobType === "deck_quiz"));
    const counselorView = CreditBalanceSchema.parse((await t.call("GET", "/api/v1/credits", counselor)).json());
    assert.deepEqual(counselorView.prices.map((p) => p.jobType).sort(), ["notice_draft"], "DN-008: no AI content, no poster copy");
    const other = CreditBalanceSchema.parse((await t.call("GET", "/api/v1/credits", otherAdmin)).json());
    assert.equal(other.balance, 0, "another institute's credits are separate");

    // Admins see their own history; teachers don't.
    assert.equal((await t.call("GET", "/api/v1/credits/ledger", sa)).statusCode, 200);
    assert.equal((await t.call("GET", "/api/v1/credits/ledger", teacher)).statusCode, 403);
  });

  test("the operator changes a price; the institute sees it", async () => {
    const res = await t.call("PUT", "/api/v1/platform/credit-prices/deck_quiz", operator, { credits: 15, unit: "job" });
    assert.equal(res.statusCode, 200);
    const prices = (await t.call("GET", "/api/v1/platform/credit-prices", operator)).json();
    assert.equal(prices.find((p: { jobType: string }) => p.jobType === "deck_quiz").credits, 15);
    const seen = CreditBalanceSchema.parse((await t.call("GET", "/api/v1/credits", teacher)).json());
    assert.equal(seen.prices.find((p) => p.jobType === "deck_quiz")?.credits, 15);
    assert.equal((await t.call("PUT", "/api/v1/platform/credit-prices/not_a_job", operator, { credits: 1, unit: "job" })).statusCode, 404);
    assert.equal((await t.call("PUT", "/api/v1/platform/credit-prices/deck_quiz", sa, { credits: 0, unit: "job" })).statusCode, 403);
  });

  test("concurrent spending can never take the balance below zero", async () => {
    const id = t.fx.instB.id;
    await grant(operator, id, 5, "small top-up");
    // Ten parallel attempts to remove 1 credit each from a balance of 5: exactly five succeed.
    const results = await Promise.all(Array.from({ length: 10 }, () => grant(operator, id, -1, "race")));
    assert.equal(results.filter((r) => r.statusCode === 201).length, 5);
    const inst = await t.db.institute.findUniqueOrThrow({ where: { id } });
    assert.equal(inst.creditBalance, 0);
    // The database refuses a negative balance even if code tried.
    await assert.rejects(t.db.institute.update({ where: { id }, data: { creditBalance: -1 } }));
  });

  test("the users API can't create or promote anyone to operator", async () => {
    const create = await t.call("POST", "/api/v1/users", sa, {
      employeeCode: "A-NEWPA",
      email: "newpa@test.edusuite.test",
      displayName: "x",
      fullName: "x",
      role: "platform_admin",
      branchId: t.fx.mainA.id,
      password: "Long-enough-1",
    });
    assert.equal(create.statusCode, 400);
  });
});
