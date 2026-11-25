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

  test("the logo must be this institute's finished small image upload (DN-071)", async () => {
    const file = (over: Record<string, unknown>) =>
      t.db.file.create({
        data: {
          instituteId: t.fx.instA.id,
          uploadedById: t.fx.users.superadmin.id,
          bucketKey: `${t.fx.instA.id}/${Math.random().toString(16).slice(2)}.png`,
          mime: "image/png",
          bytes: 2048,
          name: "logo.png",
          uploadedAt: new Date(),
          ...over,
        },
      });
    const patch = (logoFileId: string) => t.call("PATCH", `/api/v1/institutes/${t.fx.instA.id}`, sa, { branding: { city: "इंदौर", logoFileId } });

    const good = await file({});
    const ok = await patch(good.id);
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().branding.logoFileId, good.id);

    const pdf = await file({ mime: "application/pdf", name: "x.pdf" });
    const big = await file({ bytes: 1024 * 1024 + 1 });
    const unfinished = await file({ uploadedAt: null });
    const otherInst = await t.db.file.create({
      data: { instituteId: t.fx.instB.id, uploadedById: t.fx.users.otherAdmin.id, bucketKey: `${t.fx.instB.id}/l.png`, mime: "image/png", bytes: 10, name: "l.png", uploadedAt: new Date() },
    });
    for (const f of [pdf, big, unfinished, otherInst]) {
      const res = await patch(f.id);
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().code, "LOGO_INVALID");
    }
    // Leaving it out removes the logo.
    const removed = await t.call("PATCH", `/api/v1/institutes/${t.fx.instA.id}`, sa, { branding: { city: "इंदौर" } });
    assert.equal(removed.json().branding.logoFileId, undefined);
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
