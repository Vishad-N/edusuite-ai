import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Plus, Printer, Receipt, Search, User } from "lucide-react";
import {
  MAX_RECEIPT_BACKDATE_DAYS,
  PAYMENT_MODES,
  PAYMENT_MODE_LABELS,
  can,
  formatRupees,
  istDate,
  type FeeReceipt,
  type PaymentMode,
  type Student,
} from "@edusuite/shared";
import { ApiError } from "../api/client.ts";
import { fileUrl, uploadFile } from "../api/documents.ts";
import { useSession, useSignedInUser } from "../api/session.tsx";
import { useCancelReceipt, useIssueReceipt, useNextRollNo, useReceipts, useSaveStudent, useStudents } from "../api/students.ts";
import { academicSession } from "../utils/academicSession.ts";
import { instituteLogo } from "../utils/branding.ts";
import { Button, Card, CardBody, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Table, TBody, TD, TH, THead, TR, Tabs, Textarea, useToast } from "./ui/index.ts";
import { tx, uiLocale } from "../i18n/index.ts";

type Institute = { name: string; city?: string; phone?: string; logo?: string };
type Props = { activeInstitute: Institute };

const minDate = () => new Date(Date.parse(`${istDate()}T00:00:00Z`) - MAX_RECEIPT_BACKDATE_DAYS * 86_400_000).toISOString().slice(0, 10);
const dateHi = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(uiLocale(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const errText = (err: unknown) => (err instanceof ApiError ? err.message : tx("काम पूरा नहीं हुआ। फिर से कोशिश करें।"));

/**
 * Students, fee receipts and ID cards (plan Phase 5, DN-061). Receipts come from the
 * server with a number that never repeats; they're printed, never edited, and only
 * admins cancel them with a reason.
 */
export default function IdAndFeeReceipt({ activeInstitute }: Props) {
  const user = useSignedInUser();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"active" | "left" | "">("active");
  // The list is the source of truth, so totals refresh after a receipt or an edit.
  const [picked, setSelected] = useState<Student | null>(null);
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const list = useStudents(q, status);
  const students = list.data?.pages.flatMap((p) => p.items) ?? [];
  const selected = picked ? (students.find((s) => s.id === picked.id) ?? picked) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        className="no-print"
        icon={<CreditCard className="size-6" />}
        title={tx("छात्र, फ़ीस रसीद और ID कार्ड")}
        badge={tx("प्रशासन")}
        description={tx("छात्र जोड़ें, फ़ीस की रसीद काटें (हर रसीद का नंबर अपने-आप और कभी दोहराया नहीं जाता) और ID कार्ड प्रिंट करें।")}
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
            {tx("नया छात्र")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4 no-print">
          <Card>
            <CardBody className="space-y-3">
              <Field label={tx("खोजें")} hint={tx("नाम, रोल नंबर, फ़ोन या अभिभावक")}>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("खोजें…")} />
              </Field>
              <Field label={tx("स्थिति")}>
                <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="active">{tx("पढ़ रहे छात्र")}</option>
                  <option value="left">{tx("छोड़ चुके छात्र")}</option>
                  <option value="">{tx("सभी")}</option>
                </Select>
              </Field>
            </CardBody>
          </Card>
          {list.isPending ? (
            <Skeleton />
          ) : list.isError ? (
            <ErrorState title={tx("छात्र लोड नहीं हुए")} message={errText(list.error)} onRetry={() => void list.refetch()} />
          ) : students.length === 0 ? (
            <EmptyState icon={<Search className="size-6" />} title={tx("कोई छात्र नहीं मिला")} description={tx("“नया छात्र” से जोड़ें।")} />
          ) : (
            <ul className="space-y-2" aria-label={tx("छात्र सूची")}>
              {students.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={selected?.id === s.id}
                    onClick={() => {
                      setSelected(s);
                      setEditing(null);
                    }}
                    className={`w-full rounded-card border p-3 text-left cursor-pointer ${selected?.id === s.id ? "border-ink bg-accent-subtle" : "border-line bg-surface hover:bg-page"}`}
                  >
                    <span className="block text-label font-semibold">{s.fullName}</span>
                    <span className="block text-caption text-muted">
                      {s.rollNo} · {s.course}
                    </span>
                    <span className={`block text-caption font-semibold ${s.due > 0 ? "text-danger" : "text-success"}`}>
                      {s.due > 0 ? tx("बकाया {0}", [formatRupees(s.due)]) : tx("पूरी फ़ीस जमा")}
                    </span>
                  </button>
                </li>
              ))}
              {list.hasNextPage && (
                <li>
                  <Button className="w-full" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                    {tx("और दिखाएँ")}
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="lg:col-span-8">
          {editing ? (
            <StudentForm
              student={editing === "new" ? null : editing}
              canChangeFee={editing === "new" || can(user.role, "receipts.cancel")}
              onDone={(s) => {
                setEditing(null);
                if (s) setSelected(s);
              }}
            />
          ) : selected ? (
            <StudentPanel key={selected.id} student={selected} institute={activeInstitute} canCancel={can(user.role, "receipts.cancel")} onEdit={() => setEditing(selected)} />
          ) : (
            <EmptyState icon={<User className="size-6" />} title={tx("कोई छात्र चुनें")} description={tx("बाईं सूची से छात्र चुनें, या नया छात्र जोड़ें।")} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- add / edit ----------

function StudentForm({ student, canChangeFee, onDone }: { student: Student | null; canChangeFee: boolean; onDone: (s: Student | null) => void }) {
  const { client } = useSession();
  const toast = useToast();
  const save = useSaveStudent();
  const next = useNextRollNo(student === null);
  const [form, setForm] = useState({
    rollNo: student?.rollNo ?? "",
    fullName: student?.fullName ?? "",
    guardianName: student?.guardianName ?? "",
    phone: student?.phone?.replace(/^\+91/, "") ?? "",
    course: student?.course ?? "",
    batch: student?.batch ?? "",
    totalFee: student ? String(student.totalFee) : "",
    status: student?.status ?? "active",
  });
  const [photoId, setPhotoId] = useState<string | null>(student?.photoFileId ?? null);
  const [photoState, setPhotoState] = useState<"idle" | "uploading" | "error">("idle");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fee = Number(form.totalFee);
  const feeOk = form.totalFee.trim() !== "" && Number.isFinite(fee) && fee >= 0 && Math.round(fee * 100) === fee * 100;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) return setPhotoState("error");
    setPhotoState("uploading");
    try {
      setPhotoId((await uploadFile(client, file)).id);
      setPhotoState("idle");
    } catch {
      setPhotoState("error");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!feeOk) return;
    const common = {
      fullName: form.fullName,
      guardianName: form.guardianName,
      phone: form.phone.trim() ? form.phone : null,
      course: form.course,
      batch: form.batch,
      photoFileId: photoId,
    };
    try {
      const saved = student
        ? await save.mutateAsync({
            id: student.id,
            body: { ...common, rollNo: form.rollNo, status: form.status as Student["status"], ...(canChangeFee && { totalFee: fee }) },
          })
        : await save.mutateAsync({ id: null, body: { ...common, ...(form.rollNo.trim() && { rollNo: form.rollNo }), totalFee: fee } });
      toast.show({ tone: "success", title: student ? tx("छात्र का विवरण सेव हो गया") : tx("छात्र जुड़ गया: {0}", [saved.rollNo]) });
      onDone(saved);
    } catch (err) {
      toast.show({ tone: "error", title: tx("सेव नहीं हुआ"), description: errText(err) });
    }
  };

  return (
    <Card>
      <CardBody>
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <h2 className="text-title font-semibold">{student ? tx("छात्र का विवरण बदलें") : tx("नया छात्र जोड़ें")}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={tx("रोल नंबर")} hint={student ? tx("हर संस्थान में अलग होना चाहिए") : tx("खाली छोड़ें तो अपने-आप: {0}", [next.data?.rollNo ?? "…"])}>
              <Input value={form.rollNo} onChange={set("rollNo")} maxLength={40} placeholder={next.data?.rollNo ?? ""} />
            </Field>
            <Field label={tx("छात्र का पूरा नाम")} required>
              <Input value={form.fullName} onChange={set("fullName")} maxLength={120} required minLength={2} />
            </Field>
            <Field label={tx("अभिभावक का नाम")}>
              <Input value={form.guardianName} onChange={set("guardianName")} maxLength={120} />
            </Field>
            <Field label={tx("मोबाइल नंबर")}>
              <Input value={form.phone} onChange={set("phone")} inputMode="tel" maxLength={14} />
            </Field>
            <Field label={tx("कोर्स")} required>
              <Input value={form.course} onChange={set("course")} maxLength={160} required minLength={2} placeholder={tx("उदा. MPPSC प्री + मेन्स")} />
            </Field>
            <Field label={tx("बैच / समय")}>
              <Input value={form.batch} onChange={set("batch")} maxLength={120} placeholder={tx("उदा. सुबह 8–12")} />
            </Field>
            <Field
              label={tx("कुल फ़ीस (₹)")}
              required
              hint={canChangeFee ? (student ? tx("जमा हो चुके {0} से कम नहीं", [formatRupees(student.paid)]) : undefined) : tx("जुड़ने के बाद केवल एडमिन बदल सकते हैं")}
              error={form.totalFee && !feeOk ? tx("सही राशि लिखें (पैसे तक)") : undefined}
            >
              <Input type="number" min={0} step="0.01" value={form.totalFee} onChange={set("totalFee")} disabled={!canChangeFee} required />
            </Field>
            {student && (
              <Field label={tx("स्थिति")}>
                <Select value={form.status} onChange={set("status")}>
                  <option value="active">{tx("पढ़ रहा है")}</option>
                  <option value="left">{tx("छोड़ चुका")}</option>
                </Select>
              </Field>
            )}
            <Field label={tx("फ़ोटो (ID कार्ड के लिए)")} hint={photoId ? tx("फ़ोटो लगी है") : tx("PNG, JPG या WebP")} error={photoState === "error" ? tx("फ़ोटो अपलोड नहीं हुई; 10 MB तक की PNG/JPG/WebP चुनें") : undefined}>
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void pickPhoto(e.target.files?.[0])} disabled={photoState === "uploading"} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => onDone(null)}>{tx("रद्द करें")}</Button>
            <Button type="submit" variant="primary" loading={save.isPending} disabled={!feeOk || photoState === "uploading"}>
              {student ? tx("सेव करें") : tx("छात्र जोड़ें")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ---------- one student: receipts and ID card ----------

function StudentPanel({ student, institute, canCancel, onEdit }: { student: Student; institute: Institute; canCancel: boolean; onEdit: () => void }) {
  const [tab, setTab] = useState("issue");
  const [printing, setPrinting] = useState<FeeReceipt | null>(null);
  return (
    <div className="space-y-4">
      <Card className="no-print">
        <CardBody className="flex flex-wrap items-center gap-4">
          <div className="me-auto">
            <h2 className="text-title font-semibold">{student.fullName}</h2>
            <p className="text-caption text-muted">
              {student.rollNo} · {student.course}
              {student.batch ? ` · ${student.batch}` : ""}
              {student.status === "left" ? tx(" · छोड़ चुका") : ""}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-caption text-muted">{tx("कुल फ़ीस")}</dt>
              <dd className="text-label font-semibold">{formatRupees(student.totalFee)}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted">{tx("जमा")}</dt>
              <dd className="text-label font-semibold text-success">{formatRupees(student.paid)}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted">{tx("बकाया")}</dt>
              <dd className={`text-label font-semibold ${student.due > 0 ? "text-danger" : "text-success"}`}>{formatRupees(student.due)}</dd>
            </div>
          </dl>
          <Button onClick={onEdit}>{tx("विवरण बदलें")}</Button>
        </CardBody>
      </Card>
      <div className="no-print">
        <Tabs
          label={tx("छात्र के काम")}
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "issue", label: tx("रसीद काटें") },
            { id: "history", label: tx("रसीदें") },
            { id: "id", label: tx("ID कार्ड") },
          ]}
        >
          {tab === "issue" && <IssueReceipt student={student} onIssued={setPrinting} />}
          {tab === "history" && <ReceiptHistory student={student} canCancel={canCancel} onPrint={setPrinting} />}
          {tab === "id" && null}
        </Tabs>
      </div>
      {tab === "id" && <IdCard student={student} institute={institute} />}
      {tab !== "id" && printing && <PrintableReceipt receipt={printing} institute={institute} totalFee={student.totalFee} />}
    </div>
  );
}

function IssueReceipt({ student, onIssued }: { student: Student; onIssued: (r: FeeReceipt) => void }) {
  const toast = useToast();
  const issue = useIssueReceipt();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [paidOn, setPaidOn] = useState(istDate());
  // One key per filled form: a double click or retry returns the same receipt.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const value = Number(amount);
  const amountOk = amount.trim() !== "" && value > 0 && Math.round(value * 100) === value * 100 && value <= student.due;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amountOk) return;
    try {
      const receipt = await issue.mutateAsync({ body: { studentId: student.id, amount: value, mode, paidOn }, key });
      toast.show({ tone: "success", title: tx("रसीद {0} बन गई", [receipt.receiptNo]), description: tx("नीचे से प्रिंट करें।") });
      onIssued(receipt);
      setAmount("");
      setPaidOn(istDate());
      setKey(crypto.randomUUID());
    } catch (err) {
      toast.show({ tone: "error", title: tx("रसीद नहीं बनी"), description: errText(err) });
    }
  };

  if (student.due <= 0) return <p className="p-4 text-label text-success">{tx("इस छात्र की पूरी फ़ीस जमा है। नई रसीद नहीं कटेगी।")}</p>;
  return (
    <form className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4 md:items-end" onSubmit={(e) => void submit(e)}>
      <Field label={tx("राशि (₹)")} required hint={tx("बकाया {0}", [formatRupees(student.due)])} error={amount && !amountOk ? tx("बकाया से ज़्यादा या गलत राशि") : undefined}>
        <Input type="number" min={0.01} max={student.due} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label={tx("भुगतान का तरीका")}>
        <Select value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
          {PAYMENT_MODES.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_MODE_LABELS[m]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={tx("भुगतान की तारीख")} hint={tx("पिछले {0} दिन तक", [MAX_RECEIPT_BACKDATE_DAYS])}>
        <Input type="date" value={paidOn} min={minDate()} max={istDate()} onChange={(e) => setPaidOn(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" icon={<Receipt className="size-4" />} loading={issue.isPending} disabled={!amountOk}>
        {tx("रसीद काटें")}
      </Button>
    </form>
  );
}

function ReceiptHistory({ student, canCancel, onPrint }: { student: Student; canCancel: boolean; onPrint: (r: FeeReceipt) => void }) {
  const toast = useToast();
  const receipts = useReceipts(student.id);
  const cancel = useCancelReceipt();
  const [cancelling, setCancelling] = useState<FeeReceipt | null>(null);
  const [reason, setReason] = useState("");

  if (receipts.isPending) return <Skeleton />;
  if (receipts.isError) return <ErrorState title={tx("रसीदें लोड नहीं हुईं")} message={errText(receipts.error)} onRetry={() => void receipts.refetch()} />;
  const items = receipts.data.items;
  if (!items.length) return <p className="p-4 text-label text-muted">{tx("अभी कोई रसीद नहीं कटी।")}</p>;
  return (
    <>
      <Table caption={tx("{0} की रसीदें", [student.fullName])}>
        <THead>
          <TR>
            <TH>{tx("रसीद नंबर")}</TH>
            <TH>{tx("तारीख")}</TH>
            <TH>{tx("राशि")}</TH>
            <TH>{tx("तरीका")}</TH>
            <TH>{tx("स्थिति")}</TH>
            <TH>
              <span className="sr-only">{tx("काम")}</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {items.map((r) => (
            <TR key={r.id}>
              <TD className="font-mono">{r.receiptNo}</TD>
              <TD>{dateHi(r.paidOn)}</TD>
              <TD>{formatRupees(r.amount)}</TD>
              <TD>{PAYMENT_MODE_LABELS[r.mode]}</TD>
              <TD>{r.status === "issued" ? tx("जारी") : <span className="text-danger">{tx("रद्द:")} {r.cancelReason}</span>}</TD>
              <TD className="whitespace-nowrap">
                <Button size="sm" icon={<Printer className="size-4" />} onClick={() => onPrint(r)}>
                  {tx("प्रिंट")}
                </Button>
                {canCancel && r.status === "issued" && (
                  <Button size="sm" variant="danger" className="ms-2" onClick={() => (setCancelling(r), setReason(""))}>
                    {tx("रद्द करें")}
                  </Button>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={tx("रसीद {0} रद्द करें?", [cancelling?.receiptNo ?? ""])}
        description={tx("रसीद मिटती नहीं, “रद्द” दिखेगी और उसका नंबर दोबारा नहीं आएगा। राशि बकाया में वापस जुड़ जाएगी। यह ऑडिट लॉग में दर्ज होगा।")}
        size="sm"
        footer={
          <>
            <Button onClick={() => setCancelling(null)}>{tx("रुकें")}</Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              disabled={reason.trim().length < 3}
              onClick={() =>
                void cancel
                  .mutateAsync({ id: cancelling!.id, reason: reason.trim() })
                  .then(() => {
                    toast.show({ tone: "success", title: tx("रसीद रद्द हो गई") });
                    setCancelling(null);
                  })
                  .catch((err: unknown) => toast.show({ tone: "error", title: tx("रद्द नहीं हुई"), description: errText(err) }))
              }
            >
              {tx("हाँ, रद्द करें")}
            </Button>
          </>
        }
      >
        <Field label={tx("रद्द करने का कारण")} required hint={tx("कम से कम 3 अक्षर")}>
          <Textarea rows={2} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}

function PrintableReceipt({ receipt, institute, totalFee }: { receipt: FeeReceipt; institute: Institute; totalFee: number }) {
  const cancelled = receipt.status === "cancelled";
  return (
    <div className="space-y-2">
      <div className="flex justify-end no-print">
        <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          {tx("रसीद प्रिंट करें")}
        </Button>
      </div>
      <article aria-label={tx("रसीद {0}", [receipt.receiptNo])} className="relative mx-auto max-w-lg rounded-card border border-line-strong bg-white p-6 text-slate-900">
        {cancelled && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-12 text-center text-display font-black text-red-600/40">{tx("रद्द / CANCELLED")}</p>
        )}
        <header className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-3">
            <img src={instituteLogo(institute)} alt="" className="size-11 rounded-full" />
            <div>
              <h2 className="text-label font-black uppercase">{institute.name}</h2>
              <p className="text-caption text-slate-600">{[institute.city, institute.phone && tx("फ़ोन: {0}", [institute.phone])].filter(Boolean).join(" • ")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-caption font-bold uppercase">{tx("फ़ीस रसीद")}</p>
            <p className="font-mono text-caption">{receipt.receiptNo}</p>
          </div>
        </header>
        <dl className="grid grid-cols-2 gap-2 border-b border-slate-200 py-3 text-caption">
          <div>
            <dt className="inline font-semibold">{tx("छात्र:")} </dt>
            <dd className="inline">{receipt.student.fullName}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{tx("रोल नंबर:")} </dt>
            <dd className="inline">{receipt.student.rollNo}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{tx("कोर्स:")} </dt>
            <dd className="inline">{receipt.student.course}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{tx("तारीख:")} </dt>
            <dd className="inline">{dateHi(receipt.paidOn)}</dd>
          </div>
        </dl>
        <div className="space-y-1 py-3 text-label">
          <p className="flex justify-between">
            <span>{tx("कुल कोर्स फ़ीस")}</span>
            <span>{formatRupees(totalFee)}</span>
          </p>
          <p className="flex justify-between rounded bg-emerald-50 px-2 font-bold text-emerald-800">
            <span>{tx("प्राप्त राशि (")}{PAYMENT_MODE_LABELS[receipt.mode]})</span>
            <span>{formatRupees(receipt.amount)}</span>
          </p>
          {receipt.dueAfter !== null && (
            <p className="flex justify-between px-2 text-red-700">
              <span>{tx("इस रसीद के बाद बकाया")}</span>
              <span>{formatRupees(receipt.dueAfter)}</span>
            </p>
          )}
        </div>
        <footer className="flex items-end justify-between border-t border-slate-300 pt-6 text-caption text-slate-600">
          <span>{tx("जारीकर्ता:")} {receipt.issuedBy.displayName}</span>
          <span className="border-t border-slate-400 pt-1 font-bold">{tx("अधिकृत हस्ताक्षर")}</span>
        </footer>
      </article>
    </div>
  );
}

function IdCard({ student, institute }: { student: Student; institute: Institute }) {
  const { client } = useSession();
  const photo = useQuery({
    queryKey: ["file-url", student.photoFileId],
    enabled: !!student.photoFileId,
    queryFn: () => fileUrl(client, student.photoFileId!),
    staleTime: 4 * 60_000,
  });
  return (
    <div className="space-y-2">
      <div className="flex justify-end no-print">
        <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          {tx("ID कार्ड प्रिंट करें")}
        </Button>
      </div>
      <article aria-label={tx("{0} का ID कार्ड", [student.fullName])} className="mx-auto w-80 overflow-hidden rounded-3xl border-2 border-amber-400 bg-slate-950 text-white">
        <header className="flex items-center justify-center gap-2 bg-amber-500 p-4 text-slate-950">
          <img src={instituteLogo(institute)} alt="" className="size-10 rounded-full bg-amber-300" />
          <div>
            <h3 className="text-caption font-black uppercase">{institute.name}</h3>
            <p className="text-[10px] font-bold">{[institute.city, tx("छात्र पहचान पत्र")].filter(Boolean).join(" • ")}</p>
          </div>
        </header>
        <div className="space-y-3 p-6 text-center">
          <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-slate-800">
            {photo.data ? <img src={photo.data.url} alt={tx("{0} की फ़ोटो", [student.fullName])} className="size-full object-cover" /> : <User className="size-12 text-slate-500" aria-hidden />}
          </div>
          <div>
            <h4 className="text-body font-bold">{student.fullName}</h4>
            <p className="mt-1 inline-block rounded-full border border-amber-500/40 px-2.5 py-0.5 font-mono text-caption font-bold text-amber-400">{student.rollNo}</p>
          </div>
          <dl className="space-y-1 border-t border-slate-800 pt-2 text-left text-caption text-slate-300">
            <div>
              <dt className="inline text-slate-400">{tx("कोर्स:")} </dt>
              <dd className="inline">{student.course}</dd>
            </div>
            {student.batch && (
              <div>
                <dt className="inline text-slate-400">{tx("बैच:")} </dt>
                <dd className="inline">{student.batch}</dd>
              </div>
            )}
            {student.guardianName && (
              <div>
                <dt className="inline text-slate-400">{tx("अभिभावक:")} </dt>
                <dd className="inline">{student.guardianName}</dd>
              </div>
            )}
            {student.phone && (
              <div>
                <dt className="inline text-slate-400">{tx("मोबाइल:")} </dt>
                <dd className="inline">{student.phone}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-slate-400">{tx("वैधता:")} </dt>
              <dd className="inline">{academicSession("hi")}</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  );
}
