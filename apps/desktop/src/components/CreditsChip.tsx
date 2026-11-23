import { Coins } from "lucide-react";
import { jobTypesFor, type Role } from "@edusuite/shared";
import { useCredits } from "../api/credits.ts";
import { useAiMode } from "../api/ai.ts";

/** The institute's AI credit balance in the header, for roles that can start AI jobs (DN-053). */
export function CreditsChip({ role }: { role: Role }) {
  const usesAi = jobTypesFor(role).length > 0;
  const credits = useCredits(usesAi);
  const mode = useAiMode();
  if (!usesAi || !credits.data) return null;
  const low = credits.data.balance < 10;
  return (
    <>
    {mode.data && mode.data.mode !== "live" && (
      <span
        className="px-2 py-0.5 rounded-lg border border-sky-300/60 text-sky-100 text-[11px] font-semibold"
        title="AI उत्तर असली नहीं हैं: नमूना उत्तर (फिक्स्चर मोड, DN-012)"
      >
        {mode.data.mode === "record" ? "AI रिकॉर्डिंग मोड" : "AI फिक्स्चर मोड"}
      </span>
    )}
    <div
      className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold ${
        low ? "border-red-400/60 text-red-200" : "border-amber-400/25 text-amber-200"
      }`}
      title="आपके संस्थान के बचे AI क्रेडिट"
    >
      <Coins className="w-3 h-3 text-amber-400" aria-hidden="true" />
      <span>AI क्रेडिट: {credits.data.balance.toLocaleString("hi-IN")}</span>
      {low && <span className="sr-only">(कम बचे हैं)</span>}
    </div>
    </>
  );
}
