import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";

const skip = dbTestsSkipReason();

const ppt = (title = "प्रकाश संश्लेषण") => ({
  type: "ppt",
  title,
  content: { title, theme: "navy", slides: [{ title: "परिचय", points: ["एक", "दो"] }] },
});
const notice = { type: "notice", title: "फीस सूचना", content: { title: "फीस सूचना", whatsappText: "नमस्ते", formalText: "सूचना" } };

describe("documents API (real Postgres)", { skip }, () => {
  let t: TestApp;
  let teacher: string;
  let typist: string;
  let counselor: string;
  let ba: string;
  let sa: string;
  let other: string;

  before(async () => {
    t = await startTestApp();
    teacher = await t.token("A-T");
    typist = await t.token("A-TY");
    counselor = await t.token("A-C");
    ba = await t.token("A-BA");
    sa = await t.token("A-SA");
    other = await t.token("B-BA");
  });
  after(async () => {
    await t?.close();
  });

  const create = (token: string, body: object) => t.call("POST", "/api/v1/documents", token, body);

  test("a teacher saves, reopens and lists a PPT", async () => {
    const created = await create(teacher, ppt());
    assert.equal(created.statusCode, 201);
    const doc = created.json();
    assert.equal(doc.type, "ppt");
    assert.equal(doc.schemaVersion, 1);
    assert.equal(doc.createdBy.displayName, "A-T");

    const reopened = (await t.call("GET", `/api/v1/documents/${doc.id}`, teacher)).json();
    assert.deepEqual(reopened.content, ppt().content);

    const list = (await t.call("GET", "/api/v1/documents?type=ppt", teacher)).json();
    assert.equal(list.items[0].id, doc.id);
    assert.equal("content" in list.items[0], false, "history lists summaries only");
  });

  test("each type needs its screen's permission", async () => {
    assert.equal((await create(counselor, ppt())).statusCode, 403, "counselor can't make AI content");
    assert.equal((await create(counselor, notice)).statusCode, 201, "counselor may write notices");
    assert.equal((await create(typist, notice)).statusCode, 403, "typist may not write notices");
    assert.equal((await t.call("GET", "/api/v1/documents?type=ppt", counselor)).statusCode, 403);
  });

  test("content is validated against its type's schema", async () => {
    const bad = await create(teacher, { type: "ppt", title: "x", content: { slides: "not a list" } });
    assert.equal(bad.statusCode, 400);
    assert.equal(bad.json().code, "VALIDATION_FAILED");
    assert.ok(bad.json().details.fields.some((f: { path: string }) => f.path.startsWith("content.")));
    const badType = await create(teacher, { type: "receipt", title: "x", content: {} });
    assert.equal(badType.statusCode, 400);
  });

  test("oversized content is refused with 413", async () => {
    const huge = "अ".repeat(4000);
    const slides = Array.from({ length: 200 }, () => ({ title: "x", points: Array.from({ length: 20 }, () => huge.slice(0, 1000)) }));
    const res = await create(teacher, { type: "ppt", title: "बड़ा", content: { title: "बड़ा", slides } });
    assert.equal(res.statusCode, 413);
    assert.equal(res.json().code, "DOCUMENT_TOO_LARGE");
  });

  test("other branches and institutes can't see a document", async () => {
    const doc = (await create(teacher, ppt("मुख्य शाखा का"))).json();
    // The counselor works at A's second branch but has no PPT permission anyway; use B's admin for institute isolation.
    assert.equal((await t.call("GET", `/api/v1/documents/${doc.id}`, other)).statusCode, 404);
    const otherList = (await t.call("GET", "/api/v1/documents?type=ppt", other)).json();
    assert.equal(otherList.items.length, 0);
    // Super admin sees the whole institute, branch admin sees their branch.
    assert.equal((await t.call("GET", `/api/v1/documents/${doc.id}`, sa)).statusCode, 200);
    assert.equal((await t.call("GET", `/api/v1/documents/${doc.id}`, ba)).statusCode, 200);
  });

  test("a document saved at another branch of the same institute stays hidden from branch staff", async () => {
    // A teacher logged in at A's second branch saves there.
    const login = await t.call("POST", "/api/v1/auth/login", undefined, {
      identifier: "A-T",
      password: "Test-Pass-123!",
      deviceId: "test-device-0002",
      branchId: t.fx.otherA.id,
    });
    const secondBranchTeacher = login.json().accessToken;
    const doc = (await create(secondBranchTeacher, ppt("दूसरी शाखा का"))).json();
    assert.equal(doc.branchId, t.fx.otherA.id);
    assert.equal((await t.call("GET", `/api/v1/documents/${doc.id}`, ba)).statusCode, 404, "branch admin of MAIN");
    assert.equal((await t.call("GET", `/api/v1/documents/${doc.id}`, sa)).statusCode, 200, "super admin");
  });

  test("only the creator or an admin may edit or delete", async () => {
    const doc = (await create(teacher, ppt("शिक्षक का"))).json();
    const edit = { title: "बदला", expectedUpdatedAt: doc.updatedAt };
    assert.equal((await t.call("PATCH", `/api/v1/documents/${doc.id}`, typist, edit)).statusCode, 403);
    assert.equal((await t.call("DELETE", `/api/v1/documents/${doc.id}`, typist)).statusCode, 403);
    const byAdmin = await t.call("PATCH", `/api/v1/documents/${doc.id}`, ba, edit);
    assert.equal(byAdmin.statusCode, 200);
    assert.equal(byAdmin.json().title, "बदला");
  });

  test("a stale save is refused instead of overwriting someone else's work", async () => {
    const doc = (await create(teacher, ppt("साझा"))).json();
    const first = await t.call("PATCH", `/api/v1/documents/${doc.id}`, teacher, {
      content: { ...ppt().content, title: "पहला" },
      expectedUpdatedAt: doc.updatedAt,
    });
    assert.equal(first.statusCode, 200);
    const stale = await t.call("PATCH", `/api/v1/documents/${doc.id}`, ba, {
      title: "दूसरा",
      expectedUpdatedAt: doc.updatedAt,
    });
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.json().code, "DOCUMENT_CHANGED");
    assert.equal(stale.json().details.updatedAt, first.json().updatedAt);
  });

  test("delete is soft, audited and hides the document", async () => {
    const doc = (await create(teacher, ppt("हटाने वाला"))).json();
    assert.equal((await t.call("DELETE", `/api/v1/documents/${doc.id}`, teacher)).statusCode, 204);
    assert.equal((await t.call("GET", `/api/v1/documents/${doc.id}`, teacher)).statusCode, 404);
    const row = await t.db.document.findUniqueOrThrow({ where: { id: doc.id } });
    assert.ok(row.deletedAt, "row is kept, only marked deleted");
    assert.equal(await t.db.auditLog.count({ where: { action: "document.delete", entityId: doc.id } }), 1);
  });

  test("history pages through every document once, newest first, and can filter", async () => {
    for (let i = 0; i < 5; i++) await create(teacher, ppt(`श्रृंखला ${i}`));
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const url: string = `/api/v1/documents?type=ppt&limit=2&q=${encodeURIComponent("श्रृंखला")}${cursor ? `&cursor=${cursor}` : ""}`;
      const page = (await t.call("GET", url, teacher)).json();
      seen.push(...page.items.map((d: { title: string }) => d.title));
      cursor = page.nextCursor;
    } while (cursor);
    assert.deepEqual(seen, ["श्रृंखला 4", "श्रृंखला 3", "श्रृंखला 2", "श्रृंखला 1", "श्रृंखला 0"]);

    const mine = (await t.call("GET", "/api/v1/documents?type=ppt&mine=true&limit=100", ba)).json();
    assert.equal(mine.items.length, 0, "the branch admin created none");
  });
});
