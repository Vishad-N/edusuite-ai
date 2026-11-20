import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Printer,
  Copy,
  Check,
  Calendar,
  CheckCircle2,
  Clock,
  ListOrdered,
  FileCheck,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function LessonPlanner({ activeInstitute }) {
  const [subject, setSubject] = useState("Physics");
  const [chapter, setChapter] = useState("Electromagnetic Induction & Faraday's Laws");
  const [grade, setGrade] = useState("Class 12 / JEE Target");
  const [durationDays, setDurationDays] = useState(5);
  const [copied, setCopied] = useState(false);

  const [plan, setPlan] = useState({
    chapter: "Electromagnetic Induction & Faraday's Laws",
    subject: "Physics",
    grade: "Class 12 / JEE Target",
    objectives: [
      "Understand magnetic flux and mathematical formulation Φ = B · A · cos(θ).",
      "Demonstrate Faraday's 1st and 2nd Laws of Induction with coil-magnet experiment.",
      "Apply Lenz's Law and energy conservation principle to determine induced current direction.",
      "Solve board and competitive numerical problems on self-induction and mutual induction.",
    ],
    schedule: [
      {
        day: "Day 1 (Period 1)",
        topic: "Magnetic Flux & Introduction to EMI",
        activities: "Intuitive experiment demonstration; calculation of magnetic flux through arbitrary surfaces; introductory numericals.",
        homework: "NCERT Exercise Questions 6.1 to 6.4; practice flux dot-product problems.",
      },
      {
        day: "Day 2 (Period 2)",
        topic: "Faraday's Experiments & Quantitative Law",
        activities: "Mathematical derivation of induced electromotive force e = -N(dΦ/dt); time-varying magnetic field examples.",
        homework: "Solve 5 calculus-based problems where magnetic field B(t) is a quadratic function of time.",
      },
      {
        day: "Day 3 (Period 3)",
        topic: "Lenz's Law & Motional EMF",
        activities: "Right-hand palm rule & Fleming's right-hand rule; derivation of rod moving in uniform B field e = Bvl; eddy currents discussion.",
        homework: "Analyze magnetic braking mechanism; write short note on induction furnaces.",
      },
      {
        day: "Day 4 (Period 4)",
        topic: "Self-Induction & Mutual Induction",
        activities: "Coefficients L and M; energy stored in inductor U = 1/2 L I²; RL circuit growth and decay curves.",
        homework: "Derive mutual inductance of two coaxial long solenoids; solve 3 previous year JEE questions.",
      },
      {
        day: "Day 5 (Period 5)",
        topic: "AC Generator & Quick Classroom Quiz",
        activities: "Working principle of alternator; 15-minute 10-MCQ speed test; doubt-clearing and summary cheat sheet distribution.",
        homework: "Revise complete chapter for upcoming weekend unit test.",
      },
    ],
  });

  const handleCopy = () => {
    let clean = `LESSON PLAN: ${plan.chapter} (${plan.subject} - ${plan.grade})\n`;
    clean += `Institute: ${activeInstitute.name}\n\n`;
    clean += `LEARNING OBJECTIVES:\n`;
    plan.objectives.forEach((obj, i) => (clean += `${i + 1}. ${obj}\n`));
    clean += `\nDAY-WISE TEACHING TIMELINE:\n`;
    plan.schedule.forEach((s) => {
      clean += `\n[${s.day}]: ${s.topic}\nActivity: ${s.activities}\nHomework: ${s.homework}\n`;
    });

    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Lesson Plan & Teacher Notes AI
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Pedagogy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Classroom syllabus schedule, learning goals, activities aur homework
            timeline banayein.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
            <span>{copied ? "Plan Copied!" : "Copy Lesson Plan"}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Lesson Plan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Curriculum Parameters
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Chapter / Unit Topic
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Subject & Class
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Total Teaching Days
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value={3}>3 Days (Crash Module)</option>
                <option value={5}>5 Days (Standard 1 Week)</option>
                <option value={8}>8 Days (Detailed Conceptual)</option>
              </select>
            </div>

            <button
              onClick={() => {
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
                alert("AI Lesson Plan updated with active objectives!");
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Update Lesson Blueprint</span>
            </button>
          </div>
        </div>

        {/* Display Timeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {plan.subject} • {plan.grade}
                </span>
                <span className="text-xs text-slate-400">
                  {activeInstitute.name}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {plan.chapter}
              </h3>
            </div>

            {/* Learning Objectives Box */}
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span>Pedagogical Learning Objectives</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                {plan.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day Wise Timeline Cards */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Lecture-by-Lecture Breakdown
              </div>

              {plan.schedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400">
                      {item.day}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-200">
                      {item.topic}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    <strong className="text-slate-400">In-Class:</strong>{" "}
                    {item.activities}
                  </p>

                  <p className="text-[11px] text-amber-300/90 bg-amber-500/5 p-2 rounded border border-amber-500/10">
                    <strong>Homework / Practice:</strong> {item.homework}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
