import { describe, expect, it } from "vitest"
import { defaultTaskCategory, firstCategory, withUsedCategories } from "./categories"

describe("firstCategory", () => {
  it("is General when the list has it, wherever it sits", () => {
    expect(firstCategory(["Learning", "Sport & Hobby", "General", "Trading"])).toBe("General")
    expect(firstCategory(["Learning", "general"])).toBe("general")
  })

  it("is the first category when the list has no General", () => {
    expect(firstCategory(["Learning", "Trading"])).toBe("Learning")
  })

  it("is General for an empty profile (the defaults include it)", () => {
    expect(firstCategory([])).toBe("General")
    expect(firstCategory(undefined)).toBe("General")
  })
})

describe("defaultTaskCategory", () => {
  it("prefers the project's category, then General", () => {
    const list = ["Learning", "General", "Finance"]
    expect(defaultTaskCategory(list, { category: "Finance" })).toBe("Finance")
    expect(defaultTaskCategory(list, { category: "Gone" })).toBe("General")
    expect(defaultTaskCategory(list)).toBe("General")
  })
})

describe("withUsedCategories", () => {
  it("lists the profile's and the used categories alphabetically, ignoring case", () => {
    const list = ["Learning", "Sport & Hobby", "Finance", "AI-Edge", "General"]
    const items = [{ category: "Trading" }, { category: "admin-DE" }, { category: "Old", deleted: true }]
    expect(withUsedCategories(list, items)).toEqual(["admin-DE", "AI-Edge", "Finance", "General", "Learning", "Sport & Hobby", "Trading"])
  })
})
