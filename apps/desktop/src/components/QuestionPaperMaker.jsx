import React, { useState } from "react";
import {
  FileQuestion,
  Printer,
  Copy,
  Check,
  Sparkles,
  Download,
  BookOpen,
  HelpCircle,
  Eye,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import confetti from "canvas-confetti";
import { sampleQuestionPapers } from "../data/sampleData";
import { SATYADHI_LOGO } from "../utils/mediaHelper";

export default function QuestionPaperMaker({ activeInstitute }) {
  const [examTitle, setExamTitle] = useState("Mid-Term Examination 2026 - Periodic Table & Bonding");
  const [grade, setGrade] = useState("Class 10 / 11");
  const [subject, setSubject] = useState("Chemistry");
  const [duration, setDuration] = useState("90 Minutes");
  const [totalMarks, setTotalMarks] = useState(40);
  const [difficulty, setDifficulty] = useState("Balanced CBSE / Foundation");
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const [paper, setPaper] = useState(sampleQuestionPapers[0]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Dynamic generation
      setPaper({
        title: examTitle,
        grade,
        subject,
        duration,
        totalMarks,
        sections: [
          {
            name: "Section A: Multiple Choice Questions (1 Mark Each)",
            questions: [
              {
                q: `Which of the following statements is fundamentally correct regarding ${subject}?`,
                options: [
                  "A) Law of conservation holds true in closed systems",
                  "B) Energy can be created in spontaneous reactions",
                  "C) Entropy remains zero at all temperatures",
                  "D) Rate of reaction is independent of temperature",
                ],
                ans: "A) Law of conservation holds true in closed systems.",
              },
              {
                q: "What is the primary factor determining the rate of diffusion in standard conditions?",
                options: [
                  "A) Molecular mass and temperature gradient",
                  "B) Volume of container only",
                  "C) Color of the medium",
                  "D) Atmospheric humidity alone",
                ],
                ans: "A) Graham's law: Rate of diffusion is inversely proportional to square root of molar mass.",
              },
              {
                q: "Identify the correct SI unit and dimensional formula associated with this concept:",
                options: ["A) Joule (kg·m²·s⁻²)", "B) Newton (kg·m·s⁻¹)", "C) Watt (kg·m·s⁻³)", "D) Pascal (kg·m²·s⁻¹)"],
                ans: "A) Joule (kg·m²·s⁻²).",
              },
            ],
          },
          {
            name: "Section B: Short Answer Questions (3 Marks Each)",
            questions: [
              {
                q: `Define the primary law or mechanism of ${subject} under consideration. Give one practical laboratory application.`,
                ans: "Clear theoretical definition stating foundational principles along with standard textbook reaction/experiment.",
              },
              {
                q: "Differentiate between theoretical yield and experimental yield. Why is experimental yield almost always less than 100%?",
                ans: "Incomplete reaction, side reactions, and mechanical loss during filtration/transfer prevent 100% yield.",
              },
            ],
          },
          {
            name: "Section C: Long Answer / Numerical Problem (5 Marks)",
            questions: [
              {
                q: `Derive the standard mathematical relationship for the given chapter. A sample of 5.0 g undergoes transformation at 300 K; calculate the net work done.`,
                ans: "Step-by-step derivation followed by numerical substitution yielding final answer with proper SI units.",
              },
            ],
          },
        ],
      });

      setIsGenerating(false);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCleanText = () => {
    let clean = `${activeInstitute.name.toUpperCase()}\n`;
    clean += `${paper.title}\n`;
    clean += `Grade: ${grade} | Subject: ${subject} | Time: ${duration} | Max Marks: ${totalMarks}\n`;
    clean += `------------------------------------------------------------\n\n`;

    paper.sections.forEach((sec) => {
      clean += `${sec.name}\n\n`;
      sec.questions.forEach((q, idx) => {
        clean += `Q${idx + 1}. ${q.q}\n`;
        if (q.options) {
          q.options.forEach((opt) => (clean += `   ${opt}\n`));
        }
        clean += `\n`;
      });
    });

    if (showAnswerKey) {
      clean += `\n========== ANSWER KEY & SOLUTIONS ==========\n\n`;
      paper.sections.forEach((sec) => {
        clean += `[${sec.name}]\n`;
        sec.questions.forEach((q, idx) => {
          clean += `Ans ${idx + 1}: ${q.ans}\n`;
        });
        clean += `\n`;
      });
    }

    navigator.clipboard.writeText(clean);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <FileQuestion className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              परीक्षा पेपर & आंसर-की मेकर
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Print / Word Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            सेक्शन-वार MCQs, लघु एवं दीर्घ उत्तरीय प्रश्न तथा विस्तृत आंसर-की के साथ टेस्ट पेपर बनाएं।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCleanText}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-sm transition"
          >
            {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
            <span>{copiedText ? "वर्ड के लिए कॉपी हो गया!" : "वर्ड के लिए कॉपी करें"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>टेस्ट पेपर प्रिंट करें (PDF)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>परीक्षा ब्लूप्रिंट एवं सेटिंग्स</span>
            </h3>

            {/* Exam Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                परीक्षा / टेस्ट का नाम
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Grade & Subject */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  लक्षित क्लास / बैच
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                >
                  <option>MPPSC Pre + Mains</option>
                  <option>SSC CGL / GD</option>
                  <option>Vyapam / Sub-Inspector</option>
                  <option>Class 10</option>
                  <option>Class 12</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  विषय (Subject)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Marks & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Max Marks
                </label>
                <select
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value={20}>20 Marks (Quick Test)</option>
                  <option value={40}>40 Marks (Unit Test)</option>
                  <option value={50}>50 Marks (Mid-Term)</option>
                  <option value={80}>80 Marks (Full Board)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Time Allowed
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Toggle: Answer Key */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-medium text-slate-300">
                Include Answer Key & Explanations
              </span>
              <input
                type="checkbox"
                checked={showAnswerKey}
                onChange={(e) => setShowAnswerKey(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Drafting Question Paper...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Test Paper</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Paper Document Preview (Clean White Academic Paper) */}
        <div className="lg:col-span-7 bg-white text-slate-900 rounded-2xl p-6 md:p-10 shadow-2xl border border-slate-200 min-h-[500px] overflow-y-auto max-h-[700px] select-text">
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src={activeInstitute?.logo || SATYADHI_LOGO}
                alt="Satyadhi Sharma Logo"
                className="w-12 h-12 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400 shadow"
              />
              <div className="text-left">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide text-slate-950">
                  {activeInstitute.name}
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  {activeInstitute.tagline} • Session 2026-27
                </p>
              </div>
            </div>
            <div className="mt-3 text-sm font-bold uppercase tracking-wider text-slate-900 bg-slate-100 py-1 rounded">
              {paper.title}
            </div>

            {/* Meta Row */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mt-3 pt-2 border-t border-slate-300">
              <span>Grade: {grade} ({subject})</span>
              <span>Time: {duration}</span>
              <span>Max Marks: {totalMarks}</span>
            </div>
          </div>

          {/* General Instructions */}
          <div className="text-[11px] text-slate-700 mb-6 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>General Instructions:</strong> All questions are compulsory.
            Section A contains MCQs (1 mark each). Section B has short answers (3
            marks). Use of electronic calculators is prohibited.
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
                      <div className="font-semibold">
                        Q{qIdx + 1}. {q.q}
                      </div>

                      {/* Options if MCQ */}
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
                    <div className="text-[11px] font-bold text-slate-700">
                      {sec.name}
                    </div>
                    {sec.questions.map((q, qIdx) => (
                      <div key={qIdx} className="text-xs bg-slate-50 p-2 rounded border border-slate-200 text-slate-800">
                        <span className="font-bold text-emerald-700">
                          Ans Q{qIdx + 1}:
                        </span>{" "}
                        {q.ans}
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
