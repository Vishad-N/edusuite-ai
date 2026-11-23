import React, { useState } from "react";
import { BookMarked, Printer, Copy, Check, Sparkles, FileText, Sliders, Bookmark, Plus, Trash2 } from "lucide-react";
import { SATYADHI_LOGO } from "../utils/mediaHelper";
import { DocumentBar } from "./DocumentBar.tsx";
import { Button, ConfirmDialog, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";

const COVER_THEMES = [
  { id: "amber", label: "गोल्डन फ्लेम", swatch: "bg-amber-400", gradient: "from-slate-950 via-slate-900 to-amber-900", accent: "text-amber-300" },
  { id: "navy", label: "रॉयल नेवी", swatch: "bg-blue-600", gradient: "from-slate-950 via-blue-950 to-indigo-900", accent: "text-sky-300" },
  { id: "emerald", label: "फॉरेस्ट ग्रीन", swatch: "bg-emerald-600", gradient: "from-slate-950 via-emerald-950 to-teal-900", accent: "text-emerald-300" },
];
const CHAPTER_COUNTS = [3, 5, 8];

const lines = (value) =>
  value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
/** Theory is typed as paragraphs separated by a blank line. */
const paragraphs = (value) =>
  value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const blankQuestion = () => ({ q: "", optionsText: "", ans: "" });
const blankChapter = (n) => ({ title: `अध्याय ${n}`, subtitle: "", theoryText: "", highlightsText: "", practice: [] });
const chapterHasContent = (ch) =>
  ch.subtitle.trim() || ch.theoryText.trim() || ch.highlightsText.trim() || ch.practice.some((p) => p.q.trim() || p.ans.trim());

export default function BookCreator({ activeInstitute }) {
  const [activeView, setActiveView] = useState("cover"); // "cover" | "index" | "chapter-0" | "chapter-1" ...
  const [copiedText, setCopiedText] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [subject, setSubject] = useState("");
  const [author, setAuthor] = useState("");
  const [edition, setEdition] = useState("");
  const [coverTheme, setCoverTheme] = useState("amber");
  const [chapterCount, setChapterCount] = useState(3);
  const [chapters, setChapters] = useState(() => [blankChapter(1)]);
  const [editIndex, setEditIndex] = useState(0);
  const [confirmOutline, setConfirmOutline] = useState(false);

  // What gets saved (shape: BookContentSchema in packages/shared/documents.ts).
  const book = {
    title,
    subtitle,
    targetExam,
    subject,
    author,
    edition,
    coverColor: coverTheme,
    chapters: chapters.map((ch, i) => ({
      number: i + 1,
      title: ch.title,
      subtitle: ch.subtitle,
      theory: paragraphs(ch.theoryText),
      highlights: lines(ch.highlightsText),
      practiceQuestions: ch.practice.map((p) => ({ q: p.q, options: lines(p.optionsText), ans: p.ans })),
    })),
  };
  const totalQuestions = book.chapters.reduce((n, ch) => n + ch.practiceQuestions.length, 0);
  const theme = COVER_THEMES.find((t) => t.id === coverTheme) ?? COVER_THEMES[0];

  const load = (content) => {
    setTitle(content?.title ?? "");
    setSubtitle(content?.subtitle ?? "");
    setTargetExam(content?.targetExam ?? "");
    setSubject(content?.subject ?? "");
    setAuthor(content?.author ?? "");
    setEdition(content?.edition ?? "");
    setCoverTheme(COVER_THEMES.some((t) => t.id === content?.coverColor) ? content.coverColor : "amber");
    const loaded = (content?.chapters ?? []).map((ch) => ({
      title: ch.title,
      subtitle: ch.subtitle ?? "",
      theoryText: ch.theory.join("\n\n"),
      highlightsText: ch.highlights.join("\n"),
      practice: ch.practiceQuestions.map((p) => ({ q: p.q, optionsText: p.options.join("\n"), ans: p.ans })),
    }));
    setChapters(loaded.length ? loaded : [blankChapter(1)]);
    setEditIndex(0);
    setActiveView("cover");
  };

  // Real AI chapters arrive in Phase 4 (job book_chapter). Until then this makes empty chapters.
  const makeOutline = () => {
    setChapters(Array.from({ length: chapterCount }, (_, i) => blankChapter(i + 1)));
    setEditIndex(0);
    setActiveView("index");
    setConfirmOutline(false);
    if (!docTitle.trim() && title.trim()) setDocTitle(title.trim());
  };

  const handleCopyManuscript = async () => {
    let clean = `${activeInstitute.name.toUpperCase()}\n`;
    clean += `BOOK TITLE: ${book.title}\n`;
    if (book.subtitle) clean += `SUBTITLE: ${book.subtitle}\n`;
    clean += `TARGET EXAM: ${book.targetExam} | EDITION: ${book.edition}\n`;
    clean += `AUTHOR: ${book.author}\n\n`;
    clean += `TABLE OF CONTENTS (अनुक्रमणिका):\n`;
    book.chapters.forEach((ch) => (clean += `Chapter ${ch.number}: ${ch.title}\n`));
    clean += `\n`;
    book.chapters.forEach((ch) => {
      clean += `CHAPTER ${ch.number}: ${ch.title}\n`;
      if (ch.subtitle) clean += `${ch.subtitle}\n`;
      clean += `\n`;
      ch.theory.forEach((t) => (clean += `${t}\n\n`));
      if (ch.highlights.length) clean += `[EXAM HIGHLIGHTS]:\n${ch.highlights.join("\n")}\n\n`;
      if (ch.practiceQuestions.length) {
        clean += `[PRACTICE QUESTIONS]:\n`;
        ch.practiceQuestions.forEach((pq, i) => {
          clean += `Q${i + 1}. ${pq.q}\n`;
          pq.options.forEach((opt) => (clean += `   ${opt}\n`));
          clean += `Ans: ${pq.ans}\n\n`;
        });
      }
    });
    await navigator.clipboard.writeText(clean);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const editing = chapters[editIndex] ?? chapters[0];
  const setEditing = (next) => setChapters((all) => all.map((ch, i) => (i === editIndex ? next : ch)));
  const setPractice = (qi, next) => setEditing({ ...editing, practice: editing.practice.map((p, i) => (i === qi ? next : p)) });

  /** Every page is rendered so printing gives the whole book; only the chosen one shows on screen. */
  const pageClass = (view) => `${activeView === view ? "" : "hidden"} print:block print:break-after-page`;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookMarked className="size-6" />}
        title="स्टडी बुक & मॉड्यूल स्टूडियो"
        badge="किताब / मॉड्यूल मेकर"
        description="संस्थान की स्टडी बुक: कवर, विषय-सूची, अध्याय की थ्योरी, परीक्षा बिंदु और अभ्यास प्रश्न लिखें, सेव करें और पूरी किताब प्रिंट करें।"
        actions={
          <>
            <Button icon={copiedText ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={() => void handleCopyManuscript()}>
              {copiedText ? "कॉपी हो गया!" : "वर्ड के लिए कॉपी करें"}
            </Button>
            <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              पूरी किताब प्रिंट करें (PDF)
            </Button>
          </>
        }
      />

      <DocumentBar
        type="book"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={book}
        onOpen={(content) => load(content)}
        onNew={() => {
          load(null);
          setChapterCount(3);
          setDocTitle("");
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: book details and chapter editor */}
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="flex items-center gap-2 text-label font-semibold">
              <Sliders className="size-4" aria-hidden="true" />
              किताब की जानकारी
            </h3>
            <Field label="किताब का नाम">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="उदा. मध्य प्रदेश सामान्य ज्ञान" />
            </Field>
            <Field label="उप-शीर्षक (वैकल्पिक)">
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="लक्षित परीक्षा">
                <Input value={targetExam} onChange={(e) => setTargetExam(e.target.value)} placeholder="उदा. MPPSC, Vyapam" />
              </Field>
              <Field label="विषय">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
              <Field label="लेखक / फैकल्टी">
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </Field>
              <Field label="संस्करण">
                <Input value={edition} onChange={(e) => setEdition(e.target.value)} placeholder="उदा. 2026-27" />
              </Field>
            </div>
            <div role="group" aria-label="कवर डिज़ाइन थीम" className="space-y-2 border-t border-line pt-3">
              <p className="text-label font-semibold">कवर डिज़ाइन थीम</p>
              <div className="grid grid-cols-3 gap-2">
                {COVER_THEMES.map((th) => (
                  <Button key={th.id} size="sm" variant={coverTheme === th.id ? "primary" : "secondary"} aria-pressed={coverTheme === th.id} onClick={() => setCoverTheme(th.id)}>
                    <span className={`size-3 rounded-full ${th.swatch}`} aria-hidden="true"></span>
                    {th.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
              <Field label="कुल अध्याय" className="w-40">
                <Select value={chapterCount} onChange={(e) => setChapterCount(Number(e.target.value))}>
                  {CHAPTER_COUNTS.map((n) => (
                    <option key={n} value={n}>
                      {n} अध्याय
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="primary" icon={<Sparkles className="size-4" />} onClick={() => (chapters.some(chapterHasContent) ? setConfirmOutline(true) : makeOutline())}>
                अध्याय ढाँचा बनाएँ
              </Button>
            </div>
            <p className="text-caption text-muted">यह खाली अध्याय बनाता है जिनमें आप सामग्री लिखें। AI से अध्याय अगले चरण में आएँगे।</p>
          </div>

          <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-label font-semibold">अध्याय लिखें</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  icon={<Plus className="size-4" />}
                  disabled={chapters.length >= 100}
                  onClick={() => {
                    setChapters((all) => [...all, blankChapter(all.length + 1)]);
                    setEditIndex(chapters.length);
                  }}
                >
                  नया अध्याय
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="size-4" />}
                  disabled={chapters.length <= 1}
                  onClick={() => {
                    setChapters((all) => all.filter((_, i) => i !== editIndex));
                    setEditIndex((i) => Math.max(0, i - 1));
                    setActiveView("index");
                  }}
                >
                  अध्याय हटाएँ
                </Button>
              </div>
            </div>
            <Field label="अध्याय चुनें">
              <Select
                value={editIndex}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setEditIndex(i);
                  setActiveView(`chapter-${i}`);
                }}
              >
                {chapters.map((ch, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {ch.title || "बिना नाम का अध्याय"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="अध्याय का शीर्षक">
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="अध्याय का उप-शीर्षक (वैकल्पिक)">
              <Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
            </Field>
            <Field label="थ्योरी" hint="पैराग्राफ़ के बीच एक खाली लाइन छोड़ें">
              <Textarea rows={8} value={editing.theoryText} onChange={(e) => setEditing({ ...editing, theoryText: e.target.value })} />
            </Field>
            <Field label="परीक्षा उपयोगी बिंदु" hint="हर लाइन एक बिंदु">
              <Textarea rows={3} value={editing.highlightsText} onChange={(e) => setEditing({ ...editing, highlightsText: e.target.value })} />
            </Field>

            <div className="space-y-3 border-t border-line pt-3">
              <p className="text-label font-semibold">अभ्यास प्रश्न ({editing.practice.length})</p>
              {editing.practice.map((p, qi) => (
                <div key={qi} className="space-y-2 rounded-control border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label font-semibold">प्रश्न {qi + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 className="size-4" />}
                      aria-label={`अभ्यास प्रश्न ${qi + 1} हटाएँ`}
                      onClick={() => setEditing({ ...editing, practice: editing.practice.filter((_, i) => i !== qi) })}
                    >
                      हटाएँ
                    </Button>
                  </div>
                  <Field label={`अभ्यास प्रश्न ${qi + 1} का पाठ`}>
                    <Textarea rows={2} value={p.q} onChange={(e) => setPractice(qi, { ...p, q: e.target.value })} />
                  </Field>
                  <Field label="विकल्प" hint="हर लाइन एक विकल्प">
                    <Textarea rows={4} value={p.optionsText} onChange={(e) => setPractice(qi, { ...p, optionsText: e.target.value })} />
                  </Field>
                  <Field label="उत्तर / व्याख्या">
                    <Input value={p.ans} onChange={(e) => setPractice(qi, { ...p, ans: e.target.value })} />
                  </Field>
                </div>
              ))}
              <Button size="sm" icon={<Plus className="size-4" />} disabled={editing.practice.length >= 500} onClick={() => setEditing({ ...editing, practice: [...editing.practice, blankQuestion()] })}>
                नया अभ्यास प्रश्न
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Book Reader / Page Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div role="group" aria-label="किताब के पेज" className="flex items-center gap-2 overflow-x-auto pb-2 no-print">
            <Button size="sm" variant={activeView === "cover" ? "primary" : "secondary"} aria-pressed={activeView === "cover"} icon={<Bookmark className="size-4" />} onClick={() => setActiveView("cover")}>
              कवर
            </Button>
            <Button size="sm" variant={activeView === "index" ? "primary" : "secondary"} aria-pressed={activeView === "index"} icon={<FileText className="size-4" />} onClick={() => setActiveView("index")}>
              विषय-सूची
            </Button>
            {book.chapters.map((ch, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={activeView === `chapter-${idx}` ? "primary" : "secondary"}
                aria-pressed={activeView === `chapter-${idx}`}
                onClick={() => {
                  setActiveView(`chapter-${idx}`);
                  setEditIndex(idx);
                }}
              >
                अध्याय {ch.number}
              </Button>
            ))}
          </div>

          {/* BOOK COVER PAGE */}
          <div className={pageClass("cover")}>
            <div className={`w-full aspect-[1/1.3] max-w-md mx-auto rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden bg-gradient-to-br ${theme.gradient} text-white select-none`}>
              <div className="flex items-center gap-3 z-10 border-b border-white/20 pb-4">
                <img src={activeInstitute?.logo || SATYADHI_LOGO} alt="" className="w-12 h-12 rounded-full object-contain bg-amber-300 shadow-lg" />
                <div>
                  <p className={`text-sm font-extrabold tracking-wider uppercase ${theme.accent}`}>{activeInstitute.name}</p>
                  {activeInstitute.city && <p className="text-[10px] text-slate-300">{activeInstitute.city}</p>}
                </div>
              </div>

              <div className="my-auto py-6 z-10 space-y-4 text-center">
                {targetExam && <div className={`inline-block px-3 py-1 rounded-full border border-white/30 text-[11px] font-bold tracking-widest uppercase ${theme.accent}`}>{targetExam}</div>}
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-tight drop-shadow-md">{title || "किताब का नाम"}</h2>
                {subtitle && <p className="text-xs text-slate-200 max-w-xs mx-auto font-medium">{subtitle}</p>}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[11px] px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100">📖 {book.chapters.length} अध्याय</span>
                  {totalQuestions > 0 && <span className="text-[11px] px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100">❓ {totalQuestions} अभ्यास प्रश्न</span>}
                </div>
              </div>

              <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs z-10">
                <div>
                  <p className="text-[10px] text-slate-300 uppercase">लेखक / फैकल्टी</p>
                  <p className="font-semibold text-slate-100">{author || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-300 uppercase">संस्करण</p>
                  <p className={`font-semibold ${theme.accent}`}>{edition || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE OF CONTENTS */}
          <div className={pageClass("index")}>
            <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 min-h-[480px]">
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-800">{activeInstitute.name}</p>
                <h2 className="text-xl font-black uppercase text-slate-950">विषय-सूची</h2>
                <p className="text-xs text-slate-600">{title}</p>
              </div>
              <ol className="space-y-3">
                {book.chapters.map((ch, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView(`chapter-${idx}`);
                        setEditIndex(idx);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-amber-500 hover:bg-amber-50/50"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-900">{ch.number}</span>
                      <span>
                        <span className="block text-xs font-bold text-slate-900">{ch.title}</span>
                        {ch.subtitle && <span className="block text-[11px] text-slate-600">{ch.subtitle}</span>}
                      </span>
                    </button>
                    {/* The print stylesheet hides buttons, so the printed contents use this copy. */}
                    <div className="hidden print:flex items-center gap-3 border-b border-slate-200 py-2">
                      <span className="w-8 text-xs font-bold">{ch.number}.</span>
                      <span>
                        <span className="block text-xs font-bold">{ch.title}</span>
                        {ch.subtitle && <span className="block text-[11px] text-slate-600">{ch.subtitle}</span>}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* CHAPTERS */}
          {book.chapters.map((ch, idx) => (
            <div key={idx} className={pageClass(`chapter-${idx}`)}>
              <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-10 shadow-2xl border border-slate-200 min-h-[500px] overflow-y-auto max-h-[700px] print:max-h-none print:overflow-visible select-text space-y-6">
                <div className="border-b-2 border-slate-900 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">अध्याय {ch.number}</span>
                    <span className="text-xs text-slate-500 font-medium">{title}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-950">{ch.title}</h2>
                  {ch.subtitle && <p className="text-xs text-slate-600 mt-1">{ch.subtitle}</p>}
                </div>

                {ch.theory.length > 0 ? (
                  <div className="space-y-3.5">
                    {ch.theory.map((para, pIdx) => (
                      <p key={pIdx} className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {para}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 no-print">इस अध्याय की थ्योरी अभी नहीं लिखी।</p>
                )}

                {ch.highlights.length > 0 && (
                  <div className="space-y-2.5">
                    {ch.highlights.map((h, hIdx) => (
                      <div key={hIdx} className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed font-medium">
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                {ch.practiceQuestions.length > 0 && (
                  <div className="pt-4 border-t-2 border-slate-200 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded">अध्याय अभ्यास प्रश्न</h3>
                    {ch.practiceQuestions.map((pq, qIdx) => (
                      <div key={qIdx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div className="font-bold text-slate-900 whitespace-pre-wrap">
                          प्र. {qIdx + 1}: {pq.q}
                        </div>
                        {pq.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pl-2 text-slate-700">
                            {pq.options.map((opt, oIdx) => (
                              <div key={oIdx}>{opt}</div>
                            ))}
                          </div>
                        )}
                        {pq.ans && (
                          <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-800 font-semibold">
                            <span className="text-slate-600">उत्तर:</span> {pq.ans}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-6 border-t border-slate-300 text-[11px] text-slate-500">{activeInstitute.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOutline}
        title="लिखे हुए अध्याय हट जाएँगे"
        message={`नया ढाँचा ${chapterCount} खाली अध्याय बनाएगा और अभी लिखी सामग्री हटा देगा। आगे बढ़ें?`}
        confirmLabel="हाँ, नया ढाँचा बनाएँ"
        tone="danger"
        onConfirm={makeOutline}
        onCancel={() => setConfirmOutline(false)}
      />
    </div>
  );
}
