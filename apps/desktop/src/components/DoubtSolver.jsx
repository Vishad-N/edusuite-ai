import React, { useState } from "react";
import { Copy, Check, Zap, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import { DoubtSolveOutputSchema, MCQ_MAX_IMAGE_BYTES } from "@edusuite/shared";
import { uploadFile } from "../api/documents.ts";
import { useSession } from "../api/session.tsx";
import { DocumentBar } from "./DocumentBar.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { Button, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";
import { tx } from "../i18n/index.ts";

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
  // AI (DN-060): an optional photo of the question, and the answer language. Not saved.
  const { client } = useSession();
  const [photo, setPhoto] = useState({ state: "none" });
  const [aiLanguage, setAiLanguage] = useState("hi");
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MCQ_MAX_IMAGE_BYTES) {
      return setPhoto({ state: "error", message: tx("PNG, JPG या WebP फ़ोटो चुनें, 5 MB तक।") });
    }
    setPhoto({ state: "uploading", name: file.name });
    try {
      setPhoto({ state: "done", name: file.name, id: (await uploadFile(client, file)).id });
    } catch {
      setPhoto({ state: "error", message: tx("फ़ोटो सर्वर पर नहीं गई। फिर से चुनें।") });
    }
  };
  const fillFromAi = (result) => {
    const parsed = DoubtSolveOutputSchema.safeParse(result);
    if (!parsed.success) return;
    const r = parsed.data;
    if (!doubtText.trim()) setDoubtText(r.question);
    setAnswer(r.answer);
    setStepsText(r.steps.join("\n"));
    setShortcutTrick(r.shortcutTrick);
    setCommonMistake(r.commonMistake);
    setSimilarText(r.similarQuestions.join("\n"));
    if (!docTitle.trim()) setDocTitle((doubtText.trim() || r.question).slice(0, 80));
  };

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
    clean += tx("प्रश्न: {0}\n\n", [doubtText]);
    clean += tx("सही उत्तर: {0}\n\n", [answer]);
    if (steps.length) clean += tx("हल (Step-by-Step):\n{0}\n", [steps.join("\n")]);
    if (shortcutTrick.trim()) clean += tx("\nशॉर्टकट ट्रिक: {0}\n", [shortcutTrick]);
    if (commonMistake.trim()) clean += tx("\nआम गलती: {0}\n", [commonMistake]);
    if (similarQuestions.length) clean += tx("\nसमान अभ्यास प्रश्न:\n{0}\n", [similarQuestions.map((q) => `• ${q}`).join("\n")]);
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
    setPhoto({ state: "none" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Lightbulb className="size-6" />}
        title={tx("डाउट सॉल्वर & शॉर्टकट ट्रिक")}
        badge="WhatsApp Ready"
        description={tx("छात्र के डाउट का चरणबद्ध हल, शॉर्टकट ट्रिक और समान प्रश्न लिखें, व्हाट्सएप के लिए कॉपी करें, सेव करें और बाद में फिर से खोलें।")}
        actions={
          <Button
            variant="primary"
            icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            onClick={() => void handleCopy()}
          >
            {copied ? tx("व्हाट्सएप के लिए कॉपी हो गया!") : tx("हल कॉपी करें (WhatsApp)")}
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
            <h3 className="text-label font-semibold">{tx("छात्र का प्रश्न और हल")}</h3>
            <Field label={tx("छात्र का प्रश्न / डाउट")}>
              <Textarea rows={4} value={doubtText} onChange={(e) => setDoubtText(e.target.value)} placeholder={tx("प्रश्न यहाँ लिखें या पेस्ट करें")} />
            </Field>
            <Field label={tx("विषय")}>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tx("उदा. गणित (चाल और दूरी)")} />
            </Field>
            <div className="space-y-3 rounded-control border border-line p-3">
              <p className="text-label font-semibold">{tx("AI से हल करें")}</p>
              <Field label={tx("प्रश्न की फ़ोटो (वैकल्पिक)")} hint={tx("टाइप करने की जगह किताब या पेपर की फ़ोटो दें")}>
                <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void pickPhoto(e)} disabled={photo.state === "uploading"} />
              </Field>
              {photo.state === "uploading" && <p role="status" className="text-caption text-muted">{tx("फ़ोटो भेजी जा रही है…")}</p>}
              {photo.state === "done" && (
                <p role="status" className="flex items-center justify-between gap-2 text-caption text-success">
                  {photo.name} {tx("अपलोड हो गई")}
                  <Button size="sm" variant="ghost" onClick={() => setPhoto({ state: "none" })}>{tx("हटाएँ")}</Button>
                </p>
              )}
              {photo.state === "error" && <p role="alert" className="text-caption text-danger">{photo.message}</p>}
              <Field label={tx("हल की भाषा")}>
                <Select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}>
                  <option value="hi">{tx("हिन्दी")}</option>
                  <option value="en">English</option>
                  <option value="both">{tx("हिन्दी + English शब्द")}</option>
                </Select>
              </Field>
              <AiGenerate
                label={tx("AI से हल करें")}
                build={() =>
                  doubtText.trim().length >= 2 || photo.state === "done"
                    ? {
                        type: "doubt_solve",
                        input: {
                          question: doubtText.trim().slice(0, 4000),
                          ...(subject.trim() && { subject: subject.trim() }),
                          ...(photo.state === "done" && { imageFileId: photo.id }),
                          language: aiLanguage,
                        },
                      }
                    : null
                }
                confirmReplace={
                  answer.trim() || stepsText.trim()
                    ? { title: tx("लिखा हल बदल जाएगा"), message: tx("AI का हल अभी लिखे उत्तर, चरणों, ट्रिक और समान प्रश्नों की जगह ले लेगा।") }
                    : null
                }
                onResult={fillFromAi}
                hint={tx("AI का हल नीचे भरा जाएगा, सेव नहीं होगा। छात्र को भेजने से पहले जाँच लें।")}
              />
            </div>
            <Field label={tx("सही उत्तर")}>
              <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </Field>
            <Field label={tx("चरणबद्ध हल")} hint={tx("हर लाइन एक चरण")}>
              <Textarea rows={5} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />
            </Field>
            <Field label={tx("शॉर्टकट ट्रिक (वैकल्पिक)")}>
              <Textarea rows={2} value={shortcutTrick} onChange={(e) => setShortcutTrick(e.target.value)} />
            </Field>
            <Field label={tx("आम गलती (वैकल्पिक)")}>
              <Textarea rows={2} value={commonMistake} onChange={(e) => setCommonMistake(e.target.value)} />
            </Field>
            <Field label={tx("समान अभ्यास प्रश्न (वैकल्पिक)")} hint={tx("हर लाइन एक प्रश्न")}>
              <Textarea rows={3} value={similarText} onChange={(e) => setSimilarText(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Output Solution */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-4 rounded-card border border-line bg-surface p-6 text-ink">
            <div className="space-y-1">
              {subject && <span className="text-caption font-semibold text-muted">{subject}</span>}
              <p className="text-body font-semibold whitespace-pre-wrap">{doubtText || tx("छात्र का प्रश्न यहाँ दिखेगा।")}</p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-card border border-success bg-success-subtle p-4">
              <div>
                <span className="text-caption font-semibold text-success">{tx("सही उत्तर")}</span>
                <p className="mt-1 text-title font-bold">{answer || "—"}</p>
              </div>
              <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
            </div>

            {steps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-label font-semibold">{tx("चरणबद्ध हल")}</h3>
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
                  {tx("शॉर्टकट ट्रिक")}
                </div>
                <p className="whitespace-pre-wrap">{shortcutTrick}</p>
              </div>
            )}

            {commonMistake.trim() && (
              <div className="flex items-start gap-2 rounded-card border border-danger bg-danger-subtle p-4 text-label">
                <AlertTriangle className="mt-1 size-4 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <span className="font-semibold">{tx("आम गलती:")} </span>
                  <span className="whitespace-pre-wrap">{commonMistake}</span>
                </div>
              </div>
            )}

            {similarQuestions.length > 0 && (
              <div className="space-y-2 border-t border-line pt-3">
                <h3 className="text-label font-semibold">{tx("समान अभ्यास प्रश्न")}</h3>
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
