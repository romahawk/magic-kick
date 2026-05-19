import Anthropic from "@anthropic-ai/sdk"

const apiKey = process.env.ANTHROPIC_API_KEY

export const hasAnthropicConfig = Boolean(apiKey)

let anthropicInitError: string | null = null
let anthropic: Anthropic | null = null

if (hasAnthropicConfig) {
  try {
    anthropic = new Anthropic({ apiKey })
  } catch (error) {
    anthropicInitError =
      error instanceof Error ? error.message : "Failed to initialize Anthropic client"
  }
} else {
  anthropicInitError = "ANTHROPIC_API_KEY environment variable is missing."
}

export { anthropic, anthropicInitError }
