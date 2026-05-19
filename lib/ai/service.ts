import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages"
import { anthropic } from "@/lib/ai/client"

const DEFAULT_MODEL = "claude-sonnet-4-6"
const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_TIMEOUT_MS = 30_000

export interface CallClaudeOptions {
  model?: string
  maxTokens?: number
}

export async function callClaude(
  systemPrompt: string,
  messages: MessageParam[],
  options: CallClaudeOptions = {}
): Promise<string> {
  if (!anthropic) throw new Error("Anthropic client not initialised — check ANTHROPIC_API_KEY")
  if (messages.length === 0) throw new Error("messages must not be empty")

  const { model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS } = options

  const makeRequest = () =>
    anthropic!.messages.create(
      {
        model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages,
      },
      { timeout: DEFAULT_TIMEOUT_MS }
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

  const block = response.content[0]
  if (block.type !== "text") throw new Error("Unexpected non-text response from Claude")
  return block.text
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
  return JSON.parse(cleaned) as T
}
