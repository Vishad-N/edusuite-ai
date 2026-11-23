import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, createApiClient, type TokenVault } from "./client.ts";

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };

function memoryVault(initial: string | null = null): TokenVault & { value: string | null } {
  const v = {
    value: initial,
    get: async () => v.value,
    set: async (t: string) => {
      v.value = t;
    },
    clear: async () => {
      v.value = null;
    },
  };
  return v;
}

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function setup(handler: (call: Call, n: number) => Response | Promise<Response>, vault = memoryVault()) {
  const calls: Call[] = [];
  const ended: ApiError[] = [];
  const client = createApiClient({
    baseUrl: "http://api.test/api/v1",
    vault,
    deviceId: "device-0001",
    language: () => "hi",
    onSessionEnded: (e) => ended.push(e),
    fetch: (async (url: string, init: RequestInit) => {
      const call: Call = {
        url: String(url).replace("http://api.test/api/v1", ""),
        method: String(init.method),
        headers: init.headers as Record<string, string>,
        ...(init.body !== undefined && { body: JSON.parse(String(init.body)) }),
      };
      calls.push(call);
      return handler(call, calls.length);
    }) as typeof fetch,
  });
  return { client, calls, ended, vault };
}

const tokens = (n: number) => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-token-number-${n}`,
  accessTokenExpiresAt: "2026-11-21T10:00:00.000Z",
  refreshTokenExpiresAt: "2026-11-21T18:29:59.999Z",
});

test("login stores the refresh token in the vault and sends the device id", async () => {
  const { client, calls, vault } = setup(() => json(200, { ...tokens(1), user: { id: "u" } }));
  await client.login({ identifier: "DEMO-T", password: "x" });
  assert.equal(vault.value, "refresh-token-number-1");
  assert.deepEqual(calls[0]!.body, { identifier: "DEMO-T", password: "x", deviceId: "device-0001" });
  assert.equal(calls[0]!.headers["accept-language"], "hi");
});

test("requests carry the access token; a 401 triggers one refresh and a retry", async () => {
  const { client, calls, vault } = setup((call) => {
    if (call.url === "/auth/login") return json(200, { ...tokens(1), user: {} });
    if (call.url === "/auth/refresh") return json(200, tokens(2));
    // The first /me fails as if the access token expired; the retry succeeds.
    return call.headers.authorization === "Bearer access-1" ? json(401, { code: "UNAUTHORIZED", message: "m" }) : json(200, { ok: true });
  });
  await client.login({ identifier: "a", password: "b" });
  assert.deepEqual(await client.get("/me"), { ok: true });
  assert.deepEqual(calls.map((c) => c.url), ["/auth/login", "/me", "/auth/refresh", "/me"]);
  assert.equal(calls[3]!.headers.authorization, "Bearer access-2");
  assert.equal(vault.value, "refresh-token-number-2");
});

test("concurrent 401s share a single refresh", async () => {
  let refreshes = 0;
  const { client } = setup(async (call) => {
    if (call.url === "/auth/refresh") {
      refreshes += 1;
      await new Promise((r) => setTimeout(r, 10));
      return json(200, tokens(9));
    }
    return call.headers.authorization === "Bearer access-9" ? json(200, {}) : json(401, { code: "UNAUTHORIZED", message: "m" });
  }, memoryVault("refresh-token-number-0"));
  await Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);
  assert.equal(refreshes, 1);
});

test("a failed refresh clears the vault and reports the session as ended", async () => {
  const { client, ended, vault } = setup((call) =>
    call.url === "/auth/refresh"
      ? json(401, { code: "AUTH_SESSION_EXPIRED", message: "आज का सत्र समाप्त हो गया।" })
      : json(401, { code: "UNAUTHORIZED", message: "m" }),
    memoryVault("refresh-token-number-0"),
  );
  await assert.rejects(client.get("/me"), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal(vault.value, null);
  assert.equal(ended.length, 1);
  assert.equal(ended[0]!.code, "AUTH_SESSION_EXPIRED");
});

test("API errors keep their code and translated message", async () => {
  const { client } = setup((call) =>
    call.url === "/auth/login" ? json(401, { code: "AUTH_INVALID", message: "ID या पासवर्ड गलत है।" }) : json(500, {}),
  );
  await assert.rejects(client.login({ identifier: "x", password: "y" }), (e: unknown) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.code, "AUTH_INVALID");
    assert.equal(e.message, "ID या पासवर्ड गलत है।");
    return true;
  });
});

test("network failures become a NETWORK_ERROR, not an unhandled exception", async () => {
  const { client } = setup(() => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(client.login({ identifier: "x", password: "y" }), (e: unknown) => e instanceof ApiError && e.code === "NETWORK_ERROR");
});

test("logout clears the local session even if the server can't be reached", async () => {
  const { client, vault } = setup(() => {
    throw new TypeError("offline");
  }, memoryVault("refresh-token-number-5"));
  await client.logout();
  assert.equal(vault.value, null);
});

test("events() reads server-sent events across chunk boundaries and sends the token", async () => {
  const chunks = ['data: {"status":"queued"}\n\n: keep-alive\n\nda', 'ta: {"status":"running"}\n', '\ndata: {"status":"succeeded"}\n\n'];
  const { client, calls } = setup((call) => {
    if (call.url === "/auth/refresh") return json(200, { accessToken: "A1", refreshToken: "R2" });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
        controller.close();
      },
    });
    return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
  }, memoryVault("R1"));
  const seen: unknown[] = [];
  await client.events("/ai/jobs/1/events", (d) => seen.push(d));
  assert.deepEqual(seen, [{ status: "queued" }, { status: "running" }, { status: "succeeded" }]);
  const streamCall = calls.find((c) => c.url === "/ai/jobs/1/events")!;
  assert.equal(streamCall.headers.authorization, "Bearer A1");
  assert.equal(streamCall.headers.accept, "text/event-stream");
});

test("post() can send extra headers such as the idempotency key", async () => {
  const { client, calls } = setup((call) => (call.url === "/auth/refresh" ? json(200, { accessToken: "A1", refreshToken: "R2" }) : json(202, { id: "j" })), memoryVault("R1"));
  await client.post("/ai/jobs", { type: "ppt_outline" }, { headers: { "idempotency-key": "key-12345678" } });
  assert.equal(calls.at(-1)!.headers["idempotency-key"], "key-12345678");
});
