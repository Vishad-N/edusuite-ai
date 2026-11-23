import { useState } from "react";
import { Coins, History, Plus } from "lucide-react";
import type { AiJobType, CreditKind, CreditPrice, CreditUnit, PlatformInstitute } from "@edusuite/shared";
import { ApiError } from "../api/client.ts";
import { JOB_TYPE_LABELS, useGrantCredits, usePlatformInstitutes, usePlatformLedger, usePlatformPrices, useSetPrice } from "../api/credits.ts";
import { Button, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Table, TBody, TD, TH, THead, TR, useToast } from "./ui/index.ts";

const num = (n: number) => n.toLocaleString("hi-IN");
const when = (iso: string) => new Date(iso).toLocaleString("hi-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const KIND_LABELS: Record<CreditKind, string> = {
  grant: "क्रेडिट जोड़े",
  adjust: "क्रेडिट घटाए",
  job_charge: "AI काम",
  job_refund: "वापसी (काम असफल)",
};

/**
 * The EduSuite operator's console (DN-053): every customer institute's AI credit
 * balance, grants and corrections with a required reason, each institute's
 * history, and the price of each AI job type.
 */
export default function PlatformCredits() {
  const institutes = usePlatformInstitutes();
  const [granting, setGranting] = useState<PlatformInstitute | null>(null);
  const [history, setHistory] = useState<PlatformInstitute | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Coins className="size-6" />}
        title="AI क्रेडिट प्रबंधन"
        badge="EduSuite ऑपरेटर"
        description="हर संस्थान के AI क्रेडिट देखें, जोड़ें या घटाएँ, उनका इतिहास देखें और हर AI काम की कीमत तय करें।"
      />

      <section className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
        <h2 className="text-label font-semibold">संस्थान</h2>
        {institutes.isPending ? (
          <Skeleton lines={4} />
        ) : institutes.isError ? (
          <ErrorState title="संस्थान लोड नहीं हुए" message={institutes.error instanceof ApiError ? institutes.error.message : undefined} onRetry={() => void institutes.refetch()} />
        ) : institutes.data.length === 0 ? (
          <EmptyState title="अभी कोई संस्थान नहीं" description="संस्थान बनने के बाद यहाँ दिखेंगे।" />
        ) : (
          <Table caption="संस्थानों के AI क्रेडिट">
            <THead>
              <TR>
                <TH>संस्थान</TH>
                <TH>कोड</TH>
                <TH className="text-right">बचे क्रेडिट</TH>
                <TH className="text-right">पिछले 30 दिन में उपयोग</TH>
                <TH>
                  <span className="sr-only">कार्य</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {institutes.data.map((i) => (
                <TR key={i.id}>
                  <TD className="font-semibold">{i.name}</TD>
                  <TD>{i.code}</TD>
                  <TD className={`text-right font-semibold ${i.balance === 0 ? "text-danger" : ""}`}>{num(i.balance)}</TD>
                  <TD className="text-right">{num(i.used30Days)}</TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="primary" icon={<Plus className="size-4" />} aria-label={`${i.name}: क्रेडिट बदलें`} onClick={() => setGranting(i)}>
                        क्रेडिट बदलें
                      </Button>
                      <Button size="sm" icon={<History className="size-4" />} aria-label={`${i.name}: इतिहास`} onClick={() => setHistory(i)}>
                        इतिहास
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <PriceList />

      {granting && <GrantModal institute={granting} onClose={() => setGranting(null)} />}
      {history && <HistoryModal institute={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function GrantModal({ institute, onClose }: { institute: PlatformInstitute; onClose: () => void }) {
  const toast = useToast();
  const grant = useGrantCredits();
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const value = Number(amount);
  const valid = Number.isInteger(value) && value > 0 && note.trim().length >= 3 && (direction === "add" || value <= institute.balance);
  const after = institute.balance + (direction === "add" ? value || 0 : -(value || 0));

  const submit = async () => {
    try {
      const entry = await grant.mutateAsync({ instituteId: institute.id, delta: direction === "add" ? value : -value, note: note.trim() });
      toast.show({ tone: "success", title: "क्रेडिट अपडेट हुए", description: `${institute.name}: अब ${num(entry.balanceAfter)}` });
      onClose();
    } catch (err) {
      toast.show({ tone: "error", title: "क्रेडिट नहीं बदले", description: err instanceof ApiError ? err.message : undefined });
    }
  };

  return (
    <Modal open onClose={onClose} title={`${institute.name}: क्रेडिट बदलें`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) void submit();
        }}
      >
        <p className="text-label text-muted">अभी बचे क्रेडिट: {num(institute.balance)}</p>
        <div role="group" aria-label="जोड़ें या घटाएँ" className="flex gap-2">
          <Button type="button" variant={direction === "add" ? "primary" : "secondary"} aria-pressed={direction === "add"} onClick={() => setDirection("add")}>
            जोड़ें
          </Button>
          <Button type="button" variant={direction === "remove" ? "primary" : "secondary"} aria-pressed={direction === "remove"} onClick={() => setDirection("remove")}>
            घटाएँ (सुधार)
          </Button>
        </div>
        <Field label="कितने क्रेडिट" error={direction === "remove" && value > institute.balance ? "बचे क्रेडिट से ज़्यादा नहीं घटा सकते" : undefined}>
          <Input type="number" inputMode="numeric" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="कारण" hint="जैसे भुगतान का संदर्भ या सुधार का कारण; यह इतिहास में रहेगा">
          <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {value > 0 && Number.isInteger(value) && after >= 0 && <p className="text-label">बदलाव के बाद: {num(after)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            रद्द करें
          </Button>
          <Button type="submit" variant="primary" disabled={!valid} loading={grant.isPending}>
            {direction === "add" ? "क्रेडिट जोड़ें" : "क्रेडिट घटाएँ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function HistoryModal({ institute, onClose }: { institute: PlatformInstitute; onClose: () => void }) {
  const ledger = usePlatformLedger(institute.id);
  const items = ledger.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Modal open onClose={onClose} title={`${institute.name}: क्रेडिट इतिहास`} size="lg">
      {ledger.isPending ? (
        <Skeleton lines={5} />
      ) : ledger.isError ? (
        <ErrorState title="इतिहास लोड नहीं हुआ" onRetry={() => void ledger.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="अभी कोई लेन-देन नहीं" description="क्रेडिट जोड़ने के बाद यहाँ दिखेगा।" />
      ) : (
        <div className="space-y-3">
          <Table caption="क्रेडिट इतिहास, नया पहले">
            <THead>
              <TR>
                <TH>समय</TH>
                <TH>प्रकार</TH>
                <TH className="text-right">बदलाव</TH>
                <TH className="text-right">बाद में बैलेंस</TH>
                <TH>कारण / किसने</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((e) => (
                <TR key={e.id}>
                  <TD>{when(e.createdAt)}</TD>
                  <TD>{KIND_LABELS[e.kind]}</TD>
                  <TD className={`text-right font-semibold ${e.delta < 0 ? "text-danger" : "text-success"}`}>{e.delta > 0 ? `+${num(e.delta)}` : num(e.delta)}</TD>
                  <TD className="text-right">{num(e.balanceAfter)}</TD>
                  <TD>{[e.note, e.actor?.displayName].filter(Boolean).join(" · ") || "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {ledger.hasNextPage && (
            <div className="flex justify-center">
              <Button onClick={() => void ledger.fetchNextPage()} loading={ledger.isFetchingNextPage}>
                और दिखाएँ
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PriceList() {
  const prices = usePlatformPrices();
  return (
    <section className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
      <h2 className="text-label font-semibold">हर AI काम की कीमत (क्रेडिट)</h2>
      <p className="text-caption text-muted">नई कीमत अगले काम से लागू होती है; पहले से शुरू हुए काम पुरानी कीमत पर चलते हैं।</p>
      {prices.isPending ? (
        <Skeleton lines={4} />
      ) : prices.isError ? (
        <ErrorState title="कीमतें लोड नहीं हुईं" onRetry={() => void prices.refetch()} />
      ) : (
        <Table caption="AI काम की कीमतें">
          <THead>
            <TR>
              <TH>AI काम</TH>
              <TH>क्रेडिट</TH>
              <TH>गिनती</TH>
              <TH>
                <span className="sr-only">सेव</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {prices.data.map((p) => (
              <PriceRow key={p.jobType} price={p} />
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}

function PriceRow({ price }: { price: CreditPrice }) {
  const toast = useToast();
  const save = useSetPrice();
  const [credits, setCredits] = useState(String(price.credits));
  const [unit, setUnit] = useState<CreditUnit>(price.unit);
  const value = Number(credits);
  const valid = Number.isInteger(value) && value >= 0 && value <= 1000;
  const changed = value !== price.credits || unit !== price.unit;
  const label = JOB_TYPE_LABELS[price.jobType as AiJobType];
  return (
    <TR>
      <TD>{label}</TD>
      <TD>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={1000}
          step={1}
          aria-label={`${label}: क्रेडिट`}
          className="w-24"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
      </TD>
      <TD>
        <Select aria-label={`${label}: गिनती`} value={unit} onChange={(e) => setUnit(e.target.value as CreditUnit)}>
          <option value="job">हर काम पर</option>
          <option value="item">हर आइटम पर (जैसे स्क्रीनशॉट)</option>
        </Select>
      </TD>
      <TD>
        <Button
          size="sm"
          disabled={!changed || !valid}
          loading={save.isPending}
          onClick={async () => {
            try {
              await save.mutateAsync({ jobType: price.jobType, credits: value, unit });
              toast.show({ tone: "success", title: "कीमत सेव हुई", description: label });
            } catch (err) {
              toast.show({ tone: "error", title: "कीमत सेव नहीं हुई", description: err instanceof ApiError ? err.message : undefined });
            }
          }}
        >
          सेव करें
        </Button>
      </TD>
    </TR>
  );
}
