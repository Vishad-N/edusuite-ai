// Load test (plan: 150 staff at once, p95 < 300 ms; Phase 6, DN-063).
// Usage: npm run load -w @edusuite/api   (local stack only; seeded demo users)
//   LOAD_CONNECTIONS (150), LOAD_SECONDS (30), LOAD_BASE_URL (http://localhost:3000)
// Read-heavy mix like a working day, plus document saves. Refuses non-local targets:
// a production load test is planned and announced, never run by accident.
import autocannon from "autocannon";
import { readFileSync } from "node:fs";

const base = process.env.LOAD_BASE_URL ?? "http://localhost:3000";
const host = new URL(base).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`Refusing to load-test ${base}: local stack only.`);
  process.exit(2);
}
const connections = Number(process.env.LOAD_CONNECTIONS ?? 150);
const duration = Number(process.env.LOAD_SECONDS ?? 30);

// Demo passwords live only in the seed file (AGENT_README §8); read them from there.
const seed = readFileSync(new URL("../src/scripts/seed.ts", import.meta.url), "utf8");
const password = (code) => new RegExp(`code: "${code}"[^}]*password: "([^"]+)"`).exec(seed)?.[1];
const codes = ["DEMO-SA", "DEMO-BA", "DEMO-T", "DEMO-C"];

// Login is rate-limited per IP (DN-033), so log in once per user and share the tokens.
const tokens = {};
for (const code of codes) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: code, password: password(code), deviceId: `load-test-${code}` }),
  });
  if (!res.ok) throw new Error(`login ${code} failed: ${res.status}`);
  tokens[code] = (await res.json()).accessToken;
}

const staff = [tokens["DEMO-SA"], tokens["DEMO-BA"], tokens["DEMO-T"]];
const fees = [tokens["DEMO-SA"], tokens["DEMO-BA"], tokens["DEMO-C"]];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const auth = (token) => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });

// Weighted mix; each entry is one request shape.
const mix = [
  ...Array(3).fill(() => ({ method: "GET", path: "/api/v1/me", headers: auth(pick([...staff, ...fees])) })),
  ...Array(3).fill(() => ({ method: "GET", path: "/api/v1/stats/dashboard", headers: auth(pick(staff)) })),
  ...Array(3).fill(() => ({ method: "GET", path: "/api/v1/documents?type=ppt&limit=25", headers: auth(pick(staff)) })),
  ...Array(2).fill(() => ({ method: "GET", path: "/api/v1/students?limit=30&status=active", headers: auth(pick(fees)) })),
  ...Array(2).fill(() => ({ method: "GET", path: "/api/v1/credits", headers: auth(pick(staff)) })),
  () => ({
    method: "POST",
    path: "/api/v1/documents",
    headers: auth(pick(staff)),
    body: JSON.stringify({
      type: "notice",
      title: `लोड टेस्ट ${Date.now()}`,
      content: { title: "लोड टेस्ट", whatsappText: "परीक्षण संदेश", formalText: "परीक्षण परिपत्र" },
    }),
  }),
];

const result = await autocannon({
  url: base,
  connections,
  duration,
  requests: [{ setupRequest: (req) => ({ ...req, ...pick(mix)() }) }],
});

const non2xx = result.non2xx;
const summary = {
  connections,
  seconds: duration,
  requests: result.requests.total,
  perSecond: Math.round(result.requests.average),
  latencyMs: { p50: result.latency.p50, p90: result.latency.p90, p97_5: result.latency.p97_5, p99: result.latency.p99, max: result.latency.max },
  non2xx,
  errors: result.errors,
  timeouts: result.timeouts,
};
console.log(JSON.stringify(summary, null, 2));
// Plan target: p95 under 300 ms (autocannon reports p90 and p97.5; both must be read).
const ok = result.latency.p97_5 < 300 && non2xx === 0 && result.errors === 0;
console.log(ok ? "PASS: p97.5 < 300 ms with no errors" : "FAIL: see numbers above");
process.exit(ok ? 0 : 1);
