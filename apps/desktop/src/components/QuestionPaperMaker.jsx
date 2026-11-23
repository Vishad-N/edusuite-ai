import React, { useState } from "react";
import { FileQuestion, Printer, Copy, Check, Sparkles, Sliders, Plus, Trash2 } from "lucide-react";
import { instituteLogo } from "../utils/branding.ts";
import { PAPER_MARKS } from "@edusuite/shared";
import { DocumentBar } from "./DocumentBar.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { Button, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";

const GRADES = ["MPPSC Pre + Mains", "SSC CGL / GD", "Vyapam / Sub-Inspector", "Class 10", "Class 12"];
const MARKS = [
  { value: 20, label: "20 (क्विक टेस्ट)" },
  { value: 40, label: "40 (यूनिट टेस्ट)" },
  { value: 50, label: "50 (मिड-टर्म)" },
  { value: 80, label: "80 (फुल बोर्ड)" },
];

const SECTION_NAMES = {
  mcq: `बहुविकल्पीय प्रश्न (${PAPER_MARKS.mcq} अंक प्रत्येक)`,
  short: `लघु उत्तरीय प्रश्न (${PAPER_MARKS.short} अंक प्रत्येक)`,
  long: `दीर्घ उत्तरीय / आंकिक प्रश्न (${PAPER_MARKS.long} अंक प्रत्येक)`,
};
const DIFFICULTIES = [
  { value: "mixed", label: "मिश्रित (आसान से कठिन)" },
  { value: "easy", label: "आसान" },
  { value: "medium", label: "मध्यम" },
  { value: "hard", label: "कठिन" },
];
const LANGUAGES = [
  { value: "hi", label: "हिन्दी" },
  { value: "en", label: "English" },
  { value: "both", label: "हिन्दी + English" },
];
const count = (v, max) => Math.max(0, Math.min(max, Math.trunc(Number(v) || 0)));

const blankQuestion = (mcq) => ({ q: "", options: mcq ? ["A) ", "B) ", "C) ", "D) "] : [], ans: "" });

/** A blank paper: one empty section to start from (no sample content, Phase 3). */
const blankSections = () => [{ name: "खंड A", questions: [blankQuestion(false)] }];

/** Lines the teacher left empty (or just "A) ") aren't real options. */
const realOptions = (options) => (options ?? []).map((o) => o.trim()).filter((o) => o && !/^[A-D]\)$/.test(o));

export default function QuestionPaperMaker({ activeInstitute }) {
  const [examTitle, setExamTitle] = useState("");
  const [grade, setGrade] = useState("Class 10");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("90 मिनट");
  const [totalMarks, setTotalMarks] = useState(40);
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [sections, setSections] = useState(blankSections);
  const [sectionIndex, setSectionIndex] = useState(0);
  // AI blueprint (DN-056): not part of the saved paper.
  const [topics, setTopics] = useState("");
  const [mcqCount, setMcqCount] = useState(10);
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(2);
  const [difficulty, setDifficulty] = useState("mixed");
  const [language, setLanguage] = useState("hi");
  const aiTotal = mcqCount + shortCount + longCount;
  const aiMarks = mcqCount * PAPER_MARKS.mcq + shortCount * PAPER_MARKS.short + longCount * PAPER_MARKS.long;

  /** Fills the editor from a paper_generate result; the teacher reviews it, unsaved. */
  const fillFromAi = (result) => {
    const letters = ["A", "B", "C", "D"];
    setSections(
      result.sections.map((s, i) => ({
        name: `खंड ${String.fromCharCode(65 + i)}: ${SECTION_NAMES[s.kind]}`,
        questions: s.questions.map((q) => ({ q: q.q, options: q.options.map((o, k) => `${letters[k]}) ${o}`), ans: q.answer })),
      })),
    );
    setSectionIndex(0);
    setTotalMarks(result.sections.reduce((sum, s) => sum + s.questions.length * PAPER_MARKS[s.kind], 0));
    if (!examTitle.trim()) setExamTitle(result.title);
    if (!docTitle.trim()) setDocTitle(result.title);
  };

  // What gets saved (shape: PaperContentSchema in packages/shared/documents.ts).
  const documentContent = {
    title: examTitle,
    grade,
    subject,
    duration,
    totalMarks,
    showAnswerKey,
    sections: sections.map((s) => ({
      name: s.name,
      questions: s.questions.map((q) => {
        const options = realOptions(q.options);
        return { q: q.q, ...(options.length > 0 && { options }), ...(q.ans.trim() && { ans: q.ans }) };
      }),
    })),
  };
  const paper = documentContent;

  // Free option: the usual three-section structure with empty questions for the teacher to fill.
  const handleGenerate = () => {
    setSections([
      { name: "खंड A: बहुविकल्पीय प्रश्न (1 अंक प्रत्येक)", questions: [blankQuestion(true), blankQuestion(true), blankQuestion(true)] },
      { name: "खंड B: लघु उत्तरीय प्रश्न (3 अंक प्रत्येक)", questions: [blankQuestion(false), blankQuestion(false)] },
      { name: "खंड C: दीर्घ उत्तरीय / आंकिक प्रश्न (5 अंक)", questions: [blankQuestion(false)] },
    ]);
    setSectionIndex(0);
    if (!docTitle.trim()) setDocTitle(examTitle.trim() || `${subject || "टेस्ट"} पेपर`);
  };

  const handleCopyCleanText = async () => {
    let clean = `${activeInstitute.name.toUpperCase()}\n`;
    clean += `${paper.title}\n`;
    clean += `Grade: ${grade} | Subject: ${subject} | Time: ${duration} | Max Marks: ${totalMarks}\n`;
    clean += `------------------------------------------------------------\n\n`;
    paper.sections.forEach((sec) => {
      clean += `${sec.name}\n\n`;
      sec.questions.forEach((q, idx) => {
        clean += `Q${idx + 1}. ${q.q}\n`;
        q.options?.forEach((opt) => (clean += `   ${opt}\n`));
        clean += `\n`;
      });
    });
    if (showAnswerKey) {
      clean += `\n========== ANSWER KEY & SOLUTIONS ==========\n\n`;
      paper.sections.forEach((sec) => {
        clean += `[${sec.name}]\n`;
        sec.questions.forEach((q, idx) => (clean += `Ans ${idx + 1}: ${q.ans ?? ""}\n`));
        clean += `\n`;
      });
    }
    await navigator.clipboard.writeText(clean);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const updateSection = (index, next) => setSections((all) => all.map((s, i) => (i === index ? next : s)));
  const currentSection = sections[sectionIndex] ?? sections[0];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileQuestion className="size-6" />}
        title="परीक्षा पेपर & आंसर-की मेकर"
        badge="Print / Word Ready"
        description="सेक्शन-वार MCQ, लघु एवं दीर्घ उत्तरीय प्रश्न और आंसर-की के साथ टेस्ट पेपर बनाएँ, सेव करें और बाद में फिर से खोलें।"
        actions={
          <>
            <Button icon={copiedText ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={() => void handleCopyCleanText()}>
              {copiedText ? "वर्ड के लिए कॉपी हो गया!" : "वर्ड के लिए कॉपी करें"}
            </Button>
            <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              टेस्ट पेपर प्रिंट करें (PDF)
            </Button>
          </>
        }
      />

      <DocumentBar
        type="paper"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={documentContent}
        onOpen={(content) => {
          setExamTitle(content.title);
          if (content.grade) setGrade(content.grade);
          setSubject(content.subject ?? "");
          setDuration(content.duration ?? "");
          if (content.totalMarks !== undefined) setTotalMarks(content.totalMarks);
          setShowAnswerKey(content.showAnswerKey ?? true);
          setSections(
            content.sections.length > 0
              ? content.sections.map((s) => ({
                  name: s.name,
                  questions: s.questions.map((q) => ({ q: q.q, options: q.options ?? [], ans: q.ans ?? "" })),
                }))
              : blankSections(),
          );
          setSectionIndex(0);
        }}
        onNew={() => {
          setExamTitle("");
          setSubject("");
          setDuration("90 मिनट");
          setTotalMarks(40);
          setShowAnswerKey(true);
          setDocTitle("");
          setSections(blankSections());
          setSectionIndex(0);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings and question editor */}
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="flex items-center gap-2 text-label font-semibold">
              <Sliders className="size-4" aria-hidden="true" />
              परीक्षा ब्लूप्रिंट एवं सेटिंग्स
            </h3>
            <Field label="परीक्षा / टेस्ट का नाम">
              <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="उदा. मिड-टर्म परीक्षा 2026" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="लक्षित क्लास / बैच">
                <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {(GRADES.includes(grade) ? GRADES : [grade, ...GRADES]).map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              </Field>
              <Field label="विषय">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="उदा. रसायन विज्ञान" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="अधिकतम अंक">
                <Select value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))}>
                  {(MARKS.some((m) => m.value === totalMarks) ? MARKS : [{ value: totalMarks, label: `${totalMarks} अंक` }, ...MARKS]).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="समय">
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-control border border-line p-3 text-label">
              आंसर-की और हल शामिल करें
              <input type="checkbox" checked={showAnswerKey} onChange={(e) => setShowAnswerKey(e.target.checked)} className="size-4" />
            </label>
            <div className="space-y-3 rounded-control border border-line p-3">
              <p className="text-label font-semibold">AI से पेपर बनाएँ</p>
              <Field label="कौन-से अध्याय / टॉपिक" hint="जैसे: अम्ल, क्षार और लवण; pH स्केल">
                <Textarea rows={2} value={topics} maxLength={1000} onChange={(e) => setTopics(e.target.value)} />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="MCQ">
                  <Input type="number" min={0} max={50} value={mcqCount} onChange={(e) => setMcqCount(count(e.target.value, 50))} />
                </Field>
                <Field label="लघु उत्तरीय">
                  <Input type="number" min={0} max={30} value={shortCount} onChange={(e) => setShortCount(count(e.target.value, 30))} />
                </Field>
                <Field label="दीर्घ उत्तरीय">
                  <Input type="number" min={0} max={10} value={longCount} onChange={(e) => setLongCount(count(e.target.value, 10))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="कठिनाई">
                  <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    {DIFFICULTIES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="भाषा">
                  <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <p className="text-caption text-muted">
                कुल {aiTotal} प्रश्न · {aiMarks} अंक (MCQ {PAPER_MARKS.mcq}, लघु {PAPER_MARKS.short}, दीर्घ {PAPER_MARKS.long} अंक प्रति प्रश्न)
                {(aiTotal < 1 || aiTotal > 60) && <span className="text-danger"> · 1 से 60 प्रश्न चुनें</span>}
              </p>
              <AiGenerate
                label="AI से पेपर बनाएँ"
                build={() =>
                  subject.trim().length >= 2 && topics.trim().length >= 2 && aiTotal >= 1 && aiTotal <= 60
                    ? {
                        type: "paper_generate",
                        input: {
                          subject: subject.trim(),
                          ...(grade.trim() && { grade: grade.trim() }),
                          topics: topics.trim(),
                          mcqCount,
                          shortCount,
                          longCount,
                          difficulty,
                          language,
                        },
                      }
                    : null
                }
                onResult={fillFromAi}
                hint="पहले विषय और टॉपिक लिखें। AI के प्रश्न और आंसर-की संपादक में भरे जाएँगे, सेव नहीं होंगे; प्रिंट से पहले जाँच लें।"
              />
            </div>
            <Button className="w-full" icon={<Sparkles className="size-4" />} onClick={handleGenerate}>
              खाली पेपर ढाँचा बनाएँ (मुफ़्त)
            </Button>
          </div>

          <SectionEditor
            sections={sections}
            index={sectionIndex}
            section={currentSection}
            onSelect={setSectionIndex}
            onChange={(next) => updateSection(sectionIndex, next)}
            onAddSection={() => {
              setSections((all) => [...all, { name: `खंड ${String.fromCharCode(65 + all.length)}`, questions: [blankQuestion(false)] }]);
              setSectionIndex(sections.length);
            }}
            onDeleteSection={() => {
              setSections((all) => all.filter((_, i) => i !== sectionIndex));
              setSectionIndex((i) => Math.max(0, i - 1));
            }}
          />
        </div>

        {/* Paper Document Preview (Clean White Academic Paper) */}
        <div className="lg:col-span-7 bg-white text-slate-900 rounded-2xl p-6 md:p-10 shadow-2xl border border-slate-200 min-h-[500px] overflow-y-auto max-h-[700px] select-text">
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src={instituteLogo(activeInstitute)}
                alt=""
                className="w-12 h-12 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400 shadow"
              />
              <div className="text-left">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-slate-950">{activeInstitute.name}</h2>
                <p className="text-[11px] text-slate-600 font-medium">{activeInstitute.tagline} • Session 2026-27</p>
              </div>
            </div>
            <div className="mt-3 text-sm font-bold uppercase tracking-wider text-slate-900 bg-slate-100 py-1 rounded">
              {paper.title || "परीक्षा का नाम"}
            </div>

            {/* Meta Row */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mt-3 pt-2 border-t border-slate-300">
              <span>
                Grade: {grade}
                {subject && ` (${subject})`}
              </span>
              <span>Time: {duration}</span>
              <span>Max Marks: {totalMarks}</span>
            </div>
          </div>

          {/* General Instructions */}
          <div className="text-[11px] text-slate-700 mb-6 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>General Instructions:</strong> All questions are compulsory. Marks for each section are shown in its
            heading. Use of electronic calculators is prohibited.
          </div>

          {/* Questions Sections */}
          <div className="space-y-6">
            {paper.sections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2.5 py-1 rounded border-l-4 border-slate-800">
                  {sec.name}
                </div>
                <div className="space-y-3 pl-2">
                  {sec.questions.map((q, qIdx) => (
                    <div key={qIdx} className="text-xs text-slate-800 leading-relaxed">
                      <div className="font-semibold whitespace-pre-wrap">
                        Q{qIdx + 1}. {q.q}
                      </div>
                      {q.options && (
                        <div className="grid grid-cols-2 gap-1.5 mt-1.5 pl-3 text-slate-700">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx}>{opt}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Answer Key & Solutions if toggled */}
          {showAnswerKey && (
            <div className="mt-10 pt-6 border-t-2 border-dashed border-emerald-600">
              <div className="text-xs font-bold uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded inline-block mb-4">
                Teacher's Solutions & Evaluation Key
              </div>
              <div className="space-y-4">
                {paper.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-700">{sec.name}</div>
                    {sec.questions.map((q, qIdx) => (
                      <div key={qIdx} className="text-xs bg-slate-50 p-2 rounded border border-slate-200 text-slate-800 whitespace-pre-wrap">
                        <span className="font-bold text-emerald-700">Ans Q{qIdx + 1}:</span> {q.ans}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Edits one section: its heading and its questions (text, options one per line, answer). */
function SectionEditor({ sections, index, section, onSelect, onChange, onAddSection, onDeleteSection }) {
  const setQuestion = (qIndex, next) => onChange({ ...section, questions: section.questions.map((q, i) => (i === qIndex ? next : q)) });
  return (
    <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-label font-semibold">प्रश्न लिखें</h3>
        <div className="flex gap-2">
          <Button size="sm" icon={<Plus className="size-4" />} onClick={onAddSection} disabled={sections.length >= 20}>
            नया खंड
          </Button>
          <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={onDeleteSection} disabled={sections.length <= 1}>
            खंड हटाएँ
          </Button>
        </div>
      </div>
      <Field label="खंड चुनें">
        <Select value={index} onChange={(e) => onSelect(Number(e.target.value))}>
          {sections.map((s, i) => (
            <option key={i} value={i}>
              {i + 1}. {s.name || "बिना नाम का खंड"}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="खंड का शीर्षक">
        <Input value={section.name} onChange={(e) => onChange({ ...section, name: e.target.value })} />
      </Field>

      <ol className="space-y-3">
        {section.questions.map((q, qIndex) => (
          <li key={qIndex} className="space-y-2 rounded-control border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label font-semibold">प्रश्न {qIndex + 1}</span>
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="size-4" />}
                aria-label={`प्रश्न ${qIndex + 1} हटाएँ`}
                disabled={section.questions.length <= 1}
                onClick={() => onChange({ ...section, questions: section.questions.filter((_, i) => i !== qIndex) })}
              >
                हटाएँ
              </Button>
            </div>
            <Field label={`प्रश्न ${qIndex + 1} का पाठ`}>
              <Textarea rows={2} value={q.q} onChange={(e) => setQuestion(qIndex, { ...q, q: e.target.value })} />
            </Field>
            <Field label="विकल्प (वैकल्पिक)" hint="हर लाइन एक विकल्प; MCQ न हो तो खाली छोड़ें">
              <Textarea
                rows={4}
                value={q.options.join("\n")}
                onChange={(e) => setQuestion(qIndex, { ...q, options: e.target.value === "" ? [] : e.target.value.split("\n") })}
              />
            </Field>
            <Field label="उत्तर / हल">
              <Textarea rows={2} value={q.ans} onChange={(e) => setQuestion(qIndex, { ...q, ans: e.target.value })} />
            </Field>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => onChange({ ...section, questions: [...section.questions, blankQuestion(false)] })}>
          नया प्रश्न
        </Button>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => onChange({ ...section, questions: [...section.questions, blankQuestion(true)] })}>
          नया MCQ
        </Button>
      </div>
    </div>
  );
}
