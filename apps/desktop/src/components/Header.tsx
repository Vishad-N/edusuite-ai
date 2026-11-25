import { useState } from "react";
import { Calendar, KeyRound, LogOut, MapPin, PhoneCall, Settings } from "lucide-react";
import { EDUSUITE_MARK } from "../utils/branding.ts";
import { academicSession } from "../utils/academicSession.ts";
import { CreditsChip } from "./CreditsChip.tsx";
import { UpdateButton } from "./UpdateButton.tsx";
import { Button, ConfirmDialog, Modal } from "./ui/index.ts";
import type { LegacyUser } from "../App.tsx";
import { tx } from "../i18n/index.ts";

type Props = {
  instituteName: string;
  branchName: string;
  /** The institute's own helpline (branding.phone); hidden when empty. */
  phone: string;
  lang: "hi" | "en";
  onLanguageChange: (lang: "hi" | "en") => void;
  t: Record<string, string>;
  currentUser: LegacyUser;
  onLogout: () => Promise<void> | void;
  /** Present only for roles that may change institute or branch settings. */
  onOpenSettings?: (() => void) | undefined;
  /** Branches this user may work at; with more than one, the branch chip becomes a switch (DN-070). */
  branches?: Array<{ id: string; name: string; code: string }>;
  currentBranchId?: string;
  onSwitchBranch?: (branchId: string) => Promise<void>;
  onChangePassword?: () => void;
};

/** Native window controls sit over the top-right corner (titleBarOverlay); keep clear of them. */
const OVERLAY_SAFE_PADDING = "calc(100vw - env(titlebar-area-width, 100vw) + 12px)";

export default function Header({
  instituteName,
  branchName,
  phone,
  lang,
  onLanguageChange,
  t,
  currentUser,
  onLogout,
  onOpenSettings,
  branches = [],
  currentBranchId,
  onSwitchBranch,
  onChangePassword,
}: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [branchError, setBranchError] = useState("");
  const canSwitch = branches.length > 1 && Boolean(onSwitchBranch);
  const switchTo = async (id: string) => {
    if (!onSwitchBranch || id === currentBranchId) return setBranchOpen(false);
    setSwitching(id);
    setBranchError("");
    try {
      await onSwitchBranch(id);
      setBranchOpen(false);
    } catch (e) {
      setBranchError(e instanceof Error ? e.message : tx("ब्रांच नहीं बदली जा सकी। फिर से कोशिश करें।"));
    } finally {
      setSwitching(null);
    }
  };
  const branchChip = (
    <>
      <MapPin className="w-3 h-3 text-amber-400" aria-hidden="true" />
      <span className="font-semibold">{branchName}</span>
    </>
  );
  const langButton = (code: "hi" | "en", label: string) => (
    <button
      type="button"
      onClick={() => onLanguageChange(code)}
      aria-pressed={lang === code}
      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
        lang === code ? "bg-amber-400 text-slate-950" : "text-slate-200 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <header
      data-surface="inverse"
      className="h-[52px] bg-[#0b1324] border-b border-slate-800/90 flex items-center justify-between pl-3 md:pl-4 shrink-0 z-20 text-white [-webkit-app-region:drag]"
      style={{ paddingRight: OVERLAY_SAFE_PADDING }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <img src={EDUSUITE_MARK} alt="" className="w-8 h-8 rounded-control shrink-0" />
        <div className="flex flex-col justify-center min-w-0">
          <span className="font-extrabold text-white tracking-tight text-sm truncate">{instituteName}</span>
          <span className="text-[11px] text-slate-300 truncate">{t.appBadge}</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 shrink-0">
        {canSwitch ? (
          <button
            type="button"
            onClick={() => setBranchOpen(true)}
            title={tx("ब्रांच बदलें")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-white hover:border-amber-400 cursor-pointer [-webkit-app-region:no-drag]"
          >
            {branchChip}
            <span className="sr-only">{tx("ब्रांच बदलें")}</span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-white">{branchChip}</span>
        )}
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-200">
          <Calendar className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          {academicSession(lang)}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 [-webkit-app-region:no-drag]">
        <div role="group" aria-label={lang === "hi" ? "भाषा" : "Language"} className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700">
          {langButton("hi", "हिन्दी")}
          {langButton("en", "English")}
        </div>

        <UpdateButton />
        <CreditsChip role={currentUser.role} />

        {phone && (
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-400/25 text-amber-200 text-[11px] font-semibold">
            <PhoneCall className="w-3 h-3 text-amber-400" aria-hidden="true" />
            {phone}
          </div>
        )}

        <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700/80">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/80">
            <span className="text-sm" aria-hidden="true">
              {currentUser.avatar}
            </span>
            <div className="leading-tight">
              <span className="text-[11px] font-bold text-white block truncate max-w-[120px]">{currentUser.name}</span>
              <span className="text-[10px] text-amber-300 font-semibold block truncate max-w-[120px]">{currentUser.roleLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="px-2.5 py-1 rounded-lg border border-transparent bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3 h-3" aria-hidden="true" />
            <span>{lang === "hi" ? "लॉगआउट" : "Log out"}</span>
          </button>
        </div>

        {onChangePassword && (
          <button
            type="button"
            onClick={onChangePassword}
            aria-label={tx("पासवर्ड बदलें")}
            title={tx("पासवर्ड बदलें")}
            className="p-1.5 text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700/80 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={lang === "hi" ? "सेटिंग्स" : "Settings"}
            className="p-1.5 text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700/80 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title={lang === "hi" ? "लॉगआउट करें?" : "Log out?"}
        message={lang === "hi" ? "बिना सेव किया काम खो सकता है।" : "Unsaved work may be lost."}
        confirmLabel={lang === "hi" ? "हाँ, लॉगआउट" : "Yes, log out"}
        cancelLabel={lang === "hi" ? "रद्द करें" : "Cancel"}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await onLogout();
        }}
      />
      <Modal
        open={branchOpen}
        onClose={() => setBranchOpen(false)}
        title={tx("ब्रांच बदलें")}
        description={tx("बिना सेव किया काम खो सकता है। बदलने के बाद डैशबोर्ड खुलेगा।")}
        size="sm"
      >
        <ul className="space-y-2">
          {branches.map((b) => (
            <li key={b.id}>
              <Button
                className="w-full justify-start"
                variant={b.id === currentBranchId ? "primary" : "secondary"}
                icon={<MapPin className="size-4" aria-hidden="true" />}
                loading={switching === b.id}
                disabled={switching !== null}
                aria-current={b.id === currentBranchId ? "true" : undefined}
                onClick={() => void switchTo(b.id)}
              >
                {b.name} <span className="text-caption opacity-80">({b.code})</span>
              </Button>
            </li>
          ))}
        </ul>
        {branchError && (
          <p role="alert" className="mt-3 text-label text-danger">
            {branchError}
          </p>
        )}
      </Modal>
    </header>
  );
}
