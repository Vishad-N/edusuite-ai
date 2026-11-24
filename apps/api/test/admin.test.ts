import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { AuditLogEntrySchema, UsageReportSchema, istDate, type AuditLogEntry } from "@edusuite/shared";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";
import { AI_QUEUE } from "../src/ai/queue";

const skip = dbTestsSkipReason();

describe("admin: audit log and AI usage (real Postgres)", { skip }, () => {
  let t: TestApp;
  let sa: string;
  let ba: string;
  let teacher: string;
  let counselor: string;
  let other: string;
  const fakeQueue = { add: async () => undefined, close: async () => undefined };

  before(async () => {
    t = await startTestApp([], [{ provide: AI_QUEUE, useValue: fakeQueue }]);
    sa = await t.token("A-SA");
    ba = await t.token("A-BA");
    teacher = await t.token("A-T");
    counselor = await t.token("A-C");
    other = await t.token("B-BA");
    await t.call("POST", `/api/v1/platform/institutes/${t.fx.instA.id}/credits`, await t.token("P-PA"), { delta: 20, note: "test credits" });
  });
  after(async () => {
    await t?.close();
  });

  const startJob = async (token: string) =>
    (
      await t.app.inject({
        method: "POST",
        url: "/api/v1/ai/jobs",
        headers: { authorization: `Bearer ${token}`, "idempotency-key": randomUUID() },
        payload: { type: "ppt_outline", input: { topic: "प्रकाश संश्लेषण" } },
      })
    ).json();
  const logs = async (token: string, query = "") => (await t.call("GET", `/api/v1/audit-logs${query}`, token)).json().items.map((e: unknown) => AuditLogEntrySchema.parse(e)) as AuditLogEntry[];

  test("only admins read the audit log; a branch admin sees their own branch's staff", async () => {
    // The counselor works at the second branch; make sure they have an entry.
    await t.call("POST", "/api/v1/students", counselor, { fullName: "ऑडिट छात्र", course: "SSC", totalFee: 100 });
    for (const tok of [teacher, counselor]) assert.equal((await t.call("GET", "/api/v1/audit-logs", tok)).statusCode, 403);
    assert.equal((await t.call("GET", "/api/v1/audit-logs")).statusCode, 401);

    const all = await logs(sa, "?limit=100");
    assert.ok(all.some((e) => e.action === "student.create" && e.actor?.employeeCode === "A-C"), "super admin sees the other branch");
    assert.ok(all.every((e) => !JSON.stringify(e.meta).includes("password")), "no secrets in meta");
    const branch = await logs(ba, "?limit=100");
    assert.ok(branch.length > 0);
    assert.ok(branch.every((e) => e.actor?.employeeCode !== "A-C"), "branch admin doesn't see the second branch");
    assert.ok((await logs(other, "?limit=100")).every((e) => !["A-SA", "A-BA", "A-T", "A-C"].includes(e.actor?.employeeCode ?? "")), "other institute sees none of ours");
  });

  test("filters by action group and date, newest first, with paging", async () => {
    const auth = await logs(sa, "?group=auth&limit=100");
    assert.ok(auth.length > 0 && auth.every((e) => e.action.startsWith("auth.")));
    const page1 = (await t.call("GET", "/api/v1/audit-logs?limit=2", sa)).json();
    assert.equal(page1.items.length, 2);
    assert.ok(page1.items[0].createdAt >= page1.items[1].createdAt);
    const page2 = (await t.call("GET", `/api/v1/audit-logs?limit=2&cursor=${page1.nextCursor}`, sa)).json();
    assert.ok(!page2.items.some((e: AuditLogEntry) => page1.items.some((p: AuditLogEntry) => p.id === e.id)));
    assert.equal((await logs(sa, "?from=2000-01-01&to=2000-01-31")).length, 0);
    assert.ok((await logs(sa, `?from=${istDate()}&to=${istDate()}`)).length > 0);
    assert.equal((await t.call("GET", "/api/v1/audit-logs?cursor=nope", sa)).statusCode, 400);
  });

  test("monthly usage counts jobs by outcome and keeps only credits not refunded", async () => {
    const kept = await startJob(teacher);
    const cancelled = await startJob(teacher);
    await t.call("POST", `/api/v1/ai/jobs/${cancelled.id}/cancel`, teacher);
    const report = UsageReportSchema.parse((await t.call("GET", "/api/v1/usage", sa)).json());
    assert.equal(report.month, istDate().slice(0, 7));
    assert.equal(report.scope, "institute");
    const row = report.rows.find((r) => r.jobType === "ppt_outline")!;
    assert.ok(row.jobs >= 2 && row.cancelled >= 1);
    assert.ok(row.credits >= 1, "the queued job's credit is kept; the cancelled one's isn't");
    assert.equal(report.totals.credits, report.rows.reduce((s, r) => s + r.credits, 0));
    assert.ok(kept.id);
    assert.equal(UsageReportSchema.parse((await t.call("GET", "/api/v1/usage", ba)).json()).scope, "branch");
    assert.equal(UsageReportSchema.parse((await t.call("GET", "/api/v1/usage?month=2000-01", sa)).json()).totals.jobs, 0);
    assert.equal((await t.call("GET", "/api/v1/usage?month=2026-13", sa)).statusCode, 400);
    assert.equal((await t.call("GET", "/api/v1/usage", teacher)).statusCode, 403);
    assert.equal(UsageReportSchema.parse((await t.call("GET", "/api/v1/usage", other)).json()).totals.jobs, 0, "other institute");
  });
});
