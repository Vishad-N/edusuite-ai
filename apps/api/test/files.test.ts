import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { STORAGE } from "../src/files/storage";
import { startTestApp, type TestApp } from "./helpers/app";
import { FakeStorage, PNG_BYTES } from "./helpers/fakeStorage";
import { dbTestsSkipReason } from "./helpers/testDb";

const skip = dbTestsSkipReason();

describe("files API (real Postgres, in-memory storage)", { skip }, () => {
  let t: TestApp;
  const storage = new FakeStorage();
  let teacher: string;
  let typist: string;
  let other: string;

  before(async () => {
    t = await startTestApp([], [{ provide: STORAGE, useValue: storage }]);
    teacher = await t.token("A-T");
    typist = await t.token("A-TY");
    other = await t.token("B-BA");
  });
  after(async () => {
    await t?.close();
  });

  const presign = (token: string, body: object) => t.call("POST", "/api/v1/files/presign", token, body);
  const keyOf = async (fileId: string) => (await t.db.file.findUniqueOrThrow({ where: { id: fileId } })).bucketKey;

  test("upload flow: presign, upload, complete, then a download link", async () => {
    const res = await presign(teacher, { name: "..\\..\\प्रश्न 1.png", mime: "image/png", bytes: 64 });
    assert.equal(res.statusCode, 200);
    const { fileId, uploadUrl, method, headers } = res.json();
    assert.equal(method, "PUT");
    assert.deepEqual(headers, { "content-type": "image/png" });
    assert.match(uploadUrl, /^http:\/\/fake-storage\.test\/put\//);

    const key = await keyOf(fileId);
    assert.match(key, new RegExp(`^${t.fx.instA.id}/[0-9a-f-]{36}\\.png$`), "random key under the institute");
    assert.doesNotMatch(key, /प्रश्न/, "key never comes from the file name");

    // Not usable before the upload is verified.
    assert.equal((await t.call("GET", `/api/v1/files/${fileId}/url`, teacher)).json().code, "FILE_NOT_UPLOADED");
    assert.equal((await t.call("POST", `/api/v1/files/${fileId}/complete`, teacher)).json().code, "FILE_NOT_UPLOADED");

    storage.upload(key, PNG_BYTES(64));
    const done = await t.call("POST", `/api/v1/files/${fileId}/complete`, teacher);
    assert.equal(done.statusCode, 200);
    assert.equal(done.json().name, "प्रश्न 1.png", "name is cleaned, folders dropped");
    assert.ok(done.json().uploadedAt);

    const link = await t.call("GET", `/api/v1/files/${fileId}/url`, teacher);
    assert.match(link.json().url, /^http:\/\/fake-storage\.test\/get\//);
    const redirect = await t.call("GET", `/api/v1/files/${fileId}`, teacher);
    assert.equal(redirect.statusCode, 302);
    assert.match(String(redirect.headers.location), /fake-storage\.test\/get/);
  });

  test("only allowed types and sizes can be presigned", async () => {
    for (const body of [
      { name: "x.exe", mime: "application/x-msdownload", bytes: 10 },
      { name: "x.svg", mime: "image/svg+xml", bytes: 10 },
      { name: "big.png", mime: "image/png", bytes: 11 * 1024 * 1024 },
      { name: "empty.png", mime: "image/png", bytes: 0 },
    ]) {
      const res = await presign(teacher, body);
      assert.equal(res.statusCode, 400, body.name);
      assert.equal(res.json().code, "VALIDATION_FAILED");
    }
  });

  test("a file that isn't what it claims is deleted, with its record", async () => {
    const { fileId } = (await presign(teacher, { name: "fake.png", mime: "image/png", bytes: 20 })).json();
    const key = await keyOf(fileId);
    // Exactly the declared 20 bytes, so the size check passes and the signature check must catch it.
    storage.upload(key, new TextEncoder().encode("<html><script>x</scr"));
    const res = await t.call("POST", `/api/v1/files/${fileId}/complete`, teacher);
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().code, "FILE_TYPE_MISMATCH");
    assert.equal(storage.objects.has(key), false);
    assert.equal(await t.db.file.count({ where: { id: fileId } }), 0);
  });

  test("an upload of the wrong size is rejected", async () => {
    const { fileId } = (await presign(teacher, { name: "q.png", mime: "image/png", bytes: 100 })).json();
    storage.upload(await keyOf(fileId), PNG_BYTES(40));
    const res = await t.call("POST", `/api/v1/files/${fileId}/complete`, teacher);
    assert.equal(res.json().code, "FILE_SIZE_MISMATCH");
  });

  test("only the uploader may complete; other institutes can't see the file", async () => {
    const { fileId } = (await presign(teacher, { name: "q.png", mime: "image/png", bytes: 64 })).json();
    storage.upload(await keyOf(fileId), PNG_BYTES(64));
    assert.equal((await t.call("POST", `/api/v1/files/${fileId}/complete`, typist)).statusCode, 404);
    assert.equal((await t.call("POST", `/api/v1/files/${fileId}/complete`, teacher)).statusCode, 200);
    // Colleagues in the same institute may view it; another institute gets 404.
    assert.equal((await t.call("GET", `/api/v1/files/${fileId}/url`, typist)).statusCode, 200);
    assert.equal((await t.call("GET", `/api/v1/files/${fileId}/url`, other)).statusCode, 404);
    assert.equal((await t.call("GET", `/api/v1/files/${fileId}`, other)).statusCode, 404);
  });

  test("files need a signed-in user", async () => {
    assert.equal((await presign("", { name: "q.png", mime: "image/png", bytes: 64 })).statusCode, 401);
  });
});
