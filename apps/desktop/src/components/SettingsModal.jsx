import React, { useState } from "react";
import {
  X,
  Key,
  School,
  Sparkles,
  Save,
  Check,
  ShieldCheck,
  Cpu,
} from "lucide-react";

export default function SettingsModal({ isOpen, ...props }) {
  // Hooks live in SettingsForm so they run in the same order on every render
  // (rules of hooks). The form remounts on each open, so its fields start fresh.
  if (!isOpen) return null;
  return <SettingsForm {...props} />;
}

function SettingsForm({
  onClose,
  activeInstitute,
  onUpdateInstitute,
  apiKey,
  onSaveApiKey,
}) {
  const [name, setName] = useState(activeInstitute.name);
  const [tagline, setTagline] = useState(activeInstitute.tagline);
  const [phone, setPhone] = useState(activeInstitute.phone);
  const [city, setCity] = useState(activeInstitute.city);
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateInstitute({
      ...activeInstitute,
      name,
      tagline,
      phone,
      city,
    });
    onSaveApiKey(keyInput);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              Studio Settings & Configuration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Section 1: AI Engine */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                <span>Google Gemini AI API Key</span>
              </label>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Stored locally
              </span>
            </div>

            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste your Gemini API key (AIzaSy...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Agar aapke paas API key nahi hai, tab bhi app built-in dynamic
              generators se offline PPTX, Question Papers aur Notices generate
              karega.
            </p>
          </div>

          {/* Section 2: Institute Branding */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <School className="w-4 h-4" />
              <span>Institute Profile & Branding</span>
            </label>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-300 font-medium">
                  School / Coaching Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-medium">
                  Tagline / Motto
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-300 font-medium">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 font-medium">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition transform active:scale-95"
            >
              {savedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
