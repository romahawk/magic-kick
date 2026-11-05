import { describe, expect, it } from "vitest"
import { textOf } from "./service"

describe("textOf", () => {
  it("reads the text after a thinking block", () => {
    expect(textOf([{ type: "thinking" }, { type: "text", text: '{"suggestions":[]}' }])).toBe('{"suggestions":[]}')
  })
  it("reads a plain text answer", () => {
    expect(textOf([{ type: "text", text: "hi" }])).toBe("hi")
  })
  it("throws when there is no text", () => {
    expect(() => textOf([{ type: "thinking" }])).toThrow()
  })
})
