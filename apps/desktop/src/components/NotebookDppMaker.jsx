import React, { useState } from "react";
import { FileSpreadsheet, Printer, Plus, Trash2 } from "lucide-react";
import { instituteLogo } from "../utils/branding.ts";
import { DppGenerateResultSchema } from "@edusuite/shared";
import { DocumentBar } from "./DocumentBar.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { Button, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";

const TEMPLATES = [
  { id: "dpp", label: "📝 डेली प्रैक्टिस पेपर (DPP)" },
  { id: "notebook", label: "📓 छात्र क्लास नोटबुक पेज" },
  { id: "omr", label: "⭕ 50/100 प्रश्नों की OMR शीट" },
];

const blankQuestion = () => ({ q: "", hint: "" });

export default function NotebookDppMaker({ activeInstitute }) {
  const [templateType, setTemplateType] = useState("dpp"); // "dpp" | "notebook" | "omr"
  const [dppSubject, setDppSubject] = useState("");
  const [dppTopic, setDppTopic] = useState("");
  const [targetBatch, setTargetBatch] = useState("");
  const [omrQuestionsCount, setOmrQuestionsCount] = useState(50); // 50 or 100
  const [questions, setQuestions] = useState(() => [blankQuestion()]);
  const [docTitle, setDocTitle] = useState("");
  // AI options (DN-058); not part of the saved sheet.
  const [aiCount, setAiCount] = useState(10);
  const [aiStyle, setAiStyle] = useState("mcq");
  const [aiDifficulty, setAiDifficulty] = useState("mixed");
  const [aiLanguage, setAiLanguage] = useState("hi");

  /** Adds the AI's questions after any the teacher already wrote (nothing is lost after paying), unsaved. */
  const fillFromAi = (result) => {
    const parsed = DppGenerateResultSchema.safeParse(result);
    if (!parsed.success) return;
    setQuestions((all) => [...all.filter((q) => q.q.trim() || q.hint.trim()), ...parsed.data.questions.map((q) => ({ q: q.q, hint: q.hint }))].slice(0, 200));
    if (!docTitle.trim()) setDocTitle(dppTopic.trim());
  };

  // What gets saved (shape: DppContentSchema in packages/shared/documents.ts).
  const documentContent = {
    templateType,
    subject: dppSubject,
    topic: dppTopic,
    targetBatch,
    omrQuestionsCount,
    questions: questions.map((item) => ({ q: item.q, ...(item.hint.trim() && { hint: item.hint }) })),
  };

  const setQuestion = (index, next) => setQuestions((all) => all.map((item, i) => (i === index ? next : item)));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileSpreadsheet className="size-6" />}
        title="डेली DPP, स्टूडेंट नोटबुक & OMR स्टूडियो"
        badge="डेली प्रैक्टिस मटेरियल"
        description="क्लास में बाँटने के लिए DPP शीट, कॉर्नेल नोटबुक पेज और ऑफ़लाइन टेस्ट के लिए 50/100 प्रश्नों की OMR शीट बनाएँ, सेव करें और बाद में फिर से खोलें।"
        actions={
          <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
            शीट प्रिंट करें (PDF)
          </Button>
        }
      />

      <DocumentBar
        type="dpp"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={documentContent}
        onOpen={(content) => {
          setTemplateType(content.templateType);
          setDppSubject(content.subject);
          setDppTopic(content.topic);
          setTargetBatch(content.targetBatch ?? "");
          setOmrQuestionsCount(content.omrQuestionsCount ?? 50);
          setQuestions(
            content.questions.length > 0 ? content.questions.map((item) => ({ q: item.q, hint: item.hint ?? "" })) : [blankQuestion()],
          );
        }}
        onNew={() => {
          setTemplateType("dpp");
          setDppSubject("");
          setDppTopic("");
          setTargetBatch("");
          setOmrQuestionsCount(50);
          setQuestions([blankQuestion()]);
          setDocTitle("");
        }}
      />

      {/* Switcher: DPP vs Notebook vs OMR */}
      <div role="group" aria-label="शीट का प्रकार" className="flex flex-wrap items-center gap-2 no-print">
        {TEMPLATES.map((t) => (
          <Button key={t.id} variant={templateType === t.id ? "primary" : "secondary"} aria-pressed={templateType === t.id} onClick={() => setTemplateType(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Controls */}
        <div className="lg:col-span-4 space-y-4 no-print">
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="text-label font-semibold">शीट सेटिंग्स</h3>
            <Field label="टॉपिक एवं नंबर">
              <Input value={dppTopic} onChange={(e) => setDppTopic(e.target.value)} placeholder="उदा. प्रतिशत एवं लाभ-हानि DPP #14" />
            </Field>
            <Field label="विषय">
              <Input value={dppSubject} onChange={(e) => setDppSubject(e.target.value)} placeholder="उदा. गणित एवं तर्कशक्ति" />
            </Field>
            <Field label="लक्षित बैच">
              <Input value={targetBatch} onChange={(e) => setTargetBatch(e.target.value)} placeholder="उदा. MPPSC Pre 2026" />
            </Field>
            {templateType === "omr" && (
              <Field label="प्रश्नों की संख्या (OMR)">
                <Select value={omrQuestionsCount} onChange={(e) => setOmrQuestionsCount(Number(e.target.value))}>
                  {[50, 100].includes(omrQuestionsCount) ? null : <option value={omrQuestionsCount}>{omrQuestionsCount} प्रश्न</option>}
                  <option value={50}>50 प्रश्न (क्लास टेस्ट / क्विज)</option>
                  <option value={100}>100 प्रश्न (फुल मॉक टेस्ट)</option>
                </Select>
              </Field>
            )}
            {templateType === "notebook" && (
              <p className="text-caption text-muted">
                कॉर्नेल नोट-टेकिंग फॉर्मेट छात्रों को क्लास में व्यवस्थित नोट्स लेने एवं रिवीजन के लिए लेआउट देता है।
              </p>
            )}
          </div>

          {templateType === "dpp" && (
            <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
              <h3 className="text-label font-semibold">DPP के प्रश्न</h3>
              <div className="space-y-3 rounded-control border border-line p-3">
                <p className="text-label font-semibold">AI से DPP बनाएँ</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="कितने प्रश्न">
                    <Input type="number" min={3} max={50} value={aiCount} onChange={(e) => setAiCount(Math.max(3, Math.min(50, Math.trunc(Number(e.target.value) || 3))))} />
                  </Field>
                  <Field label="प्रश्न का प्रकार">
                    <Select value={aiStyle} onChange={(e) => setAiStyle(e.target.value)}>
                      <option value="mcq">सभी MCQ</option>
                      <option value="short">लघु / आंकिक</option>
                      <option value="mixed">मिश्रित</option>
                    </Select>
                  </Field>
                  <Field label="कठिनाई">
                    <Select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                      <option value="mixed">आसान से कठिन</option>
                      <option value="easy">आसान</option>
                      <option value="medium">मध्यम</option>
                      <option value="hard">कठिन</option>
                    </Select>
                  </Field>
                  <Field label="भाषा">
                    <Select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}>
                      <option value="hi">हिन्दी</option>
                      <option value="en">English</option>
                      <option value="both">हिन्दी + English</option>
                    </Select>
                  </Field>
                </div>
                <AiGenerate
                  label="AI से प्रश्न बनाएँ"
                  build={() =>
                    dppSubject.trim().length >= 2 && dppTopic.trim().length >= 2
                      ? {
                          type: "dpp_generate",
                          input: {
                            subject: dppSubject.trim(),
                            topic: dppTopic.trim(),
                            ...(targetBatch.trim() && { targetBatch: targetBatch.trim() }),
                            count: aiCount,
                            style: aiStyle,
                            difficulty: aiDifficulty,
                            language: aiLanguage,
                          },
                        }
                      : null
                  }
                  onResult={fillFromAi}
                  hint="पहले टॉपिक और विषय लिखें। AI के प्रश्न आपके लिखे प्रश्नों के बाद जुड़ते हैं। उत्तर और संकेत केवल शिक्षक के लिए “संकेत” में आते हैं, शीट पर प्रिंट नहीं होते।"
                />
              </div>
              <p className="text-caption text-muted">या प्रश्न खुद लिखें।</p>
              <ol className="space-y-3">
                {questions.map((item, index) => (
                  <li key={index} className="space-y-2 rounded-control border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label font-semibold">प्रश्न {index + 1}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 className="size-4" />}
                        aria-label={`प्रश्न ${index + 1} हटाएँ`}
                        disabled={questions.length <= 1}
                        onClick={() => setQuestions((all) => all.filter((_, i) => i !== index))}
                      >
                        हटाएँ
                      </Button>
                    </div>
                    <Field label={`प्रश्न ${index + 1} का पाठ`}>
                      <Textarea rows={2} value={item.q} onChange={(e) => setQuestion(index, { ...item, q: e.target.value })} />
                    </Field>
                    <Field label="संकेत / शॉर्टकट (वैकल्पिक)" hint="शिक्षक के लिए; शीट पर प्रिंट नहीं होता">
                      <Input value={item.hint} onChange={(e) => setQuestion(index, { ...item, hint: e.target.value })} />
                    </Field>
                  </li>
                ))}
              </ol>
              <Button size="sm" icon={<Plus className="size-4" />} disabled={questions.length >= 200} onClick={() => setQuestions((all) => [...all, blankQuestion()])}>
                नया प्रश्न
              </Button>
            </div>
          )}
        </div>

        {/* Right Printable Canvas */}
        <div className="lg:col-span-8 bg-white text-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 min-h-[500px] overflow-y-auto max-h-[700px] select-text">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={instituteLogo(activeInstitute)}
                alt=""
                className="w-11 h-11 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400 shadow"
              />
              <div>
                <h2 className="text-base font-black uppercase text-slate-950 tracking-wider">{activeInstitute.name}</h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  {activeInstitute.city}
                  {dppSubject && ` • ${dppSubject}`}
                </p>
              </div>
            </div>

            <div className="text-right text-[10px] font-bold uppercase text-slate-700 border border-slate-300 px-2.5 py-1 rounded">
              {templateType === "dpp" ? "DAILY PRACTICE PAPER" : templateType === "omr" ? "OMR ANSWER SHEET" : "STUDENT CLASS NOTEBOOK"}
            </div>
          </div>

          {/* Student Meta Row */}
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 mb-5">
            <div>
              <span className="text-slate-500">Name:</span> ________________
            </div>
            <div>
              <span className="text-slate-500">Roll No:</span> ____________
            </div>
            <div>
              <span className="text-slate-500">Batch:</span> {targetBatch || "____________"}
            </div>
            <div>
              <span className="text-slate-500">Date:</span> ___/___/______
            </div>
          </div>

          {/* VIEW A: DPP QUESTIONS */}
          {templateType === "dpp" && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200 flex items-center justify-between text-xs font-bold text-amber-900">
                <span>{dppTopic || "DPP"}</span>
                <span>प्रश्न: {questions.length}</span>
              </div>

              <div className="space-y-4">
                {questions.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="font-semibold text-slate-900 whitespace-pre-wrap">
                      Q{idx + 1}. {item.q}
                    </div>
                    {/* Rough work space */}
                    <div className="h-14 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[10px] text-slate-500">
                      [Space for Rough Work / Calculation]
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t-2 border-slate-300 flex items-center justify-end text-xs text-slate-600">
                <div className="font-bold border-t border-slate-400 pt-1">Faculty Signature</div>
              </div>
            </div>
          )}

          {/* VIEW B: OMR ANSWER SHEET */}
          {templateType === "omr" && (
            <div className="space-y-4">
              <div className="text-center text-[11px] font-bold text-slate-700 bg-slate-100 p-2 rounded border border-slate-200">
                USE BLUE / BLACK BALLPOINT PEN ONLY • DARKEN THE BUBBLES COMPLETELY
              </div>

              {/* 50 or 100 Bubbles Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {Array.from({ length: omrQuestionsCount }).map((_, qIdx) => (
                  <div key={qIdx} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200 text-[11px]">
                    <span className="font-bold text-slate-800 w-6">{qIdx + 1}.</span>
                    <div className="flex items-center gap-1">
                      {["A", "B", "C", "D"].map((opt) => (
                        <div
                          key={opt}
                          className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-700 select-none"
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
                <div>Candidate's Signature: __________________</div>
                <div>Invigilator's Stamp: __________________</div>
              </div>
            </div>
          )}

          {/* VIEW C: CORNELL NOTEBOOK PAGE */}
          {templateType === "notebook" && (
            <div className="space-y-4">
              {dppTopic && <div className="text-xs font-bold text-slate-800">Topic: {dppTopic}</div>}
              <div className="grid grid-cols-12 gap-3 min-h-[380px]">
                {/* Cue column */}
                <div className="col-span-4 border-r-2 border-slate-300 pr-2 space-y-4">
                  <div className="text-xs font-bold uppercase text-slate-700 border-b border-slate-200 pb-1">Cues / Keywords / Dates</div>
                  <div className="space-y-6 pt-2 text-[11px] text-slate-500">
                    <p>• Key Concept 1</p>
                    <p>• Formula / Law</p>
                    <p>• High-Yield Question</p>
                    <p>• Exam Warning</p>
                  </div>
                </div>

                {/* Notes Column */}
                <div className="col-span-8 space-y-4">
                  <div className="text-xs font-bold uppercase text-slate-700 border-b border-slate-200 pb-1">Class Notes & Lecture Explanations</div>
                  {/* Ruled lines */}
                  <div className="space-y-5 pt-1">
                    {Array.from({ length: 8 }).map((_, l) => (
                      <div key={l} className="border-b border-slate-200 h-4"></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Block */}
              <div className="border-t-2 border-slate-800 pt-3">
                <div className="text-xs font-bold uppercase text-slate-800 mb-1">Summary / 1-Minute Revision Capsule:</div>
                <div className="h-16 border border-dashed border-slate-300 rounded bg-slate-50 p-2 text-[11px] text-slate-500">
                  Write the core 2-line takeaway of today's lecture here...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
