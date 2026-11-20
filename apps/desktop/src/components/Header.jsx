import React from "react";
import {
  Settings,
  Minus,
  Square,
  X,
  ChevronDown,
  PhoneCall,
  MapPin,
  Calendar,
  LogOut,
} from "lucide-react";
import { SATYADHI_LOGO } from "../utils/mediaHelper";

export default function Header({
  activeInstitute,
  setActiveInstitute,
  institutes,
  onOpenSettings,
  apiKeySet,
  lang,
  onLanguageChange,
  t,
  currentUser,
  onLogout,
}) {
  return (
    <header className="h-[52px] bg-[#0b1324] border-b border-slate-800/90 flex items-center justify-between px-3 md:px-4 select-none shrink-0 z-20 text-white shadow-sm">
      {/* Left: Compact Brand Logo & Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img
          src={activeInstitute?.logo || SATYADHI_LOGO}
          alt="Satyadhi Sharma Logo"
          className="w-8 h-8 rounded-full object-contain bg-amber-300 ring-1.5 ring-amber-400/90 shadow-sm shrink-0"
        />
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-white tracking-tight text-sm">
              {lang === "hi" ? (
                <>सत्याधी शर्मा <span className="text-amber-400">क्लासेज & टेक</span></>
              ) : (
                <>Satyadhi Sharma <span className="text-amber-400">Classes & Tech</span></>
              )}
            </span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shadow-xs tracking-wider">
              {t.appBadge || "COACHING OS"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-none mt-1 hidden sm:block">
            इंदौर (म.प्र.) • प्रतियोगी परीक्षा संस्थान
          </p>
        </div>
      </div>

      {/* Center: Compact Branch & Session Indicator */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        {/* Branch Selector */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-xs text-slate-200 transition cursor-pointer">
            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="font-semibold text-white text-xs">{t.branchMain}</span>
            <span className="text-[10px] text-slate-400 hidden xl:inline">({t.branchCity})</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Dropdown */}
          <div className="absolute left-0 mt-1 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 hidden group-hover:block z-50">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              {t.switchBranch}
            </div>
            {institutes.map((inst) => (
              <button
                key={inst.id}
                onClick={() => setActiveInstitute(inst)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                  inst.id === activeInstitute.id
                    ? "bg-amber-400/10 text-amber-300 font-bold"
                    : "text-slate-300"
                }`}
              >
                <div>
                  <div className="font-medium text-xs">{inst.name}</div>
                  <div className="text-[10px] text-slate-500">{inst.city}</div>
                </div>
                {inst.id === activeInstitute.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Academic Session */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300">
          <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="font-medium text-[11px]">{t.session}</span>
        </div>
      </div>

      {/* Right: Compact Language, User Info, Logout & Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language Switcher Pill (Compact) */}
        <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 shadow-inner">
          <button
            onClick={() => onLanguageChange("hi")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              lang === "hi"
                ? "bg-amber-400 text-slate-950 shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🇮🇳</span>
            <span>हिन्दी</span>
          </button>
          <button
            onClick={() => onLanguageChange("en")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              lang === "en"
                ? "bg-amber-400 text-slate-950 shadow-xs"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>
        </div>

        {/* Helpline (Compact) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-semibold">
          <PhoneCall className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-[11px]">{t.helpline}</span>
        </div>

        {/* Logged-in Employee Info & Logout Button */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700/80">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/80 shadow-xs">
              <span className="text-sm shrink-0">{currentUser.avatar || "👤"}</span>
              <div className="text-left leading-none">
                <span className="text-[11px] font-bold text-white block truncate max-w-[100px]">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-amber-400 font-semibold block truncate max-w-[100px]">
                  {currentUser.roleLabel ? currentUser.roleLabel.split("(")[0].trim() : "स्टाफ"}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition transform active:scale-95 cursor-pointer"
              title="सॉफ्टवेयर से लॉगआउट करें"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">लॉगआउट</span>
            </button>
          </div>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition border border-slate-700/80 cursor-pointer"
          title="सेटिंग्स"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Desktop window controls preview */}
        <div className="flex items-center gap-0.5 ml-0.5 pl-1.5 border-l border-slate-800">
          <button className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer">
            <Minus className="w-3 h-3" />
          </button>
          <button className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer">
            <Square className="w-2.5 h-2.5" />
          </button>
          <button className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
}
