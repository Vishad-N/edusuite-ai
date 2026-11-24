import React, { useState } from "react";
import {
  Presentation,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Sliders,
} from "lucide-react";
import { generatePptxFile } from "../utils/pptxGenerator";
import { DocumentBar } from "./DocumentBar.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { Button, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";
import { tx } from "../i18n/index.ts";

/** A blank deck: one title slide to start from (no sample content, Phase 3). */
function blankPresentation(topic, grade, subject) {
  return {
    title: topic,
    subtitle: "",
    grade,
    subject,
    slides: [{ tag: tx("परिचय"), title: topic || tx("नई प्रस्तुति"), points: [tx("यहाँ मुख्य बिंदु लिखें")], takeaway: "" }],
  };
}

export default function PptMaker({ activeInstitute, onNavigate }) {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("Class 9 & 10");
  const [subject, setSubject] = useState("");
  const [theme, setTheme] = useState("navy");
  const [slideCount, setSlideCount] = useState(6);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [docTitle, setDocTitle] = useState("");

  // Active presentation data
  const [presentation, setPresentation] = useState(() => blankPresentation("", "Class 9 & 10", ""));

  // What gets saved (shape: PptContentSchema in packages/shared/documents.ts).
  const documentContent = {
    title: presentation.title,
    ...(presentation.subtitle && { subtitle: presentation.subtitle }),
    grade,
    subject,
    theme,
    slides: presentation.slides.map((s) => ({
      ...(s.tag && { tag: s.tag }),
      title: s.title,
      points: s.points,
      ...(s.takeaway && { takeaway: s.takeaway }),
    })),
  };

  // AI outline (Phase 4, job ppt_outline): fills the editor as unsaved work for the teacher to check.
  const aiRequest = () =>
    topic.trim().length >= 2
      ? {
          type: "ppt_outline",
          input: {
            topic: topic.trim(),
            ...(grade.trim() && { grade: grade.trim() }),
            ...(subject.trim() && { subject: subject.trim() }),
            slideCount,
            language: "hi",
          },
        }
      : null;
  const applyOutline = (result) => {
    setPresentation({
      title: result.title,
      subtitle: result.subtitle ?? "",
      grade,
      subject,
      slides: result.slides.map((s) => ({ tag: s.tag ?? "", title: s.title, points: s.points, takeaway: s.takeaway ?? "" })),
    });
    if (!docTitle.trim()) setDocTitle(result.title);
    setCurrentSlideIndex(0);
  };

  // The free option: an editable outline template from the topic, without AI.
  const handleGenerate = () => {
    const t = topic.trim() || tx("नई प्रस्तुति");
    setPresentation({
      title: t,
      subtitle: subject ? `${grade} · ${subject}` : grade,
      grade,
      subject,
      slides: [
        { tag: tx("परिचय"), title: t, points: [tx("विषय का परिचय"), tx("मुख्य परिभाषाएँ"), tx("परीक्षा में महत्व")], takeaway: "" },
        { tag: tx("मुख्य अवधारणा"), title: tx("मुख्य बिंदु"), points: [tx("बिंदु 1"), tx("बिंदु 2"), tx("बिंदु 3")], takeaway: "" },
        { tag: tx("उदाहरण"), title: tx("उदाहरण और प्रश्न"), points: [tx("उदाहरण 1"), tx("पिछले वर्षों का प्रश्न")], takeaway: "" },
        { tag: tx("सारांश"), title: tx("सारांश"), points: [tx("याद रखने योग्य बातें")], takeaway: "" },
      ],
    });
    if (!docTitle.trim()) setDocTitle(t);
    setCurrentSlideIndex(0);
  };

  const [exportError, setExportError] = useState("");
  const handleDownloadPptx = async () => {
    setExportError("");
    try {
      await generatePptxFile({ ...presentation, instituteName: activeInstitute.name }, theme);
    } catch {
      setExportError(tx("PPTX फ़ाइल नहीं बन सकी। फिर से कोशिश करें।"));
    }
  };

  const currentSlide = presentation.slides[currentSlideIndex] || presentation.slides[0];

  const quickTopicSuggestions = [
    "Newton's Laws of Motion & Friction",
    "Periodic Classification & Chemical Bonding",
    "Human Circulatory System & Heart Anatomy",
    "Trigonometric Identities & Applications",
    "French Revolution & Rise of Nationalism",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Presentation className="size-6" />}
        title={tx("डिजिटल लेक्चर PPT मेकर (.PPTX)")}
        badge="PowerPoint"
        description={tx("किसी भी विषय पर स्मार्ट-बोर्ड के लिए .PPTX प्रेजेंटेशन बनाएँ, सेव करें और बाद में फिर से खोलें।")}
        actions={
          <Button variant="primary" icon={<Download className="size-4" />} onClick={handleDownloadPptx}>
            {tx(".PPTX डाउनलोड करें")}
          </Button>
        }
      />

      <DocumentBar
        type="ppt"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={documentContent}
        onOpen={(content) => {
          setPresentation({
            title: content.title,
            subtitle: content.subtitle ?? "",
            grade: content.grade ?? grade,
            subject: content.subject ?? subject,
            slides: content.slides.map((s) => ({ tag: s.tag ?? "", title: s.title, points: s.points, takeaway: s.takeaway ?? "" })),
          });
          setTopic(content.title);
          if (content.grade) setGrade(content.grade);
          if (content.subject !== undefined) setSubject(content.subject);
          if (content.theme) setTheme(content.theme);
          setCurrentSlideIndex(0);
        }}
        onNew={() => {
          setTopic("");
          setSubject("");
          setTheme("navy");
          setDocTitle("");
          setPresentation(blankPresentation("", grade, ""));
          setCurrentSlideIndex(0);
        }}
      />

      {exportError && (
        <p role="alert" className="rounded-control border border-danger bg-danger-subtle p-3 text-label text-danger">
          {exportError}
        </p>
      )}

      {/* Screenshot to PPT Callout Banner */}
      {onNavigate && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
              📸
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900">
                {tx("क्या आपके पास प्रश्नों के 10 से 50 स्क्रीनशॉट हैं?")}
              </h4>
              <p className="text-xs text-slate-600">
                {tx("स्क्रीनशॉट अपलोड करें, हर प्रश्न और विकल्प लिखें और स्मार्टबोर्ड MCQ PPT बनाएँ।")}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("ocr_ppt")}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs whitespace-nowrap shadow-md transition transform active:scale-95 cursor-pointer"
          >
            {tx("स्क्रीनशॉट से PPT बनाएं →")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (Inputs & Style Options) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>{tx("लेक्चर विवरण एवं पैरामीटर्स")}</span>
            </h3>

            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {tx("लेक्चर / प्रेजेंटेशन का विषय")}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={tx("उदा. मध्य प्रदेश का भूगोल, कोशिका विभाजन")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Quick Topic Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickTopicSuggestions.map((sugg, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTopic(sugg);
                      if (sugg.includes("Newton")) {
                        setSubject("Physics");
                        setGrade("Class 9 & 11");
                      }
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-sky-300 border border-slate-700/50 transition truncate max-w-full"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* Class & Subject */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Grade
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option>Class 6 to 8</option>
                  <option>Class 9 & 10</option>
                  <option>Class 11 & 12</option>
                  <option>JEE / NEET Target</option>
                  <option>College / Foundation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Color Palette / Theme */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Color Palette & Theme</span>
                <span className="text-[10px] text-slate-400 capitalize">
                  {theme} theme
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "navy", label: "Midnight Cyan", bg: "bg-slate-900 border-sky-400" },
                  { id: "emerald", label: "Forest Green", bg: "bg-emerald-950 border-emerald-400" },
                  { id: "purple", label: "Royal Violet", bg: "bg-purple-950 border-purple-400" },
                  { id: "classic", label: "Clean White", bg: "bg-slate-200 border-slate-600" },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id)}
                    className={`h-9 rounded-xl flex items-center justify-center border-2 transition ${
                      theme === th.id
                        ? `${th.bg} shadow-md`
                        : "bg-slate-800 border-transparent opacity-60 hover:opacity-100"
                    }`}
                    title={th.label}
                  >
                    {theme === th.id && (
                      <Check className={`w-4 h-4 ${th.id === "classic" ? "text-slate-900" : "text-white"}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate: AI (uses credits) or a free empty outline */}
            <div className="mt-3 space-y-3 rounded-card border border-line bg-surface p-3 text-ink">
              <Field label={tx("कितनी स्लाइड")}>
                <Select value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))}>
                  {[4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} {tx("स्लाइड")}
                    </option>
                  ))}
                </Select>
              </Field>
              <AiGenerate
                label={tx("AI से स्लाइड बनाएँ")}
                build={aiRequest}
                onResult={applyOutline}
                hint={topic.trim().length < 2 ? tx("पहले ऊपर विषय लिखें।") : tx("AI ड्राफ़्ट बनाता है; दाईं ओर जाँचें, बदलें और सेव करें।")}
              />
              <Button className="w-full" onClick={handleGenerate}>
                {tx("खाली ढाँचा बनाएँ (बिना AI, मुफ़्त)")}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Preview Panel (Slide Canvas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Live Slide Preview</span>
              <span className="text-[10px] text-slate-500">
                (Slide {currentSlideIndex + 1} of {presentation.slides.length})
              </span>
            </div>

            {/* Navigation Dots & Buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {presentation.slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === currentSlideIndex
                        ? "bg-sky-400 w-5"
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  />
                ))}
              </div>
              <button
                disabled={currentSlideIndex === presentation.slides.length - 1}
                onClick={() =>
                  setCurrentSlideIndex((prev) =>
                    Math.min(presentation.slides.length - 1, prev + 1)
                  )
                }
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Presentation Slide Canvas (16:9 Aspect Ratio Container) */}
          <div
            className={`w-full aspect-[16/9] rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-2xl border transition-all ${
              theme === "emerald"
                ? "bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border-emerald-500/30"
                : theme === "purple"
                ? "bg-gradient-to-br from-purple-950 via-slate-900 to-purple-950 border-purple-500/30"
                : theme === "classic"
                ? "bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900 border-slate-300"
                : "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-sky-500/30"
            }`}
          >
            {/* Slide Header */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                    theme === "classic"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  }`}
                >
                  {currentSlide.tag || "Core Concept"}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    theme === "classic" ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {activeInstitute.name}
                </span>
              </div>

              <h3
                className={`text-xl md:text-2xl font-bold tracking-tight ${
                  theme === "classic" ? "text-slate-900" : "text-white"
                }`}
              >
                {currentSlide.title}
              </h3>
            </div>

            {/* Bullets Content */}
            <div className="my-auto py-2 space-y-2.5">
              {currentSlide.points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                      theme === "classic" ? "bg-sky-600" : "bg-sky-400"
                    }`}
                  ></span>
                  <p
                    className={`text-xs md:text-sm leading-relaxed ${
                      theme === "classic" ? "text-slate-700" : "text-slate-200"
                    }`}
                  >
                    {pt}
                  </p>
                </div>
              ))}
            </div>

            {/* Slide Footer with Takeaway */}
            <div className="pt-3 border-t border-slate-800/60">
              {currentSlide.takeaway && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 mb-2 ${
                    theme === "classic"
                      ? "bg-amber-50 text-amber-900 border border-amber-200"
                      : "bg-slate-900/90 text-amber-300 border border-amber-400/20"
                  }`}
                >
                  <span className="font-bold shrink-0">💡 Exam Tip:</span>
                  <span className="truncate">{currentSlide.takeaway}</span>
                </div>
              )}

              <div
                className={`flex items-center justify-between text-[10px] ${
                  theme === "classic" ? "text-slate-500" : "text-slate-500"
                }`}
              >
                <span>
                  {grade} • {subject}
                </span>
                <span>
                  Slide {currentSlideIndex + 1} of {presentation.slides.length}
                </span>
              </div>
            </div>
          </div>

          {/* Slide Deck Thumbnails Strip */}
          <div className="grid grid-cols-4 md:grid-cols-5 gap-2 pt-2">
            {presentation.slides.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`p-2 rounded-xl text-left border transition ${
                  idx === currentSlideIndex
                    ? "bg-slate-800 border-sky-500 shadow-md"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400">
                  Slide {idx + 1}
                </div>
                <div className="text-[11px] font-semibold text-slate-200 truncate mt-0.5">
                  {s.title}
                </div>
              </button>
            ))}
          </div>

          <SlideEditor
            slide={currentSlide}
            index={currentSlideIndex}
            count={presentation.slides.length}
            onChange={(next) =>
              setPresentation((p) => ({ ...p, slides: p.slides.map((s, i) => (i === currentSlideIndex ? next : s)) }))
            }
            onAdd={() => {
              setPresentation((p) => {
                const slides = [...p.slides];
                slides.splice(currentSlideIndex + 1, 0, { tag: "", title: tx("नई स्लाइड"), points: [""], takeaway: "" });
                return { ...p, slides };
              });
              setCurrentSlideIndex((i) => i + 1);
            }}
            onDelete={() => {
              setPresentation((p) => ({ ...p, slides: p.slides.filter((_, i) => i !== currentSlideIndex) }));
              setCurrentSlideIndex((i) => Math.max(0, i - 1));
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Edits the slide shown in the preview: title, points (one per line), exam tip. */
function SlideEditor({ slide, index, count, onChange, onAdd, onDelete }) {
  return (
    <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink no-print">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label font-semibold">{tx("स्लाइड")} {index + 1} {tx("बदलें")}</h3>
        <div className="flex gap-2">
          <Button size="sm" icon={<Plus className="size-4" />} onClick={onAdd}>
            {tx("नई स्लाइड")}
          </Button>
          <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={onDelete} disabled={count <= 1}>
            {tx("स्लाइड हटाएँ")}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label={tx("टैग")} className="md:col-span-1">
          <Input value={slide.tag ?? ""} onChange={(e) => onChange({ ...slide, tag: e.target.value })} />
        </Field>
        <Field label={tx("स्लाइड का शीर्षक")} className="md:col-span-2">
          <Input value={slide.title} onChange={(e) => onChange({ ...slide, title: e.target.value })} />
        </Field>
      </div>
      <Field label={tx("मुख्य बिंदु")} hint={tx("हर लाइन एक बिंदु")}>
        <Textarea
          rows={5}
          value={slide.points.join("\n")}
          onChange={(e) => onChange({ ...slide, points: e.target.value.split("\n") })}
        />
      </Field>
      <Field label={tx("परीक्षा टिप (वैकल्पिक)")}>
        <Input value={slide.takeaway ?? ""} onChange={(e) => onChange({ ...slide, takeaway: e.target.value })} />
      </Field>
    </div>
  );
}
