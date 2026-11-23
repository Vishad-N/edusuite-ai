import React, { useState } from "react";
import { Copy, Check, Zap, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import { DocumentBar } from "./DocumentBar.tsx";
import { Button, Field, Input, PageHeader, Textarea } from "./ui/index.ts";

const lines = (value) =>
  value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export default function DoubtSolver({ activeInstitute }) {
  const [doubtText, setDoubtText] = useState("");
  const [subject, setSubject] = useState("");
  const [answer, setAnswer] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [shortcutTrick, setShortcutTrick] = useState("");
  const [commonMistake, setCommonMistake] = useState("");
  const [similarText, setSimilarText] = useState("");
  const [copied, setCopied] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  const steps = lines(stepsText);
  const similarQuestions = lines(similarText);

  // What gets saved (shape: DoubtContentSchema in packages/shared/documents.ts).
  const documentContent = {
    question: doubtText,
    subject,
    answer,
    steps,
    ...(shortcutTrick.trim() && { shortcutTrick }),
    ...(commonMistake.trim() && { commonMistake }),
    similarQuestions,
  };

  const handleCopy = async () => {
    let clean = `DOUBT SOLUTION - ${activeInstitute.name}\n\n`;
    clean += `प्रश्न: ${doubtText}\n\n`;
    clean += `सही उत्तर: ${answer}\n\n`;
    if (steps.length) clean += `हल (Step-by-Step):\n${steps.join("\n")}\n`;
    if (shortcutTrick.trim()) clean += `\nशॉर्टकट ट्रिक: ${shortcutTrick}\n`;
    if (commonMistake.trim()) clean += `\nआम गलती: ${commonMistake}\n`;
    if (similarQuestions.length) clean += `\nसमान अभ्यास प्रश्न:\n${similarQuestions.map((q) => `• ${q}`).join("\n")}\n`;
    await navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = (content) => {
    setDoubtText(content?.question ?? "");
    setSubject(content?.subject ?? "");
    setAnswer(content?.answer ?? "");
    setStepsText((content?.steps ?? []).join("\n"));
    setShortcutTrick(content?.shortcutTrick ?? "");
    setCommonMistake(content?.commonMistake ?? "");
    setSimilarText((content?.similarQuestions ?? []).join("\n"));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Lightbulb className="size-6" />}
        title="डाउट सॉल्वर & शॉर्टकट ट्रिक"
        badge="WhatsApp Ready"
        description="छात्र के डाउट का चरणबद्ध हल, शॉर्टकट ट्रिक और समान प्रश्न लिखें, व्हाट्सएप के लिए कॉपी करें, सेव करें और बाद में फिर से खोलें।"
        actions={
          <Button
            variant="primary"
            icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            onClick={() => void handleCopy()}
          >
            {copied ? "व्हाट्सएप के लिए कॉपी हो गया!" : "हल कॉपी करें (WhatsApp)"}
          </Button>
        }
      />

      <DocumentBar
        type="doubt"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={documentContent}
        onOpen={(content) => reset(content)}
        onNew={() => {
          reset(null);
          setDocTitle("");
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="text-label font-semibold">छात्र का प्रश्न और हल</h3>
            <p className="text-caption text-muted">अभी हल खुद लिखें। AI से हल अगले चरण में आएगा।</p>
            <Field label="छात्र का प्रश्न / डाउट">
              <Textarea rows={4} value={doubtText} onChange={(e) => setDoubtText(e.target.value)} placeholder="प्रश्न यहाँ लिखें या पेस्ट करें" />
            </Field>
            <Field label="विषय">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="उदा. गणित (चाल और दूरी)" />
            </Field>
            <Field label="सही उत्तर">
              <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </Field>
            <Field label="चरणबद्ध हल" hint="हर लाइन एक चरण">
              <Textarea rows={5} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />
            </Field>
            <Field label="शॉर्टकट ट्रिक (वैकल्पिक)">
              <Textarea rows={2} value={shortcutTrick} onChange={(e) => setShortcutTrick(e.target.value)} />
            </Field>
            <Field label="आम गलती (वैकल्पिक)">
              <Textarea rows={2} value={commonMistake} onChange={(e) => setCommonMistake(e.target.value)} />
            </Field>
            <Field label="समान अभ्यास प्रश्न (वैकल्पिक)" hint="हर लाइन एक प्रश्न">
              <Textarea rows={3} value={similarText} onChange={(e) => setSimilarText(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Output Solution */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-4 rounded-card border border-line bg-surface p-6 text-ink">
            <div className="space-y-1">
              {subject && <span className="text-caption font-semibold text-muted">{subject}</span>}
              <p className="text-body font-semibold whitespace-pre-wrap">{doubtText || "छात्र का प्रश्न यहाँ दिखेगा।"}</p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-card border border-success bg-success-subtle p-4">
              <div>
                <span className="text-caption font-semibold text-success">सही उत्तर</span>
                <p className="mt-1 text-title font-bold">{answer || "—"}</p>
              </div>
              <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
            </div>

            {steps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-label font-semibold">चरणबद्ध हल</h3>
                <ol className="space-y-2">
                  {steps.map((st, i) => (
                    <li key={i} className="rounded-control border border-line p-3 text-label">
                      {st}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {shortcutTrick.trim() && (
              <div className="space-y-1 rounded-card border border-line bg-accent-subtle p-4 text-label">
                <div className="flex items-center gap-2 font-semibold">
                  <Zap className="size-4" aria-hidden="true" />
                  शॉर्टकट ट्रिक
                </div>
                <p className="whitespace-pre-wrap">{shortcutTrick}</p>
              </div>
            )}

            {commonMistake.trim() && (
              <div className="flex items-start gap-2 rounded-card border border-danger bg-danger-subtle p-4 text-label">
                <AlertTriangle className="mt-1 size-4 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <span className="font-semibold">आम गलती: </span>
                  <span className="whitespace-pre-wrap">{commonMistake}</span>
                </div>
              </div>
            )}

            {similarQuestions.length > 0 && (
              <div className="space-y-2 border-t border-line pt-3">
                <h3 className="text-label font-semibold">समान अभ्यास प्रश्न</h3>
                <ul className="space-y-2">
                  {similarQuestions.map((sq, i) => (
                    <li key={i} className="rounded-control border border-line p-2 text-label">
                      • {sq}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
