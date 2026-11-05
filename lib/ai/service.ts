import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages"
import { anthropic } from "@/lib/ai/client"

const DEFAULT_MODEL = "claude-sonnet-4-6"
const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_TIMEOUT_MS = 30_000

export interface CallClaudeOptions {
  model?: string
  maxTokens?: number
  /** Thinking depth for models that take it (ADR-038: "low" for Haiku 5.5). */
  effort?: "low" | "medium" | "high"
  timeoutMs?: number
}

export async function callClaude(
  systemPrompt: string,
  messages: MessageParam[],
  options: CallClaudeOptions = {}
): Promise<string> {
  if (!anthropic) throw new Error("Anthropic client not initialised — check ANTHROPIC_API_KEY")
  if (messages.length === 0) throw new Error("messages must not be empty")

  const { model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS, effort, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  const makeRequest = () =>
    anthropic!.messages.create(
      {
        model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages,
        ...(effort ? { output_config: { effort } } : {}),
      },
      { timeout: timeoutMs }
    )

  let response: Awaited<ReturnType<typeof makeRequest>>
  try {
    response = await makeRequest()
  } catch (err) {
    // Retry once on overloaded (529)
    if (err instanceof Anthropic.APIError && err.status === 529) {
      response = await makeRequest()
    } else {
      throw err
    }
  }

  if (process.env.NODE_ENV === "development") {
    const usage = response.usage as unknown as Record<string, number>
    const hit = usage.cache_read_input_tokens ?? 0
    const created = usage.cache_creation_input_tokens ?? 0
    console.log(`[AI] model=${model} cache_hit=${hit} cache_created=${created}`)
  }

  return textOf(response.content)
}

/**
 * The answer text. A model with thinking on (Haiku 5.5 by default) can put a thinking block before the
 * text, so the first block is not always the text one: join the text blocks and skip the rest.
 */
export function textOf(content: ReadonlyArray<{ type: string; text?: string }>): string {
  const text = content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("")
  if (!text) throw new Error("No text in the response from Claude")
  return text
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
  return JSON.parse(cleaned) as T
}
