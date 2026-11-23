import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { DashboardStatsSchema } from "@edusuite/shared";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";

const skip = dbTestsSkipReason();

const ppt = (title: string) => ({ type: "ppt", title, content: { title, slides: [{ title: "परिचय", points: ["एक"] }] } });
const notice = (title: string) => ({ type: "notice", title, content: { title, whatsappText: "नमस्ते", formalText: "सूचना" } });

describe("GET /stats/dashboard (real Postgres)", { skip }, () => {
  let t: TestApp;
  let teacher: string; // institute A, main branch
  let typist: string; // institute A, main branch; no notices permission
  let counselor: string; // institute A, second branch; notices and posters only
  let sa: string; // institute A, whole institute
  let other: string; // institute B

  before(async () => {
    t = await startTestApp();
    teacher = await t.token("A-T");
    typist = await t.token("A-TY");
    counselor = await t.token("A-C");
    sa = await t.token("A-SA");
    other = await t.token("B-BA");
  });
  after(async () => {
    await t?.close();
  });

  const stats = async (token: string) => {
    const res = await t.call("GET", "/api/v1/stats/dashboard", token);
    assert.equal(res.statusCode, 200);
    return DashboardStatsSchema.parse(res.json());
  };
  const save = async (token: string, body: object) => {
    const res = await t.call("POST", "/api/v1/documents", token, body);
    assert.equal(res.statusCode, 201);
    return res.json() as { id: string };
  };

  test("needs a signed-in user", async () => {
    assert.equal((await t.call("GET", "/api/v1/stats/dashboard")).statusCode, 401);
  });

  test("counts visible work per type, the caller's own, and lists recent documents", async () => {
    const before = { teacher: await stats(teacher), typist: await stats(typist), counselor: await stats(counselor), sa: await stats(sa), other: await stats(other) };

    const p1 = await save(teacher, ppt("आँकड़े 1"));
    const p2 = await save(teacher, ppt("आँकड़े 2"));
    const n1 = await save(counselor, notice("दूसरी शाखा की सूचना"));

    const teacherNow = await stats(teacher);
    assert.equal(teacherNow.byType.ppt!.total - before.teacher.byType.ppt!.total, 2);
    assert.equal(teacherNow.byType.ppt!.mine - before.teacher.byType.ppt!.mine, 2);
    assert.equal(teacherNow.totals.mine - before.teacher.totals.mine, 2);
    assert.ok(teacherNow.totals.last7Days >= 2);
    assert.equal(teacherNow.recentMine[0]!.id, p2.id, "newest first");
    assert.equal(teacherNow.recentMine[1]!.id, p1.id);
    assert.equal(teacherNow.recentMine[0]!.title, "आँकड़े 2");
    assert.equal("content" in teacherNow.recent[0]!, false, "summaries only");
    // The counselor's notice is in another branch: the teacher doesn't count it.
    assert.equal(teacherNow.byType.notice!.total, before.teacher.byType.notice!.total);
    assert.ok(!teacherNow.recent.some((d) => d.id === n1.id));

    // A typist sees the same branch's PPTs but has no notices type at all.
    const typistNow = await stats(typist);
    assert.equal(typistNow.byType.ppt!.total - before.typist.byType.ppt!.total, 2);
    assert.equal(typistNow.byType.ppt!.mine, 0);
    assert.equal(typistNow.byType.notice, undefined);

    // The counselor can't use PPTs, so they aren't counted or listed for them.
    const counselorNow = await stats(counselor);
    assert.equal(counselorNow.byType.ppt, undefined);
    assert.deepEqual(Object.keys(counselorNow.byType).sort(), ["notice", "poster"]);
    assert.equal(counselorNow.byType.notice!.mine - before.counselor.byType.notice!.mine, 1);
    assert.ok(!counselorNow.recent.some((d) => d.type === "ppt"));

    // The super admin sees the whole institute: both branches.
    const saNow = await stats(sa);
    assert.equal(saNow.byType.ppt!.total - before.sa.byType.ppt!.total, 2);
    assert.equal(saNow.byType.notice!.total - before.sa.byType.notice!.total, 1);
    assert.equal(saNow.totals.mine, before.sa.totals.mine);

    // Another institute sees none of it.
    const otherNow = await stats(other);
    assert.deepEqual(otherNow.totals, before.other.totals);
  });

  test("deleted documents stop counting", async () => {
    const doc = await save(teacher, ppt("हटाने वाला"));
    const withDoc = await stats(teacher);
    assert.equal((await t.call("DELETE", `/api/v1/documents/${doc.id}`, teacher)).statusCode, 204);
    const after = await stats(teacher);
    assert.equal(withDoc.byType.ppt!.total - after.byType.ppt!.total, 1);
    assert.ok(!after.recentMine.some((d) => d.id === doc.id));
  });
});
