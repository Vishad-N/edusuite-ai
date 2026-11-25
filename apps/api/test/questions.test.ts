import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";

const q = (bodyHi: string, subject = "जीव विज्ञान", extra: object = {}) => ({
  subject,
  bodyHi,
  options: { A: "माइटोकॉन्ड्रिया", B: "राइबोसोम", C: "केंद्रक", D: "लाइसोसोम" },
  answer: "A",
  ...extra,
});

describe("question bank (real Postgres, DN-074)", { skip: dbTestsSkipReason() }, () => {
  let t: TestApp;
  let teacher: string;
  let typist: string;
  let counselor: string;
  let ba: string;
  let other: string;
  before(async () => {
    t = await startTestApp();
    teacher = await t.token("A-T");
    typist = await t.token("A-TY");
    counselor = await t.token("A-C");
    ba = await t.token("A-BA");
    other = await t.token("B-BA");
  });
  after(async () => {
    await t?.close();
  });

  const bulk = (token: string, questions: object[]) => t.call("POST", "/api/v1/questions/bulk", token, { questions });

  test("add in bulk; exact repeats (same subject and text) are skipped", async () => {
    const first = await bulk(teacher, [q("कोशिका का पावरहाउस?", "जीव विज्ञान", { topic: "कोशिका" }), q("DNA कहाँ होता है?"), q("DNA  कहाँ\nहोता है?")]);
    assert.equal(first.statusCode, 200);
    assert.deepEqual(first.json(), { added: 2, skipped: 1 }, "the batch's own repeat is skipped");
    const again = await bulk(typist, [q("कोशिका का पावरहाउस?", "जीव  विज्ञान"), q("कोशिका का पावरहाउस?", "रसायन")]);
    assert.deepEqual(again.json(), { added: 1, skipped: 1 }, "same text in another subject is a different question");
    const audit = await t.db.auditLog.count({ where: { action: "question.bulk_add" } });
    assert.equal(audit, 2);
  });

  test("search, filter by subject and mine, page through; one bank per institute", async () => {
    const all = (await t.call("GET", "/api/v1/questions", teacher)).json();
    assert.equal(all.items.length, 3);
    assert.equal(all.items[0].createdBy.displayName, "A-TY", "newest first");
    assert.deepEqual(all.items.find((x: { topic: string | null }) => x.topic === "कोशिका").options.D, "लाइसोसोम");

    assert.equal((await t.call("GET", "/api/v1/questions?q=dna", teacher)).json().items.length, 1, "search is case-insensitive");
    assert.equal((await t.call("GET", `/api/v1/questions?subject=${encodeURIComponent("रसायन")}`, teacher)).json().items.length, 1);
    assert.equal((await t.call("GET", "/api/v1/questions?mine=true", typist)).json().items.length, 1);

    const p1 = (await t.call("GET", "/api/v1/questions?limit=2", teacher)).json();
    const p2 = (await t.call("GET", `/api/v1/questions?limit=2&cursor=${p1.nextCursor}`, teacher)).json();
    assert.equal(p1.items.length + p2.items.length, 3);
    assert.equal(p2.nextCursor, null);
    assert.equal((await t.call("GET", "/api/v1/questions?cursor=garbage", teacher)).statusCode, 400);

    const subjects = (await t.call("GET", "/api/v1/questions/subjects", ba)).json();
    assert.deepEqual(subjects, [
      { subject: "जीव विज्ञान", count: 2 },
      { subject: "रसायन", count: 1 },
    ]);
    assert.equal((await t.call("GET", "/api/v1/questions", other)).json().items.length, 0, "another institute sees none");
  });

  test("who may use and remove", async () => {
    assert.equal((await t.call("GET", "/api/v1/questions", counselor)).statusCode, 403);
    assert.equal((await bulk(counselor, [q("x?")])).statusCode, 403);
    assert.equal((await bulk(teacher, [q("x?", "जीव", { answer: "E" })])).statusCode, 400);

    const items = (await t.call("GET", "/api/v1/questions", teacher)).json().items as Array<{ id: string; createdBy: { displayName: string } }>;
    const byTypist = items.find((x) => x.createdBy.displayName === "A-TY")!;
    const byTeacher = items.find((x) => x.createdBy.displayName === "A-T")!;
    assert.equal((await t.call("DELETE", `/api/v1/questions/${byTypist.id}`, teacher)).statusCode, 403, "not someone else's");
    assert.equal((await t.call("DELETE", `/api/v1/questions/${byTypist.id}`, other)).statusCode, 404, "other institute");
    assert.equal((await t.call("DELETE", `/api/v1/questions/${byTeacher.id}`, teacher)).statusCode, 204, "own");
    assert.equal((await t.call("DELETE", `/api/v1/questions/${byTypist.id}`, ba)).statusCode, 204, "an admin");
    assert.equal((await t.call("GET", "/api/v1/questions", teacher)).json().items.length, 1);
  });
});
