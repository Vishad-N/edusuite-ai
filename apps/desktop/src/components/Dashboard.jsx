import React from "react";
import {
  Presentation,
  Image as ImageIcon,
  FileQuestion,
  BookOpen,
  MessageSquareShare,
  Sparkles,
  ArrowRight,
  Download,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Zap,
  BookMarked,
  Video,
  FileSpreadsheet,
  CreditCard,
  Lightbulb,
  Users,
  Radio,
  BookCheck,
  Calendar,
  Camera,
  GraduationCap,
} from "lucide-react";
import { SATYADHI_LOGO } from "../utils/mediaHelper";

export default function Dashboard({
  activeInstitute,
  onNavigate,
  onDownloadSamplePpt,
  t,
  lang,
  currentUser,
}) {
  const quickTools = [
    {
      id: "ocr_ppt",
      title: t.toolScreenshotPptTitle || "स्क्रीनशॉट से स्मार्टबोर्ड PPT मेकर (Bulk OCR)",
      subtitle: t.toolScreenshotPptSub || "टीचर के 30+ प्रश्नों के स्क्रीनशॉट अपलोड करें, AI टेक्स्ट और 4 विकल्प पहचानकर स्मार्टबोर्ड PPT बनाएगा",
      icon: Camera,
      badge: "★ टीचर स्पेशल",
      actionText: t.toolScreenshotPptAction || "स्क्रीनशॉट अपलोड करें",
      color: "text-amber-700 bg-amber-50 border-amber-300 ring-2 ring-amber-400/30",
    },
    {
      id: "youtube",
      title: t.toolYoutubeTitle,
      subtitle: t.toolYoutubeSub,
      icon: Video,
      badge: "YouTube 16:9",
      actionText: t.toolYoutubeAction,
      color: "text-rose-600 bg-rose-50 border-rose-200",
    },
    {
      id: "book",
      title: t.toolBookTitle,
      subtitle: t.toolBookSub,
      icon: BookMarked,
      badge: "Print / PDF",
      actionText: t.toolBookAction,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      id: "dpp",
      title: t.toolDppTitle,
      subtitle: t.toolDppSub,
      icon: FileSpreadsheet,
      badge: "Daily Practice",
      actionText: t.toolDppAction,
      color: "text-teal-600 bg-teal-50 border-teal-200",
    },
    {
      id: "ppt",
      title: t.toolPptTitle,
      subtitle: t.toolPptSub,
      icon: Presentation,
      badge: "PowerPoint .pptx",
      actionText: t.toolPptAction,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      id: "doubt",
      title: t.toolDoubtTitle,
      subtitle: t.toolDoubtSub,
      icon: Lightbulb,
      badge: "Fast Explainer",
      actionText: t.toolDoubtAction,
      color: "text-violet-600 bg-violet-50 border-violet-200",
    },
    {
      id: "receipt",
      title: t.toolReceiptTitle,
      subtitle: t.toolReceiptSub,
      icon: CreditCard,
      badge: "Administration",
      actionText: t.toolReceiptAction,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      id: "test",
      title: t.toolTestTitle,
      subtitle: t.toolTestSub,
      icon: FileQuestion,
      badge: "Word / PDF",
      actionText: t.toolTestAction,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      id: "image",
      title: t.toolImageTitle,
      subtitle: t.toolImageSub,
      icon: ImageIcon,
      badge: "HD Visuals",
      actionText: t.toolImageAction,
      color: "text-purple-600 bg-purple-50 border-purple-200",
    },
    {
      id: "notice",
      title: t.toolNoticeTitle,
      subtitle: t.toolNoticeSub,
      icon: MessageSquareShare,
      badge: "1-Click Copy",
      actionText: t.toolNoticeAction,
      color: "text-orange-600 bg-orange-50 border-orange-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Real Coaching Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-700/80 p-6 md:p-8 shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={activeInstitute?.logo || SATYADHI_LOGO}
              alt="Satyadhi Sharma Logo"
              className="w-20 h-20 md:w-24 md:h-24 rounded-full object-contain bg-amber-300 ring-4 ring-amber-400/80 shadow-2xl shrink-0"
            />
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold shadow-sm">
                <span>{t.heroBadge}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {t.greeting} {activeInstitute.name}
              </h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {t.heroDesc}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => onNavigate("teacher_desk")}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs shadow-md transition transform active:scale-95"
            >
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>👨‍🏫 शिक्षक पोर्टल</span>
            </button>
            <button
              onClick={() => onNavigate("ocr_ppt")}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 transition transform active:scale-95"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>📸 स्क्रीनशॉट से PPT</span>
            </button>
            <button
              onClick={() => onNavigate("youtube")}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition transform active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>{t.btnMakeThumbnail}</span>
            </button>
            <button
              onClick={() => onNavigate("book")}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition shadow-md"
            >
              <BookMarked className="w-4 h-4 text-slate-950" />
              <span>{t.btnNewBook}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Super Admin Management Banner */}
      {currentUser?.role === "superadmin" && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-400/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
              👑
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900">
                सुपर एडमिन कंट्रोल पैनल (Master Control)
              </h4>
              <p className="text-xs text-slate-600">
                संस्थान के सभी शिक्षकों, DTP टाइपिस्ट व स्टाफ के अकाउंट्स, पासवर्ड्स व अनुमतियां (Permissions) प्रबंधित करें।
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("users")}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs shadow-md transition transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            👑 यूजर प्रबंधन खोलें →
          </button>
        </div>
      )}

      {/* Real Coaching Statistics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statBatches, value: t.statBatchesVal, detail: t.statBatchesDet, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: t.statLive, value: t.statLiveVal, detail: t.statLiveDet, icon: Radio, color: "text-rose-600 bg-rose-50" },
          { label: t.statDpp, value: t.statDppVal, detail: t.statDppDet, icon: FileSpreadsheet, color: "text-teal-600 bg-teal-50" },
          { label: t.statBooks, value: t.statBooksVal, detail: t.statBooksDet, icon: BookCheck, color: "text-amber-600 bg-amber-50" },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">
                  {stat.label}
                </span>
                <span className={`p-2 rounded-xl ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {stat.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {stat.detail}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Live YouTube Schedule Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {t.todayLiveTitle}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.todayLiveSub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("youtube")}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>{t.btnSetThumbnail}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tools Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>{t.toolsSectionTitle}</span>
            <span className="text-xs font-normal text-slate-500">
              {t.toolsSectionSub}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => onNavigate(tool.id)}
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tool.color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {tool.badge}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {tool.subtitle}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-amber-600">
                  <span>{tool.actionText}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
