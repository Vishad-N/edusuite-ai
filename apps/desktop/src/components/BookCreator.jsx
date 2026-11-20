import React, { useState } from "react";
import {
  BookMarked,
  Printer,
  Copy,
  Check,
  Sparkles,
  Download,
  BookOpen,
  ChevronRight,
  Plus,
  Layers,
  FileText,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Library,
  Bookmark,
  Award,
} from "lucide-react";
import confetti from "canvas-confetti";
import { sampleBooks } from "../data/sampleData";
import { SATYADHI_LOGO } from "../utils/mediaHelper";

export default function BookCreator({ activeInstitute }) {
  const [selectedBookIdx, setSelectedBookIdx] = useState(0);
  const [activeView, setActiveView] = useState("cover"); // "cover" | "index" | "chapter-0" | "chapter-1" ...
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Active book being created / viewed
  const [book, setBook] = useState(sampleBooks[0]);

  // Form states for creating a new custom book
  const [customTitle, setCustomTitle] = useState("सामान्य विज्ञान एवं जीव विज्ञान");
  const [customExam, setCustomExam] = useState("MPPSC, SSC CGL & Vyapam Exams");
  const [customSubject, setCustomSubject] = useState("General Science (Biology & Physics)");
  const [bookType, setBookType] = useState("theory"); // "theory" | "formula" | "mcq"
  const [chapterCount, setChapterCount] = useState(3);
  const [accentTheme, setAccentTheme] = useState("amber"); // "amber" | "navy" | "emerald"

  const handleSelectPreset = (idx) => {
    setSelectedBookIdx(idx);
    setBook(sampleBooks[idx]);
    setActiveView("cover");
  };

  const handleGenerateBook = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Dynamic book generator
      setBook({
        id: "custom-" + Date.now(),
        title: customTitle,
        subtitle: `Complete Examination Study Material & Capsule for ${customExam}`,
        targetExam: customExam,
        subject: customSubject,
        author: `${activeInstitute.name} Academic & Faculty Cell`,
        edition: "2026-27 Smart Digital Edition",
        totalPages: chapterCount * 32,
        coverColor:
          accentTheme === "emerald"
            ? "from-emerald-600 via-teal-700 to-slate-900"
            : accentTheme === "navy"
            ? "from-sky-600 via-indigo-700 to-slate-900"
            : "from-amber-500 via-orange-600 to-amber-800",
        chapters: Array.from({ length: chapterCount }).map((_, i) => ({
          number: i + 1,
          title:
            i === 0
              ? `आधारभूत संकल्पनाएं एवं परिभाषाएं (Core Fundamentals of ${customSubject})`
              : i === 1
              ? `महत्वपूर्ण सिद्धांत, सूत्र एवं नियम (Key Principles & Derivations)`
              : `विगत वर्षों के प्रश्न एवं अभ्यास (High-Yield Practice & PYQs)`,
          subtitle: `Chapter ${i + 1} Comprehensive Capsule with Standard Explanations`,
          theory: [
            `${customSubject} के इस अध्याय में परीक्षा की दृष्टि से सर्वाधिक पूछे जाने वाले प्रमुख घटकों और सिद्धांतों का संकलन किया गया है।`,
            `प्रत्येक सिद्धांत का विस्तृत अवलोकन: अवधारणाओं को सरल हिंदी-अंग्रेजी द्विभाषी रूप में प्रस्तुत किया गया है ताकि प्रतियोगी परीक्षाओं में अवधारणा स्पष्ट रहे।`,
            `मुख्य वर्गीकरण एवं तुलनात्मक सारणी: विभिन्न प्रक्रियाओं और घटकों के बीच अंतर को स्पष्ट रेखांकित किया गया है।`,
            `व्यावहारिक अनुप्रयोग: प्रयोगशाला एवं दैनिक जीवन में इस विषय के अनुप्रयोग जो सीधे सामान्य अध्ययन के प्रश्न-पत्रों में पूछे जाते हैं।`,
          ],
          highlights: [
            `🌟 परीक्षा उपयोगी तथ्य: इस अध्याय से विगत 5 वर्षों में MPPSC एवं SSC में औसतन 3 से 4 प्रश्न पूछे गए हैं।`,
            `💡 स्मरण सूत्र: मुख्य बिंदुओं को याद रखने के लिए संक्षेपाक्षर एवं फ्लोचार्ट का उपयोग करें।`,
          ],
          practiceQuestions: [
            {
              q: `इस अध्याय से संबंधित सबसे महत्वपूर्ण मूलभूत नियम का प्रतिपादन किसने किया था?`,
              options: ["A) विकल्प 1", "B) विकल्प 2", "C) विकल्प 3", "D) विकल्प 4"],
              ans: "A) मानक प्रमाणिक सिद्धांत के अनुसार विकल्प A सही है।",
            },
            {
              q: `निम्नलिखित में से कौन सा कथन ${customSubject} के संदर्भ में पूर्णतः सत्य है?`,
              options: ["A) यह अपरिवर्तनीय है", "B) यह ऊर्जा संरक्षण पर आधारित है", "C) यह शून्य होता है", "D) उपर्युक्त सभी"],
              ans: "B) ऊर्जा संरक्षण के सार्वत्रिक नियम का पालन करता है।",
            },
          ],
        })),
      });

      setIsGenerating(false);
      setActiveView("cover");
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    }, 900);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyManuscript = () => {
    let clean = `====================================================\n`;
    clean += `${activeInstitute.name.toUpperCase()}\n`;
    clean += `BOOK TITLE: ${book.title}\n`;
    clean += `SUBTITLE: ${book.subtitle}\n`;
    clean += `TARGET EXAM: ${book.targetExam} | EDITION: ${book.edition}\n`;
    clean += `AUTHOR: ${book.author}\n`;
    clean += `====================================================\n\n`;

    clean += `TABLE OF CONTENTS (अनुक्रमणिका):\n`;
    book.chapters.forEach((ch) => {
      clean += `Chapter ${ch.number}: ${ch.title}\n`;
    });
    clean += `\n----------------------------------------------------\n\n`;

    book.chapters.forEach((ch) => {
      clean += `CHAPTER ${ch.number}: ${ch.title.toUpperCase()}\n`;
      clean += `${ch.subtitle}\n\n`;
      clean += `[THEORY & CONCEPTS]:\n`;
      ch.theory.forEach((t) => (clean += `${t}\n\n`));

      clean += `[EXAM HIGHLIGHTS]:\n`;
      ch.highlights.forEach((h) => (clean += `${h}\n`));
      clean += `\n[PRACTICE QUESTIONS & MCQs]:\n`;
      ch.practiceQuestions.forEach((pq, pIdx) => {
        clean += `Q${pIdx + 1}. ${pq.q}\n`;
        pq.options.forEach((opt) => (clean += `   ${opt}\n`));
        clean += `Ans: ${pq.ans}\n\n`;
      });
      clean += `====================================================\n\n`;
    });

    navigator.clipboard.writeText(clean);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Get active chapter if currently viewing one
  const activeChapterIndex = activeView.startsWith("chapter-")
    ? parseInt(activeView.replace("chapter-", ""), 10)
    : null;
  const currentChapter =
    activeChapterIndex !== null ? book.chapters[activeChapterIndex] : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <BookMarked className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              स्टडी बुक & मॉड्यूल स्टूडियो (Book Creator)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              किताब / मॉड्यूल मेकर
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            संस्थान की प्रिंटेड स्टडी बुक्स, विस्तृत थ्योरी नोट्स एवं 500+ MCQs प्रश्न बैंक तैयार करें।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyManuscript}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-sm transition"
          >
            {copiedText ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-amber-600" />
            )}
            <span>{copiedText ? "मैनुस्क्रिप्ट कॉपी हो गया!" : "वर्ड के लिए कॉपी करें"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>पूरी किताब प्रिंट करें (PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panel (Left) & Book Reader / Page Viewer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Book Generator Form & Presets */}
        <div className="lg:col-span-5 space-y-4">
          {/* Preset Selector */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Library className="w-3.5 h-3.5 text-amber-600" />
              <span>संस्थान की तैयार किताबें (Presets)</span>
            </span>
            <div className="grid grid-cols-1 gap-2">
              {sampleBooks.map((sb, idx) => (
                <button
                  key={sb.id}
                  onClick={() => handleSelectPreset(idx)}
                  className={`p-3 rounded-xl text-left border transition ${
                    selectedBookIdx === idx
                      ? "bg-amber-50 border-amber-400 text-slate-900 shadow-sm font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[240px]">
                      {sb.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-bold">
                      {sb.chapters.length} Ch
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {sb.targetExam}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Create Custom Book Form */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>नई कस्टम किताब / मॉड्यूल तैयार करें</span>
            </h3>

            {/* Book Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                किताब का नाम (Book Title)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="उदा. मध्य प्रदेश सामान्य ज्ञान, बाल विकास"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            {/* Target Exam */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                लक्षित परीक्षा (Target Exam)
              </label>
              <input
                type="text"
                value={customExam}
                onChange={(e) => setCustomExam(e.target.value)}
                placeholder="उदा. MPPSC, SSC CGL, Vyapam, MPTET"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            {/* Subject & Chapters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  विषय (Subject)
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  कुल अध्याय (Chapters)
                </label>
                <select
                  value={chapterCount}
                  onChange={(e) => setChapterCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value={3}>3 अध्याय (कैप्सूल बुकलेट)</option>
                  <option value={5}>5 अध्याय (यूनिट मॉड्यूल)</option>
                  <option value={8}>8 अध्याय (फुल सिलेबस बुक)</option>
                </select>
              </div>
            </div>

            {/* Book Style / Accent */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700">
                कवर डिजाइन थीम
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "amber", label: "गोल्डन फ्लेम", color: "bg-amber-400" },
                  { id: "navy", label: "रॉयल नेवी", color: "bg-blue-600" },
                  { id: "emerald", label: "फॉरेस्ट ग्रीन", color: "bg-emerald-600" },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setAccentTheme(th.id)}
                    className={`p-2 rounded-xl flex items-center justify-center gap-2 border transition ${
                      accentTheme === th.id
                        ? "bg-amber-50 border-amber-400 text-slate-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${th.color}`}></span>
                    <span className="text-xs">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateBook}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 transform active:scale-98"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>किताब संकलित हो रही है...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>पूरी किताब तैयार करें</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Book Reader / Page Viewer */}
        <div className="lg:col-span-7 space-y-4">
          {/* Page Tabs Strip (Cover, Table of Contents, Chapter 1, 2, 3...) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveView("cover")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeView === "cover"
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Book Cover</span>
            </button>

            <button
              onClick={() => setActiveView("index")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeView === "index"
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Index (विषय-सूची)</span>
            </button>

            {book.chapters.map((ch, idx) => (
              <button
                key={ch.number}
                onClick={() => setActiveView(`chapter-${idx}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeView === `chapter-${idx}`
                    ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <span>Ch {ch.number}</span>
              </button>
            ))}
          </div>

          {/* VIEW 1: BOOK COVER PAGE */}
          {activeView === "cover" && (
            <div className="w-full aspect-[1/1.3] max-w-md mx-auto rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-amber-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 text-white select-none">
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 -mt-16 -mr-16 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Top Banner with Official Logo */}
              <div className="flex items-center justify-between z-10 border-b border-amber-400/20 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={activeInstitute?.logo || SATYADHI_LOGO}
                    alt="Satyadhi Sharma Logo"
                    className="w-12 h-12 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400/80 shadow-lg"
                  />
                  <div>
                    <h4 className="text-sm font-extrabold tracking-wider uppercase text-amber-300">
                      {activeInstitute.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {activeInstitute.city} • Publications & Research Cell
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 uppercase tracking-widest shadow">
                  Official
                </span>
              </div>

              {/* Center Main Book Title */}
              <div className="my-auto py-6 z-10 space-y-4 text-center">
                <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-[11px] font-bold tracking-widest text-amber-300 uppercase">
                  {book.targetExam}
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-tight drop-shadow-md">
                  {book.title}
                </h1>

                <p className="text-xs text-amber-100/80 max-w-xs mx-auto font-medium">
                  {book.subtitle}
                </p>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <span className="text-[11px] px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200">
                    📖 {book.chapters.length} Detailed Chapters
                  </span>
                  <span className="text-[11px] px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200">
                    ❓ 500+ Practice MCQs
                  </span>
                </div>
              </div>

              {/* Footer Author & Edition */}
              <div className="pt-4 border-t border-amber-400/20 flex items-center justify-between text-xs text-slate-400 z-10">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Faculty / Author</p>
                  <p className="font-semibold text-slate-200">{book.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase">Edition</p>
                  <p className="font-semibold text-amber-400">{book.edition}</p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: TABLE OF CONTENTS (INDEX) */}
          {activeView === "index" && (
            <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 min-h-[480px]">
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img
                    src={activeInstitute?.logo || SATYADHI_LOGO}
                    alt="Logo"
                    className="w-8 h-8 rounded-full bg-amber-300"
                  />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    {activeInstitute.name}
                  </h3>
                </div>
                <h2 className="text-xl font-black uppercase text-slate-950">
                  विषय-सूची (Table of Contents)
                </h2>
                <p className="text-xs text-slate-600">{book.title}</p>
              </div>

              <div className="space-y-4">
                {book.chapters.map((ch, idx) => (
                  <div
                    key={ch.number}
                    onClick={() => setActiveView(`chapter-${idx}`)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                        {ch.number}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                          {ch.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {ch.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-700">
                      Page {(idx + 1) * 12} →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: CHAPTER CONTENT */}
          {currentChapter && (
            <div className="bg-white text-slate-900 rounded-2xl p-6 md:p-10 shadow-2xl border border-slate-200 min-h-[500px] overflow-y-auto max-h-[700px] select-text space-y-6">
              {/* Chapter Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    अध्याय {currentChapter.number} (Chapter {currentChapter.number})
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {book.title}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-950">
                  {currentChapter.title}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  {currentChapter.subtitle}
                </p>
              </div>

              {/* Theory Content */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-amber-500 pl-2">
                  संकल्पनात्मक विवरण एवं थ्योरी (Core Conceptual Theory)
                </h3>

                {currentChapter.theory.map((para, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-xs md:text-sm text-slate-800 leading-relaxed text-justify"
                  >
                    {para}
                  </p>
                ))}
              </div>

              {/* Exam Alerts & Tips Boxes */}
              <div className="space-y-2.5 pt-2">
                {currentChapter.highlights.map((h, hIdx) => (
                  <div
                    key={hIdx}
                    className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed font-medium"
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Practice Questions at End of Chapter */}
              <div className="pt-4 border-t-2 border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1.5 rounded flex items-center justify-between">
                  <span>अध्याय अभ्यास प्रश्न (Practice MCQs with Explanations)</span>
                  <span className="text-[10px] text-slate-500">
                    Self-Evaluation
                  </span>
                </h3>

                <div className="space-y-4">
                  {currentChapter.practiceQuestions.map((pq, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="font-bold text-slate-900">
                        प्र. {qIdx + 1}: {pq.q}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pl-2 text-slate-700">
                        {pq.options.map((opt, oIdx) => (
                          <div key={oIdx}>{opt}</div>
                        ))}
                      </div>

                      <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-800 font-semibold">
                        <span className="text-slate-600">उत्तर:</span> {pq.ans}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page Footer */}
              <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
                <span>{activeInstitute.name} Publications</span>
                <span>Page {currentChapter.number * 12}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
