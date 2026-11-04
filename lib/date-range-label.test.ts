import { describe, expect, it } from "vitest"
import { dayLabel, weekRangeLabel } from "./date-range-label"

describe("weekRangeLabel", () => {
  it("collapses the month inside one month", () => {
    expect(weekRangeLabel("2026-11-02", "2026-11-08")).toBe("Nov 2 – 8, 2026 · Week 45")
  })
  it("names both months across a month boundary", () => {
    expect(weekRangeLabel("2026-11-30", "2026-12-06")).toBe("Nov 30 – Dec 6, 2026 · Week 49")
  })
  it("names both years across a year boundary", () => {
    expect(weekRangeLabel("2026-12-28", "2027-01-03")).toBe("Dec 28, 2026 – Jan 3, 2027 · Week 53")
  })
})

describe("dayLabel", () => {
  it("shows weekday, date and week", () => {
    expect(dayLabel("2026-11-04")).toBe("Wed, Nov 4, 2026 · Week 45")
  })
})
