import { describe, expect, it } from "vitest"
import { isValidUrl, normalizeUrl } from "./url"

describe("normalizeUrl", () => {
  it("adds https to a bare host, keeps a scheme, trims, and gives empty for blank", () => {
    expect(normalizeUrl(" example.com/a ")).toBe("https://example.com/a")
    expect(normalizeUrl("http://example.com")).toBe("http://example.com")
    expect(normalizeUrl("   ")).toBe("")
  })
})

describe("isValidUrl", () => {
  it("accepts normal links and localhost", () => {
    expect(isValidUrl("https://example.com/docs?q=1")).toBe(true)
    expect(isValidUrl("http://localhost:3000")).toBe(true)
  })
  it("rejects spaces, hosts without a dot, and other schemes", () => {
    expect(isValidUrl(normalizeUrl("not a url!!"))).toBe(false)
    expect(isValidUrl("https://foo")).toBe(false)
    expect(isValidUrl("ftp://example.com")).toBe(false)
  })
})
