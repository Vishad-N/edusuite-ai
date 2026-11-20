import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";

const skip = dbTestsSkipReason();

describe("institutes API (real Postgres)", { skip }, () => {
  let t: TestApp;
  let sa: string;
  let ba: string;
  let teacher: string;
  let other: string;

  before(async () => {
    t = await startTestApp();
    sa = await t.token("A-SA");
    ba = await t.token("A-BA");
    teacher = await t.token("A-T");
    other = await t.token("B-BA");
  });
  after(async () => {
    await t?.close();
  });

  test("everyone sees only their own institute", async () => {
    const list = (await t.call("GET", "/api/v1/institutes", teacher)).json();
    assert.deepEqual(list.map((i: { code: string }) => i.code), ["TSTA"]);
    assert.equal((await t.call("GET", `/api/v1/institutes/${t.fx.instA.id}`, teacher)).statusCode, 200);
    assert.equal((await t.call("GET", `/api/v1/institutes/${t.fx.instB.id}`, teacher)).statusCode, 404);
  });

  test("only a super admin edits the institute", async () => {
    const body = { name: "Test Institute A (renamed)", branding: { tagline: "सफलता की ओर", phone: "+91 98260 00000", city: "इंदौर" } };
    assert.equal((await t.call("PATCH", `/api/v1/institutes/${t.fx.instA.id}`, teacher, body)).statusCode, 403);
    assert.equal((await t.call("PATCH", `/api/v1/institutes/${t.fx.instA.id}`, ba, body)).statusCode, 403);
    assert.equal((await t.call("PATCH", `/api/v1/institutes/${t.fx.instA.id}`, other, body)).statusCode, 404);
    const ok = await t.call("PATCH", `/api/v1/institutes/${t.fx.instA.id}`, sa, body);
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().name, "Test Institute A (renamed)");
    assert.deepEqual(ok.json().branding, body.branding);
    assert.equal(await t.db.auditLog.count({ where: { action: "institute.update" } }), 1);
  });

  test("code and AI quota can't be changed from the app", async () => {
    const res = await t.call("PATCH", `/api/v1/institutes/${t.fx.instA.id}`, sa, { code: "HACK", aiMonthlyTokenQuota: 999999999 });
    assert.equal(res.statusCode, 400);
    const row = await t.db.institute.findUniqueOrThrow({ where: { id: t.fx.instA.id } });
    assert.equal(row.code, "TSTA");
  });

  test("any signed-in user can list their institute's branches", async () => {
    const counselor = await t.token("A-C");
    const res = await t.call("GET", `/api/v1/institutes/${t.fx.instA.id}/branches`, counselor);
    assert.deepEqual(res.json().map((b: { code: string }) => b.code), ["MAIN", "SEC"]);
    assert.equal((await t.call("GET", `/api/v1/institutes/${t.fx.instB.id}/branches`, counselor)).statusCode, 404);
  });

  test("only a super admin adds branches; codes are unique per institute", async () => {
    const url = `/api/v1/institutes/${t.fx.instA.id}/branches`;
    assert.equal((await t.call("POST", url, ba, { code: "NEW", name: "New" })).statusCode, 403);
    const created = await t.call("POST", url, sa, { code: "vjn", name: "विजयनगर", city: "इंदौर" });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().code, "VJN");
    const dup = await t.call("POST", url, sa, { code: "VJN", name: "Again" });
    assert.equal(dup.statusCode, 409);
    assert.deepEqual(dup.json().details, { field: "code" });
    // The same code is fine in another institute.
    const otherSa = await t.call("POST", `/api/v1/institutes/${t.fx.instB.id}/branches`, sa, { code: "VJN", name: "x" });
    assert.equal(otherSa.statusCode, 404);
  });

  test("a branch admin edits only their own branch", async () => {
    const own = `/api/v1/institutes/${t.fx.instA.id}/branches/${t.fx.mainA.id}`;
    const notOwn = `/api/v1/institutes/${t.fx.instA.id}/branches/${t.fx.otherA.id}`;
    const ok = await t.call("PATCH", own, ba, { name: "मेन ब्रांच", city: "इंदौर" });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().name, "मेन ब्रांच");
    assert.equal((await t.call("PATCH", notOwn, ba, { name: "x" })).statusCode, 404);
    assert.equal((await t.call("PATCH", notOwn, sa, { city: null })).statusCode, 200);
    assert.equal((await t.call("PATCH", own, teacher, { name: "x" })).statusCode, 403);
    assert.equal((await t.call("PATCH", own, other, { name: "x" })).statusCode, 404);
  });
});
