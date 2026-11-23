import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { creditCost, jobItemCount, type AiJob, type AiJobCreate } from "@edusuite/shared";
import { useAiJob } from "../api/ai.ts";
import { useCredits } from "../api/credits.ts";
import { Button, ConfirmDialog, JobProgress } from "./ui/index.ts";

/**
 * One "make it with AI" control for every tool screen (DN-054): shows the credit
 * cost, starts the job, follows its real progress, and hands the result back.
 * The screen decides what to send (`build`, null when the form isn't ready) and
 * what to do with the result (usually fill its editor, unsaved).
 * `confirmReplace` asks before any credits are spent, when the result would replace
 * work the teacher already wrote.
 */
export function AiGenerate({
  label,
  build,
  onResult,
  hint,
  confirmReplace,
}: {
  label: string;
  build: () => AiJobCreate | null;
  onResult: (result: unknown, job: AiJob) => void;
  hint?: ReactNode;
  /** Set (title and message) when the result would overwrite written work; null otherwise. */
  confirmReplace?: { title: string; message: string } | null;
}) {
  const [asking, setAsking] = useState(false);
  const credits = useCredits();
  const ai = useAiJob();
  const body = build();
  const price = body ? credits.data?.prices.find((p) => p.jobType === body.type) : undefined;
  const cost = body && price ? creditCost(price, jobItemCount(body)) : null;
  const balance = credits.data?.balance;
  const tooFew = cost !== null && balance !== undefined && balance < cost;

  const run = async () => {
    if (!body) return;
    const job = await ai.start(body);
    if (job?.status === "succeeded") onResult(job.result, job);
  };

  return (
    <div className="space-y-2">
      <Button variant="primary" className="w-full" icon={<Sparkles className="size-4" />} loading={ai.running} disabled={!body || tooFew || ai.running} onClick={() => (confirmReplace ? setAsking(true) : void run())}>
        {label}
        {cost !== null && ` · ${cost} क्रेडिट`}
      </Button>
      {tooFew && (
        <p role="alert" className="text-caption text-danger">
          क्रेडिट कम हैं (बचे: {balance}, चाहिए: {cost})। और क्रेडिट के लिए EduSuite से संपर्क करें।
        </p>
      )}
      {(ai.running || ai.job || ai.error) && (
        <JobProgress
          status={ai.error && !ai.job ? "failed" : (ai.job?.status ?? "queued")}
          {...(ai.job && ai.job.progress.total > 0 && { progress: ai.job.progress.done / ai.job.progress.total })}
          {...(ai.error && { error: ai.error.message })}
          onRetry={() => void run()}
        />
      )}
      {ai.job?.status === "succeeded" && (
        <p role="status" className={`text-caption ${ai.job.fixture ? "font-semibold text-warning" : "text-muted"}`}>
          {ai.job.fixture ? "यह नमूना उत्तर है (फिक्स्चर मोड, असली AI नहीं)।" : "AI से तैयार। सेव करने से पहले जाँच लें और ज़रूरत हो तो बदलें।"}
        </p>
      )}
      {hint && <p className="text-caption text-muted">{hint}</p>}
      {confirmReplace && (
        <ConfirmDialog
          open={asking}
          title={confirmReplace.title}
          message={`${confirmReplace.message}${cost !== null ? ` इसमें ${cost} क्रेडिट लगेंगे।` : ""}`}
          confirmLabel="हाँ, AI से बनाएँ"
          cancelLabel="रुकें"
          onConfirm={() => {
            setAsking(false);
            void run();
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </div>
  );
}
