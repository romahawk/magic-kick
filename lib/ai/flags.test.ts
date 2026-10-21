import { afterEach, describe, expect, it, vi } from "vitest"
import { isAiEnabled } from "./flags"

describe("isAiEnabled (ADR-017: parked, default off)", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("is off when the variable is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_AI_FEATURES_ENABLED", undefined)
    expect(isAiEnabled()).toBe(false)
  })

  it("ignores the old server-only variable", () => {
    vi.stubEnv("NEXT_PUBLIC_AI_FEATURES_ENABLED", undefined)
    vi.stubEnv("AI_FEATURES_ENABLED", "true")
    expect(isAiEnabled()).toBe(false)
  })

  it("is on only for exactly \"true\"", () => {
    vi.stubEnv("NEXT_PUBLIC_AI_FEATURES_ENABLED", "true")
    expect(isAiEnabled()).toBe(true)
    vi.stubEnv("NEXT_PUBLIC_AI_FEATURES_ENABLED", "1")
    expect(isAiEnabled()).toBe(false)
  })
})
