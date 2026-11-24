import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import {
  AUDIT_ACTION_GROUPS,
  istDate,
  type AiJobType,
  type AuditActionGroup,
  type AuditLogEntry,
  type Page,
  type UsageReport,
} from "@edusuite/shared";
import { ApiError } from "../api/client.ts";
import { JOB_TYPE_LABELS } from "../api/credits.ts";
import { useSession } from "../api/session.tsx";
import { tx, uiLocale } from "../i18n/index.ts";
import { Button, Card, CardBody, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton, Table, TBody, TD, TH, THead, TR, Tabs } from "./ui/index.ts";

const errText = (err: unknown) => (err instanceof ApiError ? err.message : tx("काम पूरा नहीं हुआ। फिर से कोशिश करें।"));
const when = (iso: string) => new Date(iso).toLocaleString(uiLocale(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function groupLabel(g: AuditActionGroup): string {
  switch (g) {
    case "auth": return tx("लॉगिन / लॉगआउट");
    case "user": return tx("यूजर");
    case "document": return tx("दस्तावेज़");
    case "receipt": return tx("फ़ीस रसीद");
    case "student": return tx("छात्र");
    case "ai": return tx("AI काम");
    case "credits": return tx("क्रेडिट");
    case "institute": return tx("संस्थान");
    case "branch": return tx("ब्रांच");
  }
}

/** Plain-language name of an audit action; unknown ones show their code. */
function actionLabel(action: string): string {
  switch (action) {
    case "auth.login": return tx("लॉगिन");
    case "auth.login_failed": return tx("गलत लॉगिन प्रयास");
    case "auth.logout": return tx("लॉगआउट");
    case "auth.refresh_reuse": return tx("पुराना सत्र दोबारा इस्तेमाल (सभी सत्र बंद)");
    case "user.create": return tx("यूजर बनाया");
    case "user.update": return tx("यूजर बदला");
    case "user.reset_password": return tx("पासवर्ड रीसेट");
    case "document.create": return tx("दस्तावेज़ बनाया");
    case "document.update": return tx("दस्तावेज़ बदला");
    case "document.delete": return tx("दस्तावेज़ हटाया");
    case "receipt.issue": return tx("रसीद काटी");
    case "receipt.cancel": return tx("रसीद रद्द की");
    case "student.create": return tx("छात्र जोड़ा");
    case "student.update": return tx("छात्र बदला");
    case "ai.job.create": return tx("AI काम शुरू");
    case "ai.job.cancel": return tx("AI काम रोका");
    case "credits.price": return tx("AI कीमत बदली");
    case "institute.update": return tx("संस्थान की जानकारी बदली");
    case "branch.create": return tx("ब्रांच जोड़ी");
    case "branch.update": return tx("ब्रांच बदली");
    default: return action;
  }
}

/** Short readable details from the entry's meta (ids are left out). */
function details(meta: Record<string, unknown>): string {
  return Object.entries(meta)
    .filter(([k, v]) => v !== null && v !== "" && !/id$/i.test(k))
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

/**
 * AI usage and the audit log for admins (plan §07 ADMIN, DN-066). A super admin sees the
 * institute; a branch admin sees their own branch's staff.
 */
export default function AuditUsage() {
  const [tab, setTab] = useState("usage");
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ScrollText className="size-6" />}
        title={tx("AI उपयोग और ऑडिट लॉग")}
        badge={tx("एडमिन")}
        description={tx("महीने भर में किस AI काम पर कितने क्रेडिट लगे, और किसने कब क्या बदला: लॉगिन, यूजर, रसीदें, दस्तावेज़ और क्रेडिट।")}
      />
      <Tabs
        label={tx("उपयोग और ऑडिट")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "usage", label: tx("AI उपयोग") },
          { id: "audit", label: tx("ऑडिट लॉग") },
        ]}
      >
        {tab === "usage" ? <UsagePanel /> : <AuditPanel />}
      </Tabs>
    </div>
  );
}

function UsagePanel() {
  const { client } = useSession();
  const [month, setMonth] = useState(istDate().slice(0, 7));
  const usage = useQuery({ queryKey: ["usage", month], queryFn: () => client.get<UsageReport>(`/usage?month=${month}`) });
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label={tx("महीना")} className="w-48">
            <Input type="month" value={month} max={istDate().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </Field>
          {usage.data && (
            <p className="text-label text-muted">
              {usage.data.scope === "branch" ? tx("आपकी ब्रांच के स्टाफ के काम") : tx("पूरे संस्थान के काम")}
            </p>
          )}
        </div>
        {usage.isPending ? (
          <Skeleton />
        ) : usage.isError ? (
          <ErrorState title={tx("उपयोग लोड नहीं हुआ")} message={errText(usage.error)} onRetry={() => void usage.refetch()} />
        ) : usage.data.rows.length === 0 ? (
          <EmptyState title={tx("इस महीने कोई AI काम नहीं हुआ")} description={tx("दूसरा महीना चुनकर देखें।")} />
        ) : (
          <Table caption={tx("{0} का AI उपयोग", [month])}>
            <THead>
              <TR>
                <TH>{tx("AI काम")}</TH>
                <TH>{tx("कुल")}</TH>
                <TH>{tx("पूरे हुए")}</TH>
                <TH>{tx("असफल")}</TH>
                <TH>{tx("रोके गए")}</TH>
                <TH>{tx("लगे क्रेडिट")}</TH>
              </TR>
            </THead>
            <TBody>
              {usage.data.rows.map((r) => (
                <TR key={r.jobType}>
                  <TD>{JOB_TYPE_LABELS[r.jobType as AiJobType] ?? r.jobType}</TD>
                  <TD>{r.jobs}</TD>
                  <TD>{r.succeeded}</TD>
                  <TD>{r.failed}</TD>
                  <TD>{r.cancelled}</TD>
                  <TD className="font-semibold">{r.credits.toLocaleString(uiLocale())}</TD>
                </TR>
              ))}
              <TR>
                <TD className="font-semibold">{tx("कुल")}</TD>
                <TD className="font-semibold">{usage.data.totals.jobs}</TD>
                <TD className="font-semibold">{usage.data.totals.succeeded}</TD>
                <TD className="font-semibold">{usage.data.totals.failed}</TD>
                <TD className="font-semibold">{usage.data.totals.cancelled}</TD>
                <TD className="font-semibold">{usage.data.totals.credits.toLocaleString(uiLocale())}</TD>
              </TR>
            </TBody>
          </Table>
        )}
        <p className="text-caption text-muted">{tx("असफल और रोके गए कामों के क्रेडिट वापस हो जाते हैं, इसलिए वे “लगे क्रेडिट” में नहीं जुड़ते।")}</p>
      </CardBody>
    </Card>
  );
}

function AuditPanel() {
  const { client } = useSession();
  const [group, setGroup] = useState<AuditActionGroup | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const logs = useInfiniteQuery({
    queryKey: ["audit-logs", group, from, to],
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({ limit: "50" });
      if (group) p.set("group", group);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      if (pageParam) p.set("cursor", pageParam);
      return client.get<Page<AuditLogEntry>>(`/audit-logs?${p}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = logs.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label={tx("किस तरह का काम")}>
            <Select value={group} onChange={(e) => setGroup(e.target.value as AuditActionGroup | "")}>
              <option value="">{tx("सभी")}</option>
              {AUDIT_ACTION_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {groupLabel(g)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tx("से (तारीख)")}>
            <Input type="date" value={from} max={to || istDate()} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={tx("तक (तारीख)")}>
            <Input type="date" value={to} min={from || undefined} max={istDate()} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        {logs.isPending ? (
          <Skeleton />
        ) : logs.isError ? (
          <ErrorState title={tx("ऑडिट लॉग लोड नहीं हुआ")} message={errText(logs.error)} onRetry={() => void logs.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={tx("कुछ नहीं मिला")} description={tx("खोज या फ़िल्टर बदलकर देखें।")} />
        ) : (
          <Table caption={tx("ऑडिट लॉग, नया पहले")}>
            <THead>
              <TR>
                <TH>{tx("कब")}</TH>
                <TH>{tx("किसने")}</TH>
                <TH>{tx("क्या")}</TH>
                <TH>{tx("विवरण")}</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap">{when(e.createdAt)}</TD>
                  <TD>{e.actor ? `${e.actor.displayName} (${e.actor.employeeCode})` : "—"}</TD>
                  <TD>{actionLabel(e.action)}</TD>
                  <TD className="max-w-md break-words text-caption text-muted">{details(e.meta) || "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        {logs.hasNextPage && (
          <Button loading={logs.isFetchingNextPage} onClick={() => void logs.fetchNextPage()}>
            {tx("और दिखाएँ")}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
