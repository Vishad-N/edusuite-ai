import React, { useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Sparkles,
  Download,
  BookOpen,
  CheckCircle2,
  QrCode,
  CheckSquare,
  Award,
  Layers,
} from "lucide-react";
import confetti from "canvas-confetti";
import { SATYADHI_LOGO } from "../utils/mediaHelper";

export default function NotebookDppMaker({ activeInstitute }) {
  const [templateType, setTemplateType] = useState("dpp"); // "dpp" | "notebook" | "omr"
  const [dppSubject, setDppSubject] = useState("गणित एवं तर्कशक्ति (Quantitative Aptitude)");
  const [dppTopic, setDppTopic] = useState("प्रतिशत एवं लाभ-हानि (Percentage & Profit-Loss) DPP #14");
  const [targetBatch, setTargetBatch] = useState("MPPSC Pre + Vyapam Target 2026");
  const [omrQuestionsCount, setOmrQuestionsCount] = useState(50); // 50 or 100

  const sampleDppQuestions = [
    {
      q: "यदि किसी वस्तु के मूल्य में 20% की वृद्धि की जाती है, तो उसकी खपत में कितने प्रतिशत की कमी करनी होगी ताकि कुल खर्च अपरिवर्तित रहे?",
      hint: "Shortcut: [r / (100 + r)] × 100",
    },
    {
      q: "एक दुकानदार 12 वस्तुओं को ₹10 में खरीदकर 10 वस्तुओं को ₹12 में बेचता है। उसका लाभ प्रतिशत ज्ञात कीजिए।",
      hint: "Cross multiplication method: (144 - 100) / 100 = 44%",
    },
    {
      q: "A और B मिलकर किसी कार्य को 15 दिन में पूरा करते हैं। यदि B अकेला उस कार्य को 20 दिन में कर सकता है, तो A अकेला कितने दिन में करेगा?",
      hint: "LCM Method: Total work = 60 units",
    },
    {
      q: "मध्य प्रदेश के किस जिले में सर्वाधिक वन क्षेत्र पाया जाता है? (MP GK स्पेशल प्रश्न)",
      hint: "बालाघाट जिला (Balaghat District)",
    },
    {
      q: "5 अंकों की वह सबसे छोटी संख्या ज्ञात कीजिए जो 12, 15 तथा 18 से पूर्णतः विभाज्य हो।",
      hint: "LCM of (12, 15, 18) = 180",
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              डेली DPP, स्टूडेंट नोटबुक & OMR स्टूडियो
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              डेली प्रैक्टिस मटेरियल
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            क्लास में बांटने के लिए 10-प्रश्नों की DPP शीट, कॉर्नेल नोटबुक एवं ऑफलाइन टेस्ट के लिए 50/100 OMR शीट्स बनाएं।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>शीट प्रिंट करें (PDF)</span>
          </button>
        </div>
      </div>

      {/* Switcher: DPP vs Notebook vs OMR */}
      <div className="flex items-center gap-2">
        {[
          { id: "dpp", label: "📝 डेली प्रैक्टिस पेपर (DPP)", icon: "DPP" },
          { id: "notebook", label: "📓 छात्र क्लास नोटबुक पेज", icon: "Notes" },
          { id: "omr", label: "⭕ 50/100 प्रश्नों की OMR शीट", icon: "OMR" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplateType(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              templateType === t.id
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              शीट सेटिंग्स
            </h3>

            {templateType === "dpp" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    DPP टॉपिक एवं नंबर
                  </label>
                  <input
                    type="text"
                    value={dppTopic}
                    onChange={(e) => setDppTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    विषय (Subject)
                  </label>
                  <input
                    type="text"
                    value={dppSubject}
                    onChange={(e) => setDppSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    लक्षित बैच
                  </label>
                  <input
                    type="text"
                    value={targetBatch}
                    onChange={(e) => setTargetBatch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500 focus:bg-white transition"
                  />
                </div>
              </>
            )}

            {templateType === "omr" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  प्रश्नों की संख्या (OMR Size)
                </label>
                <select
                  value={omrQuestionsCount}
                  onChange={(e) => setOmrQuestionsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-teal-500 focus:bg-white transition"
                >
                  <option value={50}>50 प्रश्न (क्लास टेस्ट / क्विज)</option>
                  <option value={100}>100 प्रश्न (फुल मॉक टेस्ट)</option>
                </select>
              </div>
            )}

            {templateType === "notebook" && (
              <p className="text-xs text-slate-500 leading-relaxed">
                कॉर्नेल नोट-टेकिंग फॉर्मेट छात्रों को क्लास में व्यवस्थित नोट्स लेने
                एवं रिवीजन के लिए प्रमाणित लेआउट देता है।
              </p>
            )}

            <button
              onClick={() => {
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
                alert("Material template updated and ready to print!");
              }}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Update Material Template</span>
            </button>
          </div>
        </div>

        {/* Right Printable Canvas */}
        <div className="lg:col-span-8 bg-white text-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 min-h-[500px] overflow-y-auto max-h-[700px] select-text">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeInstitute?.logo || SATYADHI_LOGO}
                alt="Logo"
                className="w-11 h-11 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400 shadow"
              />
              <div>
                <h2 className="text-base font-black uppercase text-slate-950 tracking-wider">
                  {activeInstitute.name}
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  {activeInstitute.city} • Dedicated Student Practice Portal
                </p>
              </div>
            </div>

            <div className="text-right text-[10px] font-bold uppercase text-slate-700 border border-slate-300 px-2.5 py-1 rounded">
              {templateType === "dpp"
                ? "DAILY PRACTICE PAPER"
                : templateType === "omr"
                ? "OMR ANSWER SHEET"
                : "STUDENT CLASS NOTEBOOK"}
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
              <span className="text-slate-500">Batch:</span> {targetBatch.split(" ")[0]}
            </div>
            <div>
              <span className="text-slate-500">Date:</span> ___/___/2026
            </div>
          </div>

          {/* VIEW A: DPP QUESTIONS */}
          {templateType === "dpp" && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200 flex items-center justify-between text-xs font-bold text-amber-900">
                <span>{dppTopic}</span>
                <span>Max Marks: 20 | Time: 25 Mins</span>
              </div>

              <div className="space-y-4">
                {sampleDppQuestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="font-semibold text-slate-900">
                      Q{idx + 1}. {item.q}
                    </div>

                    {/* Rough work space */}
                    <div className="h-14 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                      [Space for Rough Work / Calculation]
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Faculty & QR Code */}
              <div className="pt-4 border-t-2 border-slate-300 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 border border-slate-300 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                    [QR]
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-[11px]">
                      Scan for Video Solution
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Satyadhi Sharma Mobile App
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold border-t border-slate-400 pt-1">
                    Faculty Signature
                  </div>
                </div>
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
                  <div
                    key={qIdx}
                    className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200 text-[11px]"
                  >
                    <span className="font-bold text-slate-800 w-6">
                      {qIdx + 1}.
                    </span>
                    <div className="flex items-center gap-1">
                      {["A", "B", "C", "D"].map((opt) => (
                        <div
                          key={opt}
                          className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-700 hover:bg-slate-900 hover:text-white cursor-pointer select-none"
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
              <div className="grid grid-cols-12 gap-3 min-h-[380px]">
                {/* Cue column */}
                <div className="col-span-4 border-r-2 border-slate-300 pr-2 space-y-4">
                  <div className="text-xs font-bold uppercase text-slate-700 border-b border-slate-200 pb-1">
                    Cues / Keywords / Dates
                  </div>
                  <div className="space-y-6 pt-2 text-[11px] text-slate-400">
                    <p>• Key Concept 1</p>
                    <p>• Formula / Law</p>
                    <p>• High-Yield Question</p>
                    <p>• Exam Warning</p>
                  </div>
                </div>

                {/* Notes Column */}
                <div className="col-span-8 space-y-4">
                  <div className="text-xs font-bold uppercase text-slate-700 border-b border-slate-200 pb-1">
                    Class Notes & Lecture Explanations
                  </div>
                  {/* Ruled lines */}
                  <div className="space-y-5 pt-1">
                    {Array.from({ length: 8 }).map((_, l) => (
                      <div
                        key={l}
                        className="border-b border-slate-200 h-4"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Block */}
              <div className="border-t-2 border-slate-800 pt-3">
                <div className="text-xs font-bold uppercase text-slate-800 mb-1">
                  Summary / 1-Minute Revision Capsule:
                </div>
                <div className="h-16 border border-dashed border-slate-300 rounded bg-slate-50 p-2 text-[11px] text-slate-400">
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
