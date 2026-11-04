/** Trims a typed link and adds https:// to a bare host. Empty input gives "". */
export function normalizeUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** True for an http(s) link with no spaces and a real host (a dot, or localhost). Expects normalizeUrl's output. */
export function isValidUrl(url: string) {
  if (/\s/.test(url)) return false
  try {
    const { protocol, hostname } = new URL(url)
    return /^https?:$/.test(protocol) && (hostname.includes(".") || hostname === "localhost")
  } catch {
    return false
  }
}
