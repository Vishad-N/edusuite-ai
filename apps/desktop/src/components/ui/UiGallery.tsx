import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  JobProgress,
  Modal,
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
  useToast,
} from "./index.ts";

/**
 * Development-only page showing every primitive in each state.
 * Open with `npm run dev` and go to http://localhost:5173/#ui-gallery.
 * Not included in production builds (see main.jsx).
 */
export function UiGallery() {
  return (
    <ToastProvider>
      <main className="h-screen overflow-y-auto bg-page p-8 text-ink">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <header>
            <h1 className="text-display font-bold">UI प्रिमिटिव्स (Gallery)</h1>
            <p className="text-body text-muted">हर कंपोनेंट की सभी स्थितियाँ। केवल डेवलपमेंट के लिए।</p>
          </header>
          <Buttons />
          <Forms />
          <Feedback />
          <Dialogs />
          <DataStates />
          <Progress />
        </div>
      </main>
    </ToastProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">{children}</CardBody>
    </Card>
  );
}

function Buttons() {
  return (
    <Section title="बटन (Button)">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" icon={<Save className="size-4" />}>सेव करें</Button>
        <Button variant="secondary">रद्द करें</Button>
        <Button variant="ghost" icon={<Plus className="size-4" />}>नया जोड़ें</Button>
        <Button variant="danger" icon={<Trash2 className="size-4" />}>रसीद रद्द करें</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" loading>बन रहा है…</Button>
        <Button variant="primary" disabled>अभी उपलब्ध नहीं</Button>
        <Button variant="secondary" size="sm">छोटा बटन</Button>
      </div>
    </Section>
  );
}

function Forms() {
  return (
    <Section title="फ़ॉर्म (Field, Input, Select, Textarea)">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="छात्र का पूरा नाम" hint="जैसा आधार कार्ड पर लिखा है" required>
          <Input placeholder="उदा. राहुल वर्मा" />
        </Field>
        <Field label="मोबाइल नंबर" error="10 अंकों का मोबाइल नंबर लिखें">
          <Input defaultValue="98260" inputMode="numeric" />
        </Field>
        <Field label="भुगतान का तरीका">
          <Select defaultValue="upi">
            <option value="cash">नकद</option>
            <option value="upi">UPI</option>
            <option value="card">कार्ड</option>
          </Select>
        </Field>
        <Field label="अक्षम फ़ील्ड" hint="यह अभी बदला नहीं जा सकता">
          <Input disabled defaultValue="IND-BKN/2026-27/000431" />
        </Field>
        <Field label="डाउट / प्रश्न" className="md:col-span-2">
          <Textarea placeholder="अपना प्रश्न यहाँ लिखें…" />
        </Field>
      </div>
    </Section>
  );
}

function Feedback() {
  const toast = useToast();
  return (
    <Section title="सूचनाएँ (Toast)">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => toast.show({ tone: "success", title: "रसीद सेव हो गई", description: "IND-BKN/2026-27/000431" })}>
          सफलता
        </Button>
        <Button onClick={() => toast.show({ tone: "info", title: "ड्राफ्ट अपने-आप सेव हुआ" })}>जानकारी</Button>
        <Button onClick={() => toast.show({ tone: "error", title: "सेव नहीं हुआ", description: "इंटरनेट जाँचें और फिर कोशिश करें।" })}>
          त्रुटि
        </Button>
      </div>
    </Section>
  );
}

function Dialogs() {
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tab, setTab] = useState("id");
  return (
    <Section title="डायलॉग और टैब (Modal, ConfirmDialog, Tabs)">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setModal(true)}>मोडल खोलें</Button>
        <Button variant="danger" onClick={() => setConfirm(true)}>रसीद रद्द करें…</Button>
      </div>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="संस्थान की जानकारी"
        description="नाम और फ़ोन नंबर सभी रसीदों पर छपते हैं।"
        footer={
          <>
            <Button onClick={() => setModal(false)}>रद्द करें</Button>
            <Button variant="primary" onClick={() => setModal(false)}>सेव करें</Button>
          </>
        }
      >
        <Field label="संस्थान का नाम">
          <Input defaultValue="डेमो कोचिंग संस्थान" />
        </Field>
      </Modal>
      <ConfirmDialog
        open={confirm}
        title="रसीद रद्द करें?"
        message="रद्द की गई रसीद हटाई नहीं जाती; कारण के साथ रिकॉर्ड में रहती है।"
        confirmLabel="हाँ, रद्द करें"
        tone="danger"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
      <Tabs
        label="पहचान पत्र या रसीद"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "id", label: "छात्र ID कार्ड" },
          { id: "receipt", label: "फीस रसीद" },
          { id: "soon", label: "जल्द आ रहा है", disabled: true },
        ]}
      >
        <p className="text-body">{tab === "id" ? "ID कार्ड का पूर्वावलोकन" : "रसीद का पूर्वावलोकन"}</p>
      </Tabs>
    </Section>
  );
}

function DataStates() {
  return (
    <Section title="डेटा की स्थितियाँ (Table, Empty, Error, Skeleton)">
      <Table caption="हाल की फीस रसीदें">
        <THead>
          <TR>
            <TH>रसीद नं.</TH>
            <TH>छात्र</TH>
            <TH className="text-right">राशि</TH>
            <TH>स्थिति</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD className="tabular-nums">IND-BKN/2026-27/000431</TD>
            <TD>राहुल वर्मा</TD>
            <TD className="text-right tabular-nums">₹15,000.00</TD>
            <TD>जारी</TD>
          </TR>
          <TR>
            <TD className="tabular-nums">IND-BKN/2026-27/000432</TD>
            <TD>प्रिया सिंह</TD>
            <TD className="text-right tabular-nums">₹8,500.00</TD>
            <TD>रद्द (कारण: दोहरी रसीद)</TD>
          </TR>
        </TBody>
      </Table>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <EmptyState
            title="अभी कोई PPT नहीं"
            description="पहली प्रेजेंटेशन बनाएँ; वह यहाँ दिखेगी।"
            action={<Button variant="primary">नई PPT बनाएँ</Button>}
          />
        </Card>
        <ErrorState title="सूची लोड नहीं हुई" message="सर्वर से जुड़ नहीं सके।" code="NETWORK_ERROR" onRetry={() => {}} />
        <Card>
          <CardBody>
            <Skeleton lines={4} />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle as="h3">कार्ड शीर्षक</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-body">कार्ड की सामग्री। सपाट सतह, पतली किनारी, कोई छाया नहीं।</p>
        </CardBody>
        <CardFooter>
          <Button>रद्द करें</Button>
          <Button variant="primary">सेव करें</Button>
        </CardFooter>
      </Card>
    </Section>
  );
}

function Progress() {
  return (
    <Section title="AI जॉब की प्रगति (JobProgress)">
      <JobProgress status="queued" onCancel={() => {}} />
      <JobProgress status="running" progress={0.4} stage="20 में से 8 स्क्रीनशॉट पढ़े गए" onCancel={() => {}} />
      <JobProgress status="succeeded" />
      <JobProgress status="failed" error="AI ने यह अनुरोध पूरा करने से मना कर दिया।" onRetry={() => {}} />
    </Section>
  );
}
