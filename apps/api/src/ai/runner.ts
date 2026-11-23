import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Env } from "../config/env";
import type { ErrorCode } from "../common/errors";
import type { JobContext, JobDefinition } from "./definitions";

/** A job failure the processor understands: an API error code, and whether a retry may help. */
export class AiJobError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly retryable: boolean,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

export type UsageRecord = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
};

export type RunResult = { output: unknown; fixture: boolean; usage: UsageRecord[] };

/** USD per million tokens (first-party rates). Cache writes are 1.25x input. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

export function costOf(model: string, u: Omit<UsageRecord, "model" | "costUsd">): number {
  // Unknown (e.g. a new fallback model): price at Opus 5 rates so cost is never under-reported.
  const p = PRICES[model] ?? { input: 5, output: 25, cacheRead: 0.5 };
  const usd =
    (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.input * 1.25) / 1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

/** Stable key for a recorded fixture: sha256 of the job type and its (validated) input. */
export function fixtureKey(type: string, input: unknown): string {
  const stable = JSON.stringify(input, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
  return createHash("sha256").update(`${type}\n${stable}`).digest("hex");
}

/**
 * Runs one job definition: against Claude (live / record) or from fixtures (DN-012).
 * Claude is called with structured outputs (the job's zod schema), adaptive thinking
 * (the model default), a prompt-cached system prompt, and server-side refusal
 * fallbacks. Streaming keeps long outputs clear of HTTP timeouts.
 */
export class AiRunner {
  private client: Anthropic | undefined;

  constructor(private readonly env: Env) {}

  get mode(): Env["AI_MODE"] {
    return this.env.AI_MODE;
  }

  async run(def: JobDefinition<never, unknown>, input: never, ctx: JobContext): Promise<RunResult> {
    const fixturePath = join(this.env.AI_FIXTURES_DIR, def.type, `${fixtureKey(def.type, input)}.json`);
    if (this.env.AI_MODE === "fixture") {
      const recorded = await readFile(fixturePath, "utf8").catch(() => null);
      const output = recorded ? JSON.parse(recorded) : def.fixture(input, ctx);
      const parsed = def.output.safeParse(output);
      if (!parsed.success) throw new AiJobError("AI_BAD_OUTPUT", false, "fixture does not match the output schema");
      return { output: parsed.data, fixture: true, usage: [] };
    }

    const result = await this.callClaude(def, input, ctx);
    if (this.env.AI_MODE === "record") {
      await mkdir(dirname(fixturePath), { recursive: true });
      await writeFile(fixturePath, `${JSON.stringify(result.output, null, 2)}\n`, "utf8");
    }
    return result;
  }

  private async callClaude(def: JobDefinition<never, unknown>, input: never, ctx: JobContext): Promise<RunResult> {
    this.client ??= new Anthropic({ apiKey: this.env.ANTHROPIC_API_KEY });
    let message: Anthropic.Beta.Messages.BetaMessage;
    try {
      const stream = this.client.beta.messages.stream({
        model: this.env.AI_MODEL,
        max_tokens: def.maxTokens,
        // Refusal fallback (opt-in by default for claude-opus-5-5): a declined request is
        // re-run on a fallback model inside the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: def.effort, format: zodOutputFormat(def.output) },
        system: [{ type: "text", text: def.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: def.user(input, ctx) as Anthropic.Beta.Messages.BetaContentBlockParam[] }],
      });
      message = await stream.finalMessage();
    } catch (err) {
      throw toJobError(err);
    }

    if (message.stop_reason === "refusal") throw new AiJobError("AI_REFUSED", false, message.stop_details?.category ?? undefined);
    if (message.stop_reason === "max_tokens") throw new AiJobError("AI_BAD_OUTPUT", false, "output hit max_tokens");

    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new AiJobError("AI_BAD_OUTPUT", true, "not JSON");
    }
    const parsed = def.output.safeParse(json);
    if (!parsed.success) throw new AiJobError("AI_BAD_OUTPUT", true, "schema mismatch");

    const u = message.usage;
    const tokens = {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    };
    return { output: parsed.data, fixture: false, usage: [{ model: message.model, ...tokens, costUsd: costOf(message.model, tokens) }] };
  }
}

/** Maps SDK errors to job errors: rate limits, 5xx and network problems are worth a retry. */
export function toJobError(err: unknown): AiJobError {
  if (err instanceof AiJobError) return err;
  if (err instanceof Anthropic.RateLimitError) return new AiJobError("AI_UNAVAILABLE", true, "rate limited");
  if (err instanceof Anthropic.APIConnectionError) return new AiJobError("AI_UNAVAILABLE", true, "connection");
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    if (status >= 500 || status === 408 || status === 409) return new AiJobError("AI_UNAVAILABLE", true, `status ${status}`);
    // 400/401/403/404: retrying the same request won't help; the details go to the worker log only.
    return new AiJobError("AI_UNAVAILABLE", false, `status ${status}`);
  }
  return new AiJobError("AI_UNAVAILABLE", true, err instanceof Error ? err.message : "unknown");
}
