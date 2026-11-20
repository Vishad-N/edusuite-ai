import React, { useState } from "react";
import {
  Video,
  Download,
  Copy,
  Check,
  Sparkles,
  Sliders,
  Play,
  Hash,
  FileText,
  Clock,
  Radio,
  Share2,
  Tv,
} from "lucide-react";
import confetti from "canvas-confetti";
import { SATYADHI_LOGO } from "../utils/mediaHelper";

export default function YouTubeStudio({ activeInstitute }) {
  const [headline, setHeadline] = useState("MPPSC 2026: संपूर्ण मध्य प्रदेश का इतिहास");
  const [punchline, setPunchline] = useState("1 ही क्लास में पूरा सुपड़ा साफ! • 100+ Live PYQs");
  const [facultyName, setFacultyName] = useState("शर्मा सर द्वारा विशेष कक्षा");
  const [liveBadge, setLiveBadge] = useState("🔴 LIVE @ 8:00 PM");
  const [tagline, setTagline] = useState("हस्तलिखित PDF Notes Free");
  const [bgTheme, setBgTheme] = useState("red-dark"); // "red-dark" | "blue-gold" | "yellow-black"
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  const presets = [
    {
      topic: "MPPSC Special",
      head: "MP GK महामैराथन 2026",
      punch: "परीक्षा में बार-बार आने वाले 500 प्रश्न",
      faculty: "विशेषज्ञ फैकल्टी टीम",
      badge: "🔴 LIVE महा-क्लास",
    },
    {
      topic: "Vyapam / Sub-Inspector",
      head: "गणित एवं तर्कशक्ति (Maths & Reasoning)",
      punch: "बिना पेन उठाए सेकंड्स में सॉल्व करें शॉर्टकट ट्रिक्स",
      faculty: "मैथ्स एक्सपर्ट फैकल्टी",
      badge: "🔥 Super Hit Batch",
    },
    {
      topic: "SSC CGL / GD",
      head: "सामान्य हिंदी एवं व्याकरण (General Hindi)",
      punch: "संधि, समास, विलोम शब्द का संपूर्ण निचोड़",
      faculty: "सत्याधी शर्मा रिसर्च टीम",
      badge: "⚡ 100/100 स्कोर पक्का",
    },
  ];

  const applyPreset = (p) => {
    setHeadline(p.head);
    setPunchline(p.punch);
    setFacultyName(p.faculty);
    setLiveBadge(p.badge);
  };

  const generatedTitle = `${headline} | ${punchline} | ${activeInstitute.name} Indore`;

  const generatedDescription = `🔥 ${headline}
🎯 लक्षित परीक्षा: MPPSC (Pre + Mains), SSC CGL, Vyapam, MP Police & All State Exams.

कक्षा की मुख्य विशेषताएं:
✅ विगत 10 वर्षों के Previous Year Questions (PYQs)
✅ परीक्षा हॉल में समय बचाने वाली शॉर्टकट ट्रिक्स
✅ क्लास की फ्री हस्तलिखित PDF हमारे टेलीग्राम चैनल पर उपलब्ध

📱 Satyadhi Sharma Official App डाउनलोड करें:
👉 Daily Mock Tests, Live Batches & DPP Solution
📞 हेल्पलाइन / प्रवेश जानकारी: ${activeInstitute.phone}
📍 पता: ${activeInstitute.city}

#${activeInstitute.name.replace(/\s+/g, '')} #MPPSC2026 #Vyapam #IndoreCoaching #LiveClasses`;

  const generatedTags = `mppsc 2026, satyadhi sharma classes, satyadhi sharma live class, mp gk live, vyapam maths, ssc cgl indore, patwari classes, mp police sub inspector, hindi grammar short tricks, best coaching indore`;

  const copyText = (text, setFn) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <Video className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              YouTube लाइव क्लास & थंबनेल स्टूडियो
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              16:9 High CTR
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            YouTube लाइव कक्षाओं के लिए 16:9 हाई-क्लिक थंबनेल, टाइटल, SEO टैग्स एवं
            वीडियो डिस्क्रिप्शन बनाएं।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
              alert("थंबनेल कैनवास तैयार! 1280x720 HD रेजोल्यूशन में एक्सपोर्ट के लिए रेडी।");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>थंबनेल डाउनलोड करें (16:9)</span>
          </button>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-600 font-bold mr-1">
          पॉपुलर टॉपिक्स:
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => applyPreset(p)}
            className="text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-300 shadow-sm transition font-medium"
          >
            {p.topic}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-rose-600" />
              <span>थंबनेल एवं लाइव क्लास सेटिंग्स</span>
            </h3>

            {/* Headline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                मुख्य बड़ा टाइटल (Headline)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition"
              />
            </div>

            {/* Punchline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                हाई-क्लिक पंचलाइन (Subtitle)
              </label>
              <input
                type="text"
                value={punchline}
                onChange={(e) => setPunchline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition"
              />
            </div>

            {/* Faculty Name & Live Badge */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  शिक्षक / फैकल्टी
                </label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  लाइव टाइमिंग बैज
                </label>
                <input
                  type="text"
                  value={liveBadge}
                  onChange={(e) => setLiveBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Offer / Free Tagline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                नीचे का फ्री नोट्स बैज
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition"
              />
            </div>

            {/* Theme Style */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700">
                थंबनेल कलर थीम
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "red-dark", label: "Red & Black (सुपरहिट)", bg: "bg-red-700 text-white" },
                  { id: "yellow-black", label: "Yellow & Navy", bg: "bg-amber-400 text-slate-950 font-black" },
                  { id: "blue-gold", label: "Royal Blue & Gold", bg: "bg-blue-700 text-white" },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setBgTheme(th.id)}
                    className={`p-2 rounded-xl text-center border text-xs transition ${
                      bgTheme === th.id
                        ? `${th.bg} border-slate-800 shadow-md font-bold`
                        : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live 16:9 Thumbnail Canvas & SEO Metadata */}
        <div className="lg:col-span-7 space-y-5">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>लाइव 16:9 थंबनेल कैनवास (YouTube HD Standard)</span>
            <span className="text-[10px] text-emerald-700 font-mono font-bold">1280 x 720 px</span>
          </div>

          {/* 16:9 Thumbnail Canvas */}
          <div
            className={`w-full aspect-[16/9] rounded-2xl p-5 md:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden border-2 transition-all select-none ${
              bgTheme === "yellow-black"
                ? "bg-gradient-to-tr from-slate-950 via-[#10141f] to-amber-950 border-amber-400"
                : bgTheme === "blue-gold"
                ? "bg-gradient-to-tr from-slate-950 via-blue-950 to-indigo-950 border-blue-400"
                : "bg-gradient-to-tr from-slate-950 via-[#1a080c] to-rose-950 border-rose-500"
            }`}
          >
            {/* Top Bar with Logo & Live Badge */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeInstitute?.logo || SATYADHI_LOGO}
                  alt="Logo"
                  className="w-10 h-10 rounded-full bg-amber-300 ring-2 ring-amber-400 shadow-lg object-contain"
                />
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
                    {activeInstitute.name}
                  </h4>
                  <p className="text-[10px] text-slate-300 font-medium">
                    YouTube Official Live
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/40 animate-pulse">
                <span>{liveBadge}</span>
              </div>
            </div>

            {/* Middle Big Bold Hindi Typography */}
            <div className="my-auto py-2 z-10 space-y-2">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-amber-300 tracking-tight leading-tight uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                {headline}
              </h1>

              <div className="inline-block px-3 py-1 rounded-xl bg-white text-slate-950 text-xs md:text-sm font-black shadow-xl">
                ⚡ {punchline}
              </div>
            </div>

            {/* Bottom Bar: Faculty & Free PDF Badge */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-amber-300">
                  👨‍🏫
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{facultyName}</p>
                  <p className="text-[10px] text-slate-400">{activeInstitute.city}</p>
                </div>
              </div>

              <div className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow">
                🎁 {tagline}
              </div>
            </div>

            {/* Glow orb */}
            <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          {/* YouTube SEO Copy Boxes */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>YouTube वीडियो मेटा एवं SEO टैग्स (कॉपी करने के लिए रेडी)</span>
            </h4>

            {/* Video Title */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900">
              <div className="truncate mr-2 font-medium">
                <span className="text-slate-500 font-bold">Title: </span>
                {generatedTitle}
              </div>
              <button
                onClick={() => copyText(generatedTitle, setCopiedTitle)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white shadow-sm shrink-0 transition"
              >
                {copiedTitle ? "कॉपी हो गया!" : "टाइटल कॉपी करें"}
              </button>
            </div>

            {/* Video Tags */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
              <div className="truncate mr-2 font-mono text-[11px] text-slate-600">
                <span className="text-slate-500 font-bold">Tags: </span>
                {generatedTags}
              </div>
              <button
                onClick={() => copyText(generatedTags, setCopiedTags)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-white shadow-sm shrink-0 transition"
              >
                {copiedTags ? "टैग्स कॉपी हो गए!" : "टैग्स कॉपी करें"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
