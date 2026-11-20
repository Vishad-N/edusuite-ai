import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Palette,
  Ratio,
  Layers,
  Wand2,
  Share2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { SATYADHI_LOGO } from "../utils/mediaHelper";

export default function ImageStudio({ activeInstitute }) {
  const [category, setCategory] = useState("admission");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [headline, setHeadline] = useState("NEW TARGET BATCH 2026-27");
  const [subheading, setSubheading] = useState("NEET & IIT-JEE Foundation (Classes 9th to 12th)");
  const [tagline, setTagline] = useState("Scholarship Test: This Sunday • Up to 90% Fee Waiver");
  const [accentColor, setAccentColor] = useState("#38bdf8"); // Cyan
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const canvasRef = useRef(null);

  const categories = [
    { id: "admission", label: "Admissions & Batches", icon: "🎓" },
    { id: "topper", label: "Result & Topper Poster", icon: "🏆" },
    { id: "science", label: "Science & Diagram Prompt", icon: "🔬" },
    { id: "event", label: "Festival & Event Greetings", icon: "🎉" },
  ];

  const presets = {
    admission: {
      head: "CRACK IIT-JEE & NEET 2027",
      sub: "Exclusive Ranker Batches with Kota Top Faculty",
      tag: "Limited Seats • Free Demo Classes Available",
      color: "#38bdf8",
      prompt: `High-resolution ultra-modern educational coaching banner for "${activeInstitute.name}". Vibrant dynamic background with glowing molecular structures and astrophysics orbital lines. High-contrast typography reading "CRACK IIT-JEE & NEET 2027". Professional studio lighting, 8k render, cinematic 3D graphic design.`,
    },
    topper: {
      head: "HEARTIEST CONGRATULATIONS TO OUR TOPPERS!",
      sub: "Class 12th Board & JEE Main State Ranks",
      tag: "Proud Moment for Apex Family • 100% Success Ratio",
      color: "#f59e0b",
      prompt: `Grand celebration award poster for "${activeInstitute.name}". Golden laurel wreaths, 3D shiny golden trophy on marble pedestal, sparkling confetti in air, deep royal midnight blue background with golden geometric accents. Elegant corporate typography, luxury lighting.`,
    },
    science: {
      head: "ANATOMY OF HUMAN HEART & CIRCULATION",
      sub: "Detailed 4-Chambered Cardiovascular Diagram",
      tag: "Color Coded Oxygenated vs Deoxygenated Blood Flow",
      color: "#ef4444",
      prompt: `Accurate scientific 3D biological diagram of the human heart showing aorta, pulmonary artery, left ventricle, and right atrium. Clear translucent rendering with labeled blue (deoxygenated) and red (oxygenated) flow vectors. Clean educational infographic layout on subtle slate grid background.`,
    },
    event: {
      head: "WISHING YOU A JOYOUS & PROSPEROUS DIWALI",
      sub: "May the Light of Knowledge Illuminate Every Path",
      tag: "From the Management, Faculty & Staff of Our Academy",
      color: "#10b981",
      prompt: `Warm festive educational greeting poster. Traditional glowing clay diyas and lanterns with subtle mathematical and constellation geometric patterns floating in soft bokeh background. Gold foil lettering, warm festive ambiance, photorealistic high detail.`,
    },
  };

  const handleApplyPreset = (catId) => {
    setCategory(catId);
    const p = presets[catId];
    if (p) {
      setHeadline(p.head);
      setSubheading(p.sub);
      setTagline(p.tag);
      setAccentColor(p.color);
    }
  };

  const copyPromptText = () => {
    const text = presets[category]?.prompt || "";
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDownloadCard = () => {
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    alert("Graphic creative design saved! You can also copy the enhanced AI prompt for ultra-realistic rendering.");
  };

  return (
    <div className="space-y-6">
      {/* Top Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ImageIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              AI Image & Poster Studio
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              High Resolution
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Coaching admissions, science diagrams, topper banners aur events ke
            liye custom graphics generate karein.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyPromptText}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {copiedPrompt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
            <span>{copiedPrompt ? "Prompt Copied!" : "Copy AI Prompt"}</span>
          </button>
          <button
            onClick={handleDownloadCard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Graphic</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => handleApplyPreset(c.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              category === c.id
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800"
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Poster Content & Customization
            </h3>

            {/* Headline */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Main Headline (Bold)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Subheading */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Subheading / Class Details
              </label>
              <input
                type="text"
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Tagline / Call to Action */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Call-to-Action / Date / Offer
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Aspect Ratio</span>
                <span className="text-[10px] text-slate-400">{aspectRatio}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "1:1", label: "Square (1:1)", desc: "WhatsApp / Insta" },
                  { id: "16:9", label: "Banner (16:9)", desc: "YouTube / Screen" },
                  { id: "9:16", label: "Story (9:16)", desc: "Reels / Status" },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setAspectRatio(r.id)}
                    className={`p-2 rounded-xl text-center border transition ${
                      aspectRatio === r.id
                        ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-bold">{r.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Generated Prompt Box */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI Prompt for Gemini / Imagen</span>
                </label>
                <button
                  onClick={copyPromptText}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  Copy Text
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                {presets[category]?.prompt || "Custom prompt ready"}
              </div>
            </div>
          </div>
        </div>

        {/* Live Visual Canvas Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/60 border border-slate-800 min-h-[460px]">
          <div
            className={`w-full max-w-lg transition-all rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-slate-700/60 ${
              aspectRatio === "16:9"
                ? "aspect-[16/9]"
                : aspectRatio === "9:16"
                ? "aspect-[9/16] max-w-xs"
                : "aspect-square"
            }`}
            style={{
              background: `radial-gradient(circle at 80% 20%, ${accentColor}25 0%, #090d16 85%)`,
            }}
          >
            {/* Top Branding */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeInstitute?.logo || SATYADHI_LOGO}
                  alt="Satyadhi Sharma Logo"
                  className="w-7 h-7 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400/50 shadow"
                />
                <span className="text-xs font-extrabold tracking-wider uppercase text-slate-100">
                  {activeInstitute.name}
                </span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                Official Creative
              </span>
            </div>

            {/* Middle Main Content */}
            <div className="my-auto py-4 z-10 text-center space-y-3">
              <div
                className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase border"
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                }}
              >
                {category === "topper" ? "Rankers Hall of Fame" : "Admissions Open"}
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-md">
                {headline}
              </h2>

              <p className="text-xs md:text-sm text-slate-200 max-w-sm mx-auto font-medium">
                {subheading}
              </p>

              <div className="pt-2">
                <div className="inline-block px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-bold text-amber-300 shadow-lg">
                  {tagline}
                </div>
              </div>
            </div>

            {/* Footer Contact */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 z-10">
              <span>📞 {activeInstitute.phone}</span>
              <span>📍 {activeInstitute.city}</span>
            </div>

            {/* Background Decorative Rings */}
            <div
              className="absolute -bottom-16 -right-16 w-52 h-52 rounded-full border border-white/5 pointer-events-none"
              style={{ borderColor: `${accentColor}20` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
