import React, { useState } from "react";
import {
  Presentation,
  Download,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Copy,
  Sliders,
  Palette,
  FileCheck,
} from "lucide-react";
import confetti from "canvas-confetti";
import { generatePptxFile } from "../utils/pptxGenerator";
import { presentationPresets } from "../data/sampleData";

export default function PptMaker({ activeInstitute, onNavigate }) {
  const [topic, setTopic] = useState("Photosynthesis & Light Reactions in Plants");
  const [grade, setGrade] = useState("Class 10 / 11");
  const [subject, setSubject] = useState("Biology / Science");
  const [slidesCount, setSlidesCount] = useState(5);
  const [theme, setTheme] = useState("navy");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Active presentation data
  const [presentation, setPresentation] = useState({
    title: "Photosynthesis & Light Reactions in Plants",
    subtitle: "Complete Conceptual Guide for CBSE & NEET",
    grade: "Class 10 / 11",
    subject: "Biology / Science",
    instituteName: activeInstitute.name,
    slides: presentationPresets[0].slides,
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Find matching preset or generate dynamic structure
      const found = presentationPresets.find(
        (p) => p.title.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(p.subject.toLowerCase())
      );

      if (found) {
        setPresentation({
          ...found,
          instituteName: activeInstitute.name,
          grade,
          subject,
        });
      } else {
        // Dynamic generation based on user prompt
        setPresentation({
          title: topic,
          subtitle: `Comprehensive Study Lecture for ${grade} (${subject})`,
          grade,
          subject,
          instituteName: activeInstitute.name,
          slides: [
            {
              tag: "Introduction",
              title: `Core Fundamentals of ${topic}`,
              points: [
                `Understanding the essential principles and definitions of ${topic}.`,
                `Fundamental equations and experimental observations governing this topic.`,
                `Key standard terminology and prerequisite concepts for exams.`,
                `Real-world scientific and daily-life applications.`,
              ],
              takeaway: "Ensure you memorize key definitions and core scientific terms for board exams.",
            },
            {
              tag: "Deep Dive",
              title: `Mechanism & Detailed Derivations`,
              points: [
                `Step-by-step breakdown of how the process operates under standard conditions.`,
                `Comparative analysis of active vs passive factors influencing outcomes.`,
                `Mathematical formulas and graphical representation of trends.`,
                `Diagnostic check questions commonly encountered in competitive tests.`,
              ],
              takeaway: "Master the step-by-step sequential flow; teachers often award step-marking here.",
            },
            {
              tag: "Advanced Insights",
              title: `High-Yield Concepts & Common Traps`,
              points: [
                `Frequent misinterpretations by students and how to avoid them.`,
                `Exceptions to standard rules and special corner cases.`,
                `Previous Year Questions (PYQs) patterns observed in last 5 years.`,
                `Shortcut mnemonic techniques to recall complex sequences.`,
              ],
              takeaway: "Focus on the exceptions—they make up over 40% of MCQ trick questions.",
            },
            {
              tag: "Summary & Practice",
              title: `Revision Capsule & Next Steps`,
              points: [
                `Comprehensive summary table contrasting all primary sub-topics.`,
                `Homework problem set assigned for self-evaluation.`,
                `Quick 2-minute formula cheat sheet.`,
                `Q&A and student doubt-clearing session overview.`,
              ],
              takeaway: "Practice numerical problems and past 3 years questions before next class.",
            },
          ],
        });
      }

      setIsGenerating(false);
      setCurrentSlideIndex(0);

      // Trigger celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }, 900);
  };

  const handleDownloadPptx = async () => {
    try {
      await generatePptxFile(
        {
          ...presentation,
          instituteName: activeInstitute.name,
        },
        theme
      );
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.8 },
      });
    } catch (err) {
      console.error("PPTX Generation Error:", err);
      alert("Failed to export PPTX. Please check console.");
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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Presentation className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              डिजिटल लेक्चर PPT मेकर (.PPTX)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              PowerPoint Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            किसी भी विषय पर क्लासरूम स्मार्ट-बोर्ड के लिए पूर्णतः तैयार और एडिटेबल .PPTX प्रेजेंटेशन बनाएं।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPptx}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>.PPTX फाइल डाउनलोड करें</span>
          </button>
        </div>
      </div>

      {/* Screenshot to PPT Callout Banner */}
      {onNavigate && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
              📸
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900">
                क्या आपके पास प्रश्नों के 10 से 50 स्क्रीनशॉट हैं?
              </h4>
              <p className="text-xs text-slate-600">
                टाइपिस्ट को देने और घंटों इंतजार करने की जरूरत नहीं — AI स्क्रीनशॉट डिटेक्टर से 30 सेकंड में ऑटोमैटिक MCQ PPT बनाएं!
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("ocr_ppt")}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs whitespace-nowrap shadow-md transition transform active:scale-95 cursor-pointer"
          >
            स्क्रीनशॉट से PPT बनाएं →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (Inputs & Style Options) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>लेक्चर विवरण एवं पैरामीटर्स</span>
            </h3>

            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                लेक्चर / प्रेजेंटेशन का विषय
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="उदा. मध्य प्रदेश का भूगोल, कोशिका विभाजन"
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

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition transform active:scale-98 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Creating Slides & Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate AI Presentation</span>
                </>
              )}
            </button>
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
        </div>
      </div>
    </div>
  );
}
