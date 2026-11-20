import React, { useState } from "react";
import {
  HelpCircle,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Zap,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  FileQuestion,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function DoubtSolver({ activeInstitute }) {
  const [doubtText, setDoubtText] = useState(
    "एक रेलगाड़ी 180 किमी/घंटा की गति से चल रही है। 250 मीटर लम्बे प्लेटफॉर्म को पार करने में उसे 15 सेकंड का समय लगता है। रेलगाड़ी की लम्बाई ज्ञात कीजिए।"
  );
  const [subject, setSubject] = useState("Mathematics (Speed & Distance)");
  const [isSolving, setIsSolving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [solution, setSolution] = useState({
    answer: "500 मीटर (500 Meters)",
    steps: [
      "Step 1 (चाल को m/s में बदलें): गति = 180 किमी/घंटा = 180 × (5/18) = 50 मीटर/सेकंड।",
      "Step 2 (कुल तय दूरी): दूरी = चाल × समय = 50 × 15 = 750 मीटर।",
      "Step 3 (रेलगाड़ी की लम्बाई): जब रेलगाड़ी किसी प्लेटफॉर्म को पार करती है, तो तय दूरी = (रेलगाड़ी की लम्बाई + प्लेटफॉर्म की लम्बाई)।",
      "अतः, रेलगाड़ी की लम्बाई = कुल दूरी - प्लेटफॉर्म की लम्बाई = 750 - 250 = 500 मीटर।",
    ],
    shortcutTrick:
      "🚀 10-Second Shortcut: चाल = 180 = 50 m/s. 15 सेकंड में दूरी = 50 × 15 = 750. बस 750 में से 250 घटा दें = 500 मीटर उत्तर!",
    commonMistake:
      "⚠️ आम गलती: छात्र प्रायः किमी/घंटा को m/s में बदलना भूल जाते हैं (5/18 से गुणा करना अनिवार्य है)।",
    similarQuestions: [
      "120 मीटर लम्बी ट्रेन 54 किमी/घंटा की गति से एक खंभे को कितने समय में पार करेगी? (उत्तर: 8 सेकंड)",
      "300 मीटर लम्बी ट्रेन 200 मीटर लम्बे पुल को 25 सेकंड में पार करती है। ट्रेन की चाल किमी/घंटे में बताएं। (उत्तर: 72 किमी/घंटा)",
    ],
  });

  const handleSolve = () => {
    setIsSolving(true);
    setTimeout(() => {
      setIsSolving(false);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    }, 700);
  };

  const handleCopy = () => {
    let clean = `DOUBT SOLUTION - ${activeInstitute.name}\n\n`;
    clean += `प्रश्न: ${doubtText}\n\n`;
    clean += `सही उत्तर: ${solution.answer}\n\n`;
    clean += `हल (Step-by-Step):\n`;
    solution.steps.forEach((s) => (clean += `${s}\n`));
    clean += `\n${solution.shortcutTrick}\n\n${solution.commonMistake}\n`;

    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-200">
              <Lightbulb className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              डाउट सॉल्वर & शॉर्टकट ट्रिक असिस्टेंट
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
              Instant Explainer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            किसी भी छात्र के डाउट का चरणबद्ध हिंदी हल, 10-सेकंड की शॉर्टकट ट्रिक एवं समान प्रश्न प्राप्त करें।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md transition transform active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "व्हाट्सएप के लिए कॉपी हो गया!" : "हल कॉपी करें (WhatsApp)"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              छात्र का प्रश्न / डाउट दर्ज करें
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                संदेह या प्रश्न का विवरण
              </label>
              <textarea
                rows={5}
                value={doubtText}
                onChange={(e) => setDoubtText(e.target.value)}
                placeholder="प्रश्न यहां पेस्ट करें (हिंदी या इंग्लिश)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-violet-500 focus:bg-white leading-relaxed transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                विषय (Subject)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-violet-500 focus:bg-white transition"
              />
            </div>

            <button
              onClick={handleSolve}
              disabled={isSolving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 transform active:scale-98"
            >
              {isSolving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>शॉर्टकट ट्रिक खोजी जा रही है...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>हल निकालें & शॉर्टकट ट्रिक बनाएं</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Solution */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            {/* Final Answer Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Correct Final Answer
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {solution.answer}
                </h3>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            {/* Step-by-Step Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                विस्तृत चरणबद्ध हल (Step-by-Step Solution)
              </h4>
              <div className="space-y-2">
                {solution.steps.map((st, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200 leading-relaxed"
                  >
                    {st}
                  </div>
                ))}
              </div>
            </div>

            {/* 10-Second Shortcut Trick */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>फैकल्टी स्पेशल शॉर्टकट ट्रिक (Exam Time Saver):</span>
              </div>
              <p className="leading-relaxed pl-5 font-mono text-[11px]">
                {solution.shortcutTrick}
              </p>
            </div>

            {/* Common Mistakes */}
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{solution.commonMistake}</span>
            </div>

            {/* Similar Practice Questions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                समान अभ्यास प्रश्न (Similar Practice Questions for Students)
              </h4>
              <div className="space-y-2">
                {solution.similarQuestions.map((sq, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-950 text-xs text-slate-300 border border-slate-800"
                  >
                    • {sq}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
