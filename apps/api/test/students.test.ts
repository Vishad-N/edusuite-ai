import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { FeeReceiptSchema, StudentSchema, financialYear, istDate, type FeeReceipt, type Student } from "@edusuite/shared";
import { startTestApp, type TestApp } from "./helpers/app";
import { dbTestsSkipReason } from "./helpers/testDb";

const skip = dbTestsSkipReason();
const daysAgo = (n: number) => new Date(Date.parse(`${istDate()}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

describe("students and fee receipts (real Postgres)", { skip }, () => {
  let t: TestApp;
  let sa: string;
  let ba: string;
  let counselor: string;
  let teacher: string;
  let typist: string;
  let other: string;

  before(async () => {
    t = await startTestApp();
    sa = await t.token("A-SA");
    ba = await t.token("A-BA");
    counselor = await t.token("A-C");
    teacher = await t.token("A-T");
    typist = await t.token("A-TY");
    other = await t.token("B-BA");
  });
  after(async () => {
    await t?.close();
  });

  const addStudent = async (token: string, body: object = {}): Promise<Student> => {
    const res = await t.call("POST", "/api/v1/students", token, { fullName: "राहुल वर्मा", course: "MPPSC प्री", totalFee: 10000, ...body });
    assert.equal(res.statusCode, 201, res.body);
    return StudentSchema.parse(res.json());
  };
  const issue = (token: string, body: object, key: string | null = randomUUID()) =>
    t.app.inject({ method: "POST", url: "/api/v1/fee-receipts", headers: { authorization: `Bearer ${token}`, ...(key && { "idempotency-key": key }) }, payload: body });
  const fy = financialYear(istDate());

  test("counselors and admins add students with automatic roll numbers; teachers and typists can't (DN-007)", async () => {
    const s1 = await addStudent(counselor, { phone: "98260 12345", guardianName: "  " });
    const year = istDate().slice(0, 4);
    assert.equal(s1.rollNo, `TSTA-SEC-${year}-0001`);
    assert.equal(s1.phone, "+919826012345");
    assert.equal(s1.guardianName, null);
    assert.deepEqual([s1.totalFee, s1.paid, s1.due], [10000, 0, 10000]);
    assert.equal((await addStudent(counselor)).rollNo, `TSTA-SEC-${year}-0002`);
    assert.equal((await t.call("GET", "/api/v1/students/next-roll-no", counselor)).json().rollNo, `TSTA-SEC-${year}-0003`);
    // A typed roll number is kept (upper-cased); a taken one is refused.
    assert.equal((await addStudent(counselor, { rollNo: "old-17" })).rollNo, "OLD-17");
    const dup = await t.call("POST", "/api/v1/students", sa, { rollNo: "OLD-17", fullName: "x y", course: "abc", totalFee: 1 });
    assert.equal(dup.statusCode, 409);
    assert.equal(dup.json().code, "ALREADY_EXISTS");
    for (const tok of [teacher, typist]) assert.equal((await t.call("POST", "/api/v1/students", tok, { fullName: "x y", course: "abc", totalFee: 1 })).statusCode, 403);
    assert.equal((await t.call("POST", "/api/v1/students", counselor, { fullName: "x y", course: "abc", totalFee: 10.555 })).statusCode, 400, "paise only");
  });

  test("students are seen within the branch (admins of other branches and institutes get 404)", async () => {
    const s = await addStudent(counselor, { fullName: "सीमा यादव" });
    assert.equal((await t.call("GET", `/api/v1/students/${s.id}`, ba)).statusCode, 404, "branch admin of another branch");
    assert.equal((await t.call("GET", `/api/v1/students/${s.id}`, other)).statusCode, 404, "another institute");
    assert.equal((await t.call("GET", `/api/v1/students/${s.id}`, sa)).statusCode, 200, "super admin sees the institute");
    const found = (await t.call("GET", "/api/v1/students?q=सीमा", counselor)).json();
    assert.equal(found.items.length, 1);
  });

  test("a receipt takes a gap-free number, can't exceed the balance and can be dated up to 7 days back", async () => {
    const s = await addStudent(counselor);
    const r1 = await issue(counselor, { studentId: s.id, amount: 4000, mode: "upi" });
    assert.equal(r1.statusCode, 201, r1.body);
    const rec = FeeReceiptSchema.parse(r1.json());
    assert.match(rec.receiptNo, new RegExp(`^TSTA-SEC/${fy}/\\d{6}$`));
    assert.equal(rec.dueAfter, 6000);
    assert.equal(rec.paidOn, istDate());

    const over = await issue(counselor, { studentId: s.id, amount: 6000.5, mode: "cash" });
    assert.equal(over.json().code, "RECEIPT_OVER_BALANCE");
    for (const paidOn of [daysAgo(8), daysAgo(-1)]) assert.equal((await issue(counselor, { studentId: s.id, amount: 1, mode: "cash", paidOn })).json().code, "RECEIPT_DATE_INVALID", paidOn);
    const late = await issue(counselor, { studentId: s.id, amount: 1000, mode: "cash", paidOn: daysAgo(7) });
    assert.equal(late.statusCode, 201);
    const seq = (r: FeeReceipt) => Number(r.receiptNo.split("/").pop());
    assert.equal(seq(FeeReceiptSchema.parse(late.json())), seq(rec) + 1);

    assert.equal((await issue(counselor, { studentId: s.id, amount: 1, mode: "cash" }, null)).statusCode, 400, "Idempotency-Key required");
    assert.equal((await issue(teacher, { studentId: s.id, amount: 1, mode: "cash" })).statusCode, 403);
    assert.equal((await issue(other, { studentId: s.id, amount: 1, mode: "cash" })).statusCode, 404);
    const student = StudentSchema.parse((await t.call("GET", `/api/v1/students/${s.id}`, counselor)).json());
    assert.deepEqual([student.paid, student.due], [5000, 5000]);
  });

  test("the same Idempotency-Key returns the same receipt; a different body with it is refused", async () => {
    const s = await addStudent(counselor);
    const key = randomUUID();
    const a = await issue(counselor, { studentId: s.id, amount: 500, mode: "cash" }, key);
    const b = await issue(counselor, { studentId: s.id, amount: 500, mode: "cash" }, key);
    assert.deepEqual([a.statusCode, b.statusCode], [201, 200]);
    assert.equal(a.json().receiptNo, b.json().receiptNo);
    assert.equal((await issue(counselor, { studentId: s.id, amount: 700, mode: "cash" }, key)).statusCode, 409);
    assert.equal(StudentSchema.parse((await t.call("GET", `/api/v1/students/${s.id}`, counselor)).json()).paid, 500);
  });

  test("parallel receipts never overpay and never share or skip a number", async () => {
    const s = await addStudent(counselor, { totalFee: 5000 });
    const results = await Promise.all(Array.from({ length: 10 }, () => issue(counselor, { studentId: s.id, amount: 1000, mode: "cash" })));
    const ok = results.filter((r) => r.statusCode === 201).map((r) => FeeReceiptSchema.parse(r.json()));
    assert.equal(ok.length, 5);
    assert.ok(results.filter((r) => r.statusCode !== 201).every((r) => r.json().code === "RECEIPT_OVER_BALANCE"));
    const all = (await t.db.feeReceipt.findMany({ where: { branchId: t.fx.otherA.id }, select: { receiptNo: true } })).map((r) => Number(r.receiptNo.split("/").pop())).sort((a, b) => a - b);
    assert.deepEqual(all, Array.from({ length: all.length }, (_, i) => i + 1), "1…n with no gaps or repeats");
  });

  test("only admins change the total fee after enrolment, never below what's paid; changes are audited", async () => {
    const s = await addStudent(counselor);
    await issue(counselor, { studentId: s.id, amount: 3000, mode: "cash" });
    const byCounselor = await t.call("PATCH", `/api/v1/students/${s.id}`, counselor, { totalFee: 12000 });
    assert.equal(byCounselor.json().code, "FEE_CHANGE_NOT_ALLOWED");
    assert.equal((await t.call("PATCH", `/api/v1/students/${s.id}`, counselor, { batch: "सुबह 8 बजे", totalFee: 10000 })).statusCode, 200, "same fee is no change");
    assert.equal((await t.call("PATCH", `/api/v1/students/${s.id}`, sa, { totalFee: 2999 })).json().code, "FEE_BELOW_PAID");
    const raised = StudentSchema.parse((await t.call("PATCH", `/api/v1/students/${s.id}`, sa, { totalFee: 12000 })).json());
    assert.deepEqual([raised.totalFee, raised.due, raised.batch], [12000, 9000, "सुबह 8 बजे"]);
    const audit = await t.db.auditLog.findFirst({ where: { entityId: s.id, action: "student.update", actorId: t.fx.users.superadmin.id }, orderBy: { createdAt: "desc" } });
    assert.equal((audit?.meta as { totalFeeTo?: number }).totalFeeTo, 12000);
  });

  test("only admins cancel, with a reason; the receipt stays and its number is never reused", async () => {
    const s = await addStudent(counselor);
    const rec = FeeReceiptSchema.parse((await issue(counselor, { studentId: s.id, amount: 2000, mode: "card" })).json());
    assert.equal((await t.call("POST", `/api/v1/fee-receipts/${rec.id}/cancel`, counselor, { reason: "गलत राशि" })).statusCode, 403);
    assert.equal((await t.call("POST", `/api/v1/fee-receipts/${rec.id}/cancel`, sa, { reason: "x" })).statusCode, 400, "reason too short");
    assert.equal((await t.call("POST", `/api/v1/fee-receipts/${rec.id}/cancel`, ba, { reason: "गलत राशि" })).statusCode, 404, "branch admin of another branch");
    const cancelled = FeeReceiptSchema.parse((await t.call("POST", `/api/v1/fee-receipts/${rec.id}/cancel`, sa, { reason: "गलत राशि" })).json());
    assert.deepEqual([cancelled.status, cancelled.cancelReason], ["cancelled", "गलत राशि"]);
    assert.equal((await t.call("POST", `/api/v1/fee-receipts/${rec.id}/cancel`, sa, { reason: "फिर से" })).json().code, "RECEIPT_ALREADY_CANCELLED");
    assert.equal(StudentSchema.parse((await t.call("GET", `/api/v1/students/${s.id}`, counselor)).json()).due, 10000, "cancelled receipts don't count");
    const next = FeeReceiptSchema.parse((await issue(counselor, { studentId: s.id, amount: 2000, mode: "cash" })).json());
    assert.notEqual(next.receiptNo, rec.receiptNo);
    const list = (await t.call("GET", `/api/v1/fee-receipts?studentId=${s.id}`, counselor)).json();
    assert.deepEqual(list.items.map((r: FeeReceipt) => r.status), ["issued", "cancelled"]);
    assert.ok(await t.db.auditLog.findFirst({ where: { entityId: rec.id, action: "receipt.cancel" } }));
  });
});
