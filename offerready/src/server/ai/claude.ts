import "server-only";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("Claude isn't configured. Add ANTHROPIC_API_KEY to .env.local to turn on AI drafting.");
  }
}

export class AiRequestError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!aiConfigured()) throw new AiNotConfiguredError();
  // 90s per attempt, 2 retries (SDK default) on 429/5xx/connection errors.
  client ??= new Anthropic({ timeout: 90_000, maxRetries: 2 });
  return client;
}

const PROMPT_DIR = path.join(process.cwd(), "prompts");
const promptCache = new Map<string, string>();

/**
 * Prompt templates live in /prompts as plain markdown so they can be reused outside the app.
 * Every task prompt gets the shared honesty rules, except demo content labeled as invented.
 */
export function loadPrompt(name: string, honesty = true): string {
  const key = `${name}:${honesty}`;
  if (!promptCache.has(key)) {
    const read = (n: string) => fs.readFileSync(path.join(PROMPT_DIR, `${n}.md`), "utf8").trim();
    promptCache.set(key, honesty ? `${read(name)}\n\n${read("_honesty")}` : read(name));
  }
  return promptCache.get(key)!;
}

/**
 * Wraps untrusted text (postings, uploaded resumes) so the model treats it as data. The system
 * prompt for every task says instructions inside these tags must be ignored.
 */
export function untrusted(label: string, text: string): string {
  const safe = text.replace(/<\/?untrusted[^>]*>/gi, "");
  return `<untrusted source="${label}">\n${safe}\n</untrusted>`;
}

export interface StructuredRequest<T extends z.ZodType> {
  prompt: string; // name of a file in /prompts used as the system prompt
  input: string;
  schema: T;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** False only for demo content that is shown to the student as invented (sample answers). */
  honesty?: boolean;
}

/** One structured-output call. Throws AiRequestError instead of ever returning invented content. */
export async function structured<T extends z.ZodType>(req: StructuredRequest<T>): Promise<z.infer<T>> {
  const anthropic = getClient();
  try {
    const response = await anthropic.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: req.maxTokens ?? 16000,
      system: loadPrompt(req.prompt, req.honesty ?? true),
      messages: [{ role: "user", content: req.input }],
      output_config: { format: zodOutputFormat(req.schema), effort: req.effort ?? "medium" },
      // Server-side fallback: if a safety classifier declines, the API retries on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") {
      throw new AiRequestError("Claude declined this request. Try rewording, or continue without AI.", false);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AiRequestError("Claude's response was cut off before it finished. Try again.", true);
    }
    if (!response.parsed_output) {
      throw new AiRequestError("Claude returned a response that didn't match the expected format. Try again.", true);
    }
    return response.parsed_output as z.infer<T>;
  } catch (e) {
    if (e instanceof AiRequestError || e instanceof AiNotConfiguredError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiRequestError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", false);
    if (e instanceof Anthropic.RateLimitError) throw new AiRequestError("Claude is rate-limited right now. Wait a minute and try again.", true);
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AiRequestError("Claude took too long to respond. Try again.", true);
    if (e instanceof Anthropic.APIConnectionError) throw new AiRequestError("Couldn't reach the Anthropic API. Check your connection.", true);
    if (e instanceof Anthropic.APIError) throw new AiRequestError(`Claude request failed (${e.status ?? "error"}).`, (e.status ?? 500) >= 500);
    throw e;
  }
}
