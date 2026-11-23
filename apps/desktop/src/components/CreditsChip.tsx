import { Coins } from "lucide-react";
import { jobTypesFor, type Role } from "@edusuite/shared";
import { useCredits } from "../api/credits.ts";

/** The institute's AI credit balance in the header, for roles that can start AI jobs (DN-053). */
export function CreditsChip({ role }: { role: Role }) {
  const usesAi = jobTypesFor(role).length > 0;
  const credits = useCredits(usesAi);
  if (!usesAi || !credits.data) return null;
  const low = credits.data.balance < 10;
  return (
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
  );
}
