import React, { useState } from "react";
import { BookOpen, Sparkles, Printer, Copy, Check, CheckCircle2, FileCheck, Plus, Trash2 } from "lucide-react";
import { DocumentBar } from "./DocumentBar.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { LessonPlanOutputSchema } from "@edusuite/shared";
import { Button, ConfirmDialog, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";
import { tx } from "../i18n/index.ts";

const DURATIONS = () => ([
  { value: 3, label: tx("3 दिन (क्रैश मॉड्यूल)") },
  { value: 5, label: tx("5 दिन (सामान्य 1 सप्ताह)") },
  { value: 8, label: tx("8 दिन (विस्तृत)") },
]);

const blankDay = (n) => ({ day: tx("दिन {0}", [n]), topic: "", activities: "", homework: "" });

export default function LessonPlanner({ activeInstitute }) {
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [grade, setGrade] = useState("");
  const [durationDays, setDurationDays] = useState(5);
  const [objectivesText, setObjectivesText] = useState("");
  const [schedule, setSchedule] = useState(() => [blankDay(1)]);
  const [dayIndex, setDayIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  const objectives = objectivesText
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

  // What gets saved (shape: LessonContentSchema in packages/shared/documents.ts).
  const documentContent = { chapter, subject, grade, durationDays, objectives, schedule };

  // Free option: one empty day per teaching day for the teacher to fill.
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  const hasWrittenDays = schedule.some((d) => d.topic.trim() || d.activities.trim() || d.homework.trim());

  // AI plan (DN-059): replaces objectives and days, so it asks first when either is written.
  const [focus, setFocus] = useState("");
  const [aiLanguage, setAiLanguage] = useState("hi");
  const fillFromAi = (result) => {
    const parsed = LessonPlanOutputSchema.safeParse(result);
    if (!parsed.success) return;
    setObjectivesText(parsed.data.objectives.join("\n"));
    setSchedule(parsed.data.days.map((d, i) => ({ day: tx("दिन {0}", [i + 1]), ...d })));
    setDayIndex(0);
    if (!docTitle.trim() && chapter.trim()) setDocTitle(chapter.trim());
  };
  const handleTemplate = () => {
    setConfirmTemplate(false);
    setSchedule(Array.from({ length: durationDays }, (_, i) => blankDay(i + 1)));
    setDayIndex(0);
    if (!docTitle.trim() && chapter.trim()) setDocTitle(chapter.trim());
  };

  const handleCopy = async () => {
    let clean = `LESSON PLAN: ${chapter} (${subject}${grade ? ` - ${grade}` : ""})\n`;
    clean += `Institute: ${activeInstitute.name}\n\n`;
    clean += `LEARNING OBJECTIVES:\n`;
    objectives.forEach((obj, i) => (clean += `${i + 1}. ${obj}\n`));
    clean += `\nDAY-WISE TEACHING TIMELINE:\n`;
    schedule.forEach((s) => {
      clean += `\n[${s.day}]: ${s.topic}\nActivity: ${s.activities}\nHomework: ${s.homework}\n`;
    });
    await navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentDay = schedule[dayIndex] ?? schedule[0];
  const setCurrentDay = (next) => setSchedule((all) => all.map((d, i) => (i === dayIndex ? next : d)));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookOpen className="size-6" />}
        title={tx("लेसन प्लान & टीचर नोट्स")}
        badge="Pedagogy"
        description={tx("अध्याय के सीखने के लक्ष्य, दिन-वार कक्षा गतिविधियाँ और होमवर्क लिखें, सेव करें और बाद में फिर से खोलें।")}
        actions={
          <>
            <Button icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={() => void handleCopy()}>
              {copied ? tx("कॉपी हो गया!") : tx("लेसन प्लान कॉपी करें")}
            </Button>
            <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              {tx("प्रिंट करें")}
            </Button>
          </>
        }
      />

      <DocumentBar
        type="lesson"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={documentContent}
        onOpen={(content) => {
          setChapter(content.chapter);
          setSubject(content.subject);
          setGrade(content.grade ?? "");
          setDurationDays(content.durationDays ?? 5);
          setObjectivesText(content.objectives.join("\n"));
          setSchedule(content.schedule.length > 0 ? content.schedule : [blankDay(1)]);
          setDayIndex(0);
        }}
        onNew={() => {
          setChapter("");
          setSubject("");
          setGrade("");
          setDurationDays(5);
          setObjectivesText("");
          setSchedule([blankDay(1)]);
          setDayIndex(0);
          setDocTitle("");
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="text-label font-semibold">{tx("पाठ्यक्रम की जानकारी")}</h3>
            <Field label={tx("अध्याय / यूनिट")}>
              <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder={tx("उदा. विद्युत चुंबकीय प्रेरण")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tx("विषय")}>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tx("उदा. भौतिकी")} />
              </Field>
              <Field label={tx("क्लास / बैच")}>
                <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={tx("उदा. कक्षा 12")} />
              </Field>
            </div>
            <Field label={tx("पढ़ाने के कुल दिन")}>
              <Select value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))}>
                {(DURATIONS().some((d) => d.value === durationDays) ? DURATIONS() : [{ value: durationDays, label: tx("{0} दिन", [durationDays]) }, ...DURATIONS()]).map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="space-y-3 rounded-control border border-line p-3">
              <p className="text-label font-semibold">{tx("AI से लेसन प्लान बनाएँ")}</p>
              <Field label={tx("किस पर ज़ोर दें (वैकल्पिक)")} hint={tx("जैसे: परीक्षा के आंकिक प्रश्न, प्रयोग, कमज़ोर छात्रों के लिए दोहराव")}>
                <Input value={focus} maxLength={500} onChange={(e) => setFocus(e.target.value)} />
              </Field>
              <Field label={tx("भाषा")}>
                <Select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}>
                  <option value="hi">{tx("हिन्दी")}</option>
                  <option value="en">English</option>
                  <option value="both">{tx("हिन्दी + English शब्द")}</option>
                </Select>
              </Field>
              <AiGenerate
                label={tx("AI से लेसन प्लान बनाएँ")}
                build={() =>
                  chapter.trim().length >= 2 && subject.trim().length >= 2
                    ? {
                        type: "lesson_plan",
                        input: {
                          chapter: chapter.trim(),
                          subject: subject.trim(),
                          ...(grade.trim() && { grade: grade.trim() }),
                          days: Math.min(30, durationDays),
                          ...(focus.trim() && { focus: focus.trim() }),
                          language: aiLanguage,
                        },
                      }
                    : null
                }
                confirmReplace={
                  hasWrittenDays || objectives.length > 0
                    ? { title: tx("लिखी योजना बदल जाएगी"), message: tx("AI का लेसन प्लान अभी लिखे सीखने के लक्ष्य और दिन-वार योजना की जगह ले लेगा।") }
                    : null
                }
                onResult={fillFromAi}
                hint={tx("पहले अध्याय, विषय और दिन चुनें। AI की योजना भरी जाएगी, सेव नहीं होगी; जाँचकर बदलें।")}
              />
            </div>
            <Button className="w-full" icon={<Sparkles className="size-4" />} onClick={() => (hasWrittenDays ? setConfirmTemplate(true) : handleTemplate())}>
              {tx("खाली दिन-वार ढाँचा बनाएँ (मुफ़्त)")}
            </Button>
            <ConfirmDialog
              open={confirmTemplate}
              title={tx("लिखे हुए दिन हट जाएँगे")}
              message={tx("नया ढाँचा {0} खाली दिन बनाएगा और अभी लिखी दिन-वार योजना हटा देगा। आगे बढ़ें?", [durationDays])}
              confirmLabel={tx("हाँ, नया ढाँचा बनाएँ")}
              tone="danger"
              onConfirm={handleTemplate}
              onCancel={() => setConfirmTemplate(false)}
            />
            <Field label={tx("सीखने के लक्ष्य")} hint={tx("हर लाइन एक लक्ष्य")}>
              <Textarea rows={4} value={objectivesText} onChange={(e) => setObjectivesText(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-label font-semibold">{tx("दिन-वार योजना लिखें")}</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  icon={<Plus className="size-4" />}
                  disabled={schedule.length >= 365}
                  onClick={() => {
                    setSchedule((all) => [...all, blankDay(all.length + 1)]);
                    setDayIndex(schedule.length);
                  }}
                >
                  {tx("नया दिन")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="size-4" />}
                  disabled={schedule.length <= 1}
                  onClick={() => {
                    setSchedule((all) => all.filter((_, i) => i !== dayIndex));
                    setDayIndex((i) => Math.max(0, i - 1));
                  }}
                >
                  {tx("दिन हटाएँ")}
                </Button>
              </div>
            </div>
            <Field label={tx("दिन चुनें")}>
              <Select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}>
                {schedule.map((d, i) => (
                  <option key={i} value={i}>
                    {d.day || tx("दिन {0}", [i + 1])}
                    {d.topic && ` · ${d.topic}`}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={tx("दिन / पीरियड")}>
                <Input value={currentDay.day} onChange={(e) => setCurrentDay({ ...currentDay, day: e.target.value })} />
              </Field>
              <Field label={tx("टॉपिक")} className="sm:col-span-2">
                <Input value={currentDay.topic} onChange={(e) => setCurrentDay({ ...currentDay, topic: e.target.value })} />
              </Field>
            </div>
            <Field label={tx("कक्षा गतिविधियाँ")}>
              <Textarea rows={3} value={currentDay.activities} onChange={(e) => setCurrentDay({ ...currentDay, activities: e.target.value })} />
            </Field>
            <Field label={tx("होमवर्क / अभ्यास")}>
              <Textarea rows={2} value={currentDay.homework} onChange={(e) => setCurrentDay({ ...currentDay, homework: e.target.value })} />
            </Field>
          </div>
        </div>

        {/* Display Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-5 rounded-card border border-line bg-surface p-6 text-ink">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-control border border-line bg-page px-2 py-0.5 text-caption font-semibold text-muted">
                  {[subject, grade].filter(Boolean).join(" • ") || tx("विषय • क्लास")}
                </span>
                <span className="text-caption text-muted">{activeInstitute.name}</span>
              </div>
              <h2 className="mt-1 text-title font-bold">{chapter || tx("अध्याय का नाम")}</h2>
            </div>

            {/* Learning Objectives Box */}
            <div className="space-y-2 rounded-card border border-line bg-page p-4">
              <div className="flex items-center gap-2 text-label font-semibold">
                <FileCheck className="size-4" aria-hidden="true" />
                {tx("सीखने के लक्ष्य")}
              </div>
              {objectives.length === 0 ? (
                <p className="text-caption text-muted">{tx("अभी कोई लक्ष्य नहीं लिखा।")}</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 text-label md:grid-cols-2">
                  {objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Day Wise Timeline Cards */}
            <div className="space-y-3">
              <div className="text-label font-semibold text-muted">{tx("दिन-वार योजना")}</div>
              {schedule.map((item, idx) => (
                <div key={idx} className="space-y-2 rounded-card border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-label font-bold">{item.day}</span>
                    <span className="text-label font-semibold">{item.topic}</span>
                  </div>
                  {item.activities && (
                    <p className="text-label whitespace-pre-wrap">
                      <strong>{tx("कक्षा में:")}</strong> {item.activities}
                    </p>
                  )}
                  {item.homework && (
                    <p className="rounded-control border border-line bg-accent-subtle p-2 text-label whitespace-pre-wrap">
                      <strong>{tx("होमवर्क / अभ्यास:")}</strong> {item.homework}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
