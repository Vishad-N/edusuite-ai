import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IDEMPOTENCY_HEADER, TERMINAL_JOB_STATUSES, type AiJob, type AiJobCreate } from "@edusuite/shared";
import { ApiError } from "./client.ts";
import { useSession } from "./session.tsx";
import { tx } from "../i18n/index.ts";

/** Whether AI answers are real or fixtures (DN-012), for the header badge. */
export function useAiMode() {
  const { client } = useSession();
  return useQuery({
    queryKey: ["ai", "mode"],
    queryFn: () => client.get<{ mode: "fixture" | "record" | "live" }>("/ai/mode"),
    staleTime: 5 * 60_000,
  });
}

const isDone = (job: AiJob) => TERMINAL_JOB_STATUSES.includes(job.status);

/**
 * Starts one AI job and follows it over SSE (DN-054). Each start sends a fresh
 * Idempotency-Key, so a network retry of the same click never pays twice.
 * Credits shown in the header refresh when the job starts and when it ends
 * (a failed job is refunded).
 */
export function useAiJob() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  const [job, setJob] = useState<AiJob | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const start = async (body: AiJobCreate): Promise<AiJob | null> => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setJob(null);
    setRunning(true);
    try {
      let current = await client.post<AiJob>("/ai/jobs", body, { headers: { [IDEMPOTENCY_HEADER]: crypto.randomUUID() } });
      setJob(current);
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      if (!isDone(current)) {
        await client.events(
          `/ai/jobs/${current.id}/events`,
          (data) => {
            current = data as AiJob;
            setJob(current);
          },
          controller.signal,
        );
      }
      // The stream can end before the job does (timeout, dropped connection): read it once more.
      if (!isDone(current)) {
        current = await client.get<AiJob>(`/ai/jobs/${current.id}`);
        setJob(current);
      }
      if (current.status === "failed" && current.error) setError(new ApiError(0, current.error.code, current.error.message));
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      return current;
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof ApiError ? err : new ApiError(0, "INTERNAL", tx("AI काम पूरा नहीं हुआ। फिर से कोशिश करें।")));
      }
      return null;
    } finally {
      if (abort.current === controller) setRunning(false);
    }
  };

  /** Stops the running job (DN-065); the server refunds its credits and the stream ends. */
  const cancel = async (): Promise<void> => {
    if (!job || isDone(job)) return;
    try {
      setJob(await client.post<AiJob>(`/ai/jobs/${job.id}/cancel`));
    } catch (err) {
      // Usually "already finished": the stream delivers the final state.
      if (err instanceof ApiError && err.code !== "AI_JOB_FINISHED") setError(err);
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    }
  };

  return { start, cancel, job, error, running };
}
