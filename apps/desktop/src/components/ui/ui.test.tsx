import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  JobProgress,
  PageHeader,
  Select,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  Textarea,
  ToastProvider,
} from "./index.ts";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const attr = (markup: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(markup)?.[1];

test("Button defaults to type=button so it never submits a form by accident", () => {
  assert.match(html(<Button>सेव करें</Button>), /type="button"/);
});

test("loading Button is disabled and busy", () => {
  const out = html(<Button loading>सेव करें</Button>);
  assert.match(out, /disabled=""/);
  assert.match(out, /aria-busy="true"/);
  assert.match(out, /सेव करें/);
});

test("every Button variant keeps a border for Windows contrast themes", () => {
  for (const variant of ["primary", "secondary", "ghost", "danger"] as const) {
    assert.match(html(<Button variant={variant}>x</Button>), /\bborder\b/, variant);
  }
});

test("Field ties its label, hint and error to the control", () => {
  const out = html(
    <Field label="छात्र का नाम" hint="पूरा नाम लिखें" error="नाम ज़रूरी है" required>
      <Input />
    </Field>,
  );
  const id = attr(out, "for");
  assert.ok(id);
  assert.match(out, new RegExp(`<input[^>]*id="${id}"`));
  assert.match(out, /aria-describedby="[^"]*-hint [^"]*-error"/);
  assert.match(out, /aria-invalid="true"/);
  assert.match(out, /required=""/);
  assert.match(out, /role="alert"[^>]*>नाम ज़रूरी है/);
});

test("Select and Textarea also pick up the Field wiring", () => {
  for (const control of [<Select key="s"><option>a</option></Select>, <Textarea key="t" />]) {
    const out = html(<Field label="L" hint="H">{control}</Field>);
    assert.match(out, new RegExp(`id="${attr(out, "for")}"`));
    assert.match(out, /aria-describedby="[^"]*-hint"/);
  }
});

test("Table has a caption and column headers with scope", () => {
  const out = html(
    <Table caption="फीस रसीदें">
      <THead><TR><TH>रसीद नं.</TH></TR></THead>
      <TBody><TR><TD>IND-BKN/2026-27/000001</TD></TR></TBody>
    </Table>,
  );
  assert.match(out, /<caption class="sr-only">फीस रसीदें<\/caption>/);
  assert.match(out, /<th scope="col"/);
  assert.match(out, /tabindex="0"/);
});

test("Tabs mark the selected tab and use one tab stop", () => {
  const out = html(
    <Tabs label="रसीद या कार्ड" value="b" onChange={() => {}} tabs={[{ id: "a", label: "A" }, { id: "b", label: "B" }]}>
      panel
    </Tabs>,
  );
  assert.match(out, /role="tablist" aria-label="रसीद या कार्ड"/);
  assert.equal((out.match(/tabindex="0"/g) ?? []).length, 2, "selected tab + panel");
  assert.match(out, /aria-selected="true"[^>]*tabindex="0"/);
  assert.match(out, /aria-selected="false"[^>]*tabindex="-1"/);
});

test("ConfirmDialog is a labelled dialog with Cancel before Confirm", () => {
  const out = html(
    <ConfirmDialog open title="रसीद रद्द करें?" message="यह वापस नहीं होगा।" confirmLabel="हाँ, रद्द करें" tone="danger" onConfirm={() => {}} onCancel={() => {}} />,
  );
  assert.match(out, /<dialog[^>]*aria-labelledby="([^"]+)"/);
  assert.ok(out.indexOf("रद्द करें</button>") < out.indexOf("हाँ, रद्द करें"));
  assert.match(out, /aria-label="बंद करें"/);
});

test("EmptyState, ErrorState and Skeleton announce themselves", () => {
  assert.match(html(<EmptyState title="अभी कोई PPT नहीं" />), /role="status"/);
  const err = html(<ErrorState title="लोड नहीं हुआ" code="NETWORK" onRetry={() => {}} />);
  assert.match(err, /role="alert"/);
  assert.match(err, /फिर से कोशिश करें/);
  const sk = html(<Skeleton lines={2} />);
  assert.match(sk, /aria-busy="true"/);
  assert.match(sk, /लोड हो रहा है/);
});

test("ToastProvider renders polite and assertive live regions", () => {
  const out = html(<ToastProvider><p>app</p></ToastProvider>);
  assert.match(out, /aria-live="polite"/);
  assert.match(out, /aria-live="assertive"/);
});

test("JobProgress reports real progress and an indeterminate state", () => {
  const running = html(<JobProgress status="running" progress={0.42} stage="5 में से 2 स्क्रीनशॉट" />);
  assert.match(running, /role="progressbar"/);
  assert.match(running, /aria-valuenow="42"/);
  assert.match(running, /aria-live="polite"/);
  const unknown = html(<JobProgress status="queued" />);
  assert.doesNotMatch(unknown, /aria-valuenow/);
  const done = html(<JobProgress status="succeeded" />);
  assert.match(done, /aria-valuenow="100"/);
  const failed = html(<JobProgress status="failed" error="AI ने मना कर दिया" onRetry={() => {}} />);
  assert.match(failed, /role="alert"[^>]*>AI ने मना कर दिया/);
});

test("PageHeader renders one visible h1 and is not a <header> (print CSS hides those)", () => {
  const out = html(<PageHeader title="Notice & WhatsApp Circulars" description="d" actions={<Button>Print</Button>} />);
  assert.equal((out.match(/<h1/g) ?? []).length, 1);
  assert.match(out, /<h1 class="[^"]*text-ink/);
  assert.doesNotMatch(out, /<header/);
  assert.doesNotMatch(out, /text-white/);
});

test("no primitive drives progress from a timer (golden rule 5)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  // Tests run from .test-dist; read the TypeScript source next to the original tree.
  const src = readFileSync(join(here, "..", "..", "..", "src", "components", "ui", "JobProgress.tsx"), "utf8");
  assert.doesNotMatch(src, /setTimeout|setInterval/);
});
