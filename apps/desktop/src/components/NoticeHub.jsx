import React, { useState } from "react";
import {
  MessageSquareShare,
  Copy,
  Check,
  Printer,
  Sparkles,
  Send,
  FileText,
  AlertCircle,
  Calendar,
  CreditCard,
  Users,
} from "lucide-react";
import { sampleNotices } from "../data/sampleData";
import { SATYADHI_LOGO } from "../utils/mediaHelper";
import { Button, PageHeader } from "./ui/index.ts";

export default function NoticeHub({ activeInstitute }) {
  const [selectedNoticeIdx, setSelectedNoticeIdx] = useState(0);
  const [mode, setMode] = useState("whatsapp"); // "whatsapp" | "formal"
  const [copied, setCopied] = useState(false);

  const notice = sampleNotices[selectedNoticeIdx];

  const handleCopy = () => {
    const textToCopy =
      mode === "whatsapp" ? notice.whatsappText : notice.formalText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageSquareShare className="size-6" />}
        title="Notice & WhatsApp Circulars"
        badge="Parent Broadcast"
        description="Fee reminders, PTM notices, holidays aur exam datesheets ke liye ready-to-send messages."
        actions={
          <>
            <Button icon={<Printer className="size-4" />} onClick={handlePrint}>
              Print Official Notice
            </Button>
            <Button
              variant="primary"
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              onClick={handleCopy}
            >
              {copied ? "Copied to Clipboard!" : "Copy for WhatsApp"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Preset Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Notice Categories
          </div>

          {sampleNotices.map((n, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedNoticeIdx(idx)}
              className={`w-full p-4 rounded-xl text-left border transition ${
                selectedNoticeIdx === idx
                  ? "bg-slate-800 border-amber-500/50 shadow-lg text-white"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  {n.category}
                </span>
                <span className="text-[10px] text-slate-500">18 Nov 2026</span>
              </div>
              <h4 className="text-xs font-bold text-slate-200 mt-2 truncate">
                {n.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target: {n.target}
              </p>
            </button>
          ))}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-8 space-y-4">
          {/* Format Switcher */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs font-semibold text-slate-300 px-2">
              Preview Mode:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode("whatsapp")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  mode === "whatsapp"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                💬 WhatsApp Message
              </button>
              <button
                onClick={() => setMode("formal")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  mode === "formal"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📜 School Circular
              </button>
            </div>
          </div>

          {/* WhatsApp Style Bubble or Formal Letter */}
          {mode === "whatsapp" ? (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Ready to paste directly into WhatsApp Broadcast / Group</span>
              </div>

              <div className="max-w-md p-4 rounded-2xl bg-[#0b2923] border border-emerald-500/30 text-emerald-50 text-xs whitespace-pre-wrap leading-relaxed shadow-lg font-sans select-text">
                {notice.whatsappText}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-xl space-y-4 select-text">
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <img
                    src={activeInstitute?.logo || SATYADHI_LOGO}
                    alt="Satyadhi Sharma Logo"
                    className="w-10 h-10 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400 shadow"
                  />
                  <div className="text-left">
                    <h2 className="text-base font-black uppercase text-slate-900">
                      {activeInstitute.name}
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      {activeInstitute.city} • Phone: {activeInstitute.phone}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-800 font-serif">
                {notice.formalText}
              </div>

              <div className="pt-8 flex justify-end">
                <div className="text-right text-xs">
                  <div className="h-10"></div>
                  <div className="font-bold border-t border-slate-400 pt-1">
                    Authorized Signatory
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {activeInstitute.name}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
