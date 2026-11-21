import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadFile } from "./documents.ts";
import type { ApiClient } from "./client.ts";

test("uploadFile presigns, PUTs the bytes with the signed headers, then completes", async () => {
  const calls: string[] = [];
  const client = {
    post: async (path: string, body?: unknown) => {
      calls.push(`api ${path} ${JSON.stringify(body ?? null)}`);
      if (path === "/files/presign") {
        return { fileId: "f-1", uploadUrl: "http://storage.test/put", method: "PUT", headers: { "content-type": "image/png" }, expiresAt: "x" };
      }
      return { id: "f-1", name: "q.png", mime: "image/png", bytes: 3, uploadedAt: "now", createdAt: "now" };
    },
  } as unknown as ApiClient;
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push(`storage ${init.method} ${url} ${(init.headers as Record<string, string>)["content-type"]}`);
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  const file = new File([new Uint8Array([1, 2, 3])], "q.png", { type: "image/png" });
  const info = await uploadFile(client, file, fakeFetch);
  assert.equal(info.id, "f-1");
  assert.deepEqual(calls, [
    'api /files/presign {"name":"q.png","mime":"image/png","bytes":3}',
    "storage PUT http://storage.test/put image/png",
    "api /files/f-1/complete null",
  ]);
});

test("a failed PUT stops before complete", async () => {
  let completed = false;
  const client = {
    post: async (path: string) => {
      if (path.endsWith("/complete")) completed = true;
      return { fileId: "f-2", uploadUrl: "http://storage.test/put", method: "PUT", headers: {}, expiresAt: "x" };
    },
  } as unknown as ApiClient;
  const failing = (async () => new Response(null, { status: 403 })) as typeof fetch;
  await assert.rejects(uploadFile(client, new File(["x"], "a.png", { type: "image/png" }), failing), /upload failed \(403\)/);
  assert.equal(completed, false);
});
