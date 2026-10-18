import { describe, expect, it } from "vitest"
import { isPast } from "./time-blocks"

// Local time, as the app uses it.
const at = (hhmm: string, day = "2026-10-17") => new Date(`${day}T${hhmm}:00`)

describe("isPast (P20, CC-2)", () => {
  it("is past once the end time is reached, not before", () => {
    expect(isPast("11:00", "2026-10-17", at("13:44"))).toBe(true)
    expect(isPast("13:44", "2026-10-17", at("13:44"))).toBe(true)
    expect(isPast("13:45", "2026-10-17", at("13:44"))).toBe(false)
  })

  it("treats earlier days as past and later days as not", () => {
    expect(isPast("23:00", "2026-10-16", at("00:05"))).toBe(true)
    expect(isPast("06:00", "2026-10-18", at("23:59"))).toBe(false)
  })

  it("reads a 00:00 or 24:00 end as the end of that day", () => {
    expect(isPast("00:00", "2026-10-17", at("23:59"))).toBe(false)
    expect(isPast("24:00", "2026-10-17", at("23:59"))).toBe(false)
    expect(isPast("00:00", "2026-10-17", at("00:01", "2026-10-18"))).toBe(true)
  })

  it("is never past for input it cannot read", () => {
    expect(isPast("", "2026-10-17", at("13:44"))).toBe(false)
    expect(isPast("11:00", "today", at("13:44"))).toBe(false)
  })
})
