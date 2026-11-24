import { useEffect, useId, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Clock, Eye, EyeOff, Key, Lock, LogIn, ShieldCheck, User } from "lucide-react";
import { EDUSUITE_MARK } from "../utils/branding.ts";
import { ApiError } from "../api/client.ts";
import type { ApiError as ApiErrorType } from "../api/client.ts";
import { tx, uiLocale } from "../i18n/index.ts";

type Props = {
  onLogin: (identifier: string, password: string) => Promise<void>;
  /** Why the last session ended (expired at 23:59 IST, revoked, blocked), if it did. */
  endedBecause?: ApiErrorType | undefined;
};

/**
 * Daily staff login (plan §05). Checks the ID and password against the API;
 * the role comes from the server, never from the ID. Branch comes from the
 * user record (DN-015). No demo logins or default passwords are shown.
 */
export default function LoginScreen({ onLogin, endedBecause }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState("");
  const idField = useId();
  const pwField = useId();
  const errorId = useId();

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleDateString(uiLocale(), {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);

  // A session that ended on its own (23:59 IST, revoked, blocked) explains itself here.
  const notice = !error && endedBecause && endedBecause.code !== "UNAUTHORIZED" ? endedBecause.message : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) return setError(tx("कृपया कर्मचारी ID, ईमेल या मोबाइल नंबर दर्ज करें।"));
    if (!password) return setError(tx("कृपया पासवर्ड दर्ज करें।"));
    setSubmitting(true);
    try {
      await onLogin(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tx("लॉगिन नहीं हो सका। फिर से कोशिश करें।"));
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  const message = error || notice;

  return (
    <div className="min-h-screen w-screen bg-[#0F172A] text-white flex flex-col justify-between p-4 md:p-8 relative overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <img
            src={EDUSUITE_MARK}
            alt=""
            className="w-10 h-10 rounded-control shrink-0"
          />
          <div>
            <p className="text-sm font-black tracking-wider uppercase text-white">EduSuite</p>
            <p className="text-[11px] text-amber-400 font-bold">{tx("संस्थान प्रबंधन सॉफ्टवेयर")}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          <span>{now}</span>
        </div>
      </div>

      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center">
              <Lock className="w-8 h-8" aria-hidden="true" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{tx("कर्मचारी दैनिक लॉगिन")}</h1>
            <p className="text-xs text-slate-300">{tx("संस्थान की सुरक्षा एवं गोपनीयता हेतु अधिकृत लॉगिन अनिवार्य है।")}</p>
          </div>

          {message && (
            <div
              id={errorId}
              role="alert"
              className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-sm font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor={idField} className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                {tx("कर्मचारी ID / ईमेल / मोबाइल")}
              </label>
              <input
                id={idField}
                type="text"
                autoComplete="username"
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-describedby={message ? errorId : undefined}
                aria-invalid={Boolean(error) || undefined}
                placeholder={tx("उदा. EMP-001 या नाम@संस्थान.com")}
                className="w-full bg-slate-950/80 border border-slate-500 rounded-xl p-3 text-sm text-white placeholder-slate-400 focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={pwField} className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  {tx("पासवर्ड")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-controls={pwField}
                  className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
                  {showPassword ? tx("छुपाएं") : tx("देखें")}
                </button>
              </div>
              <input
                id={pwField}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={message ? errorId : undefined}
                aria-invalid={Boolean(error) || undefined}
                className="w-full bg-slate-950/80 border border-slate-500 rounded-xl p-3 text-sm text-white focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting || undefined}
              className="w-full py-3.5 rounded-xl border border-transparent bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? tx("जाँच हो रही है…") : tx("लॉगिन करें")}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </main>

      <footer className="w-full max-w-5xl mx-auto text-center py-3 border-t border-slate-800/80 text-xs text-slate-300">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          {tx("केवल अधिकृत स्टाफ के लिए। हर लॉगिन रिकॉर्ड किया जाता है।")}
        </p>
      </footer>
    </div>
  );
}
