const DEVICE_ID_KEY = "magic-kick-device-id"

function createDeviceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `device-${Math.random().toString(36).slice(2, 12)}`
}

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "server-device"
  }
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const created = createDeviceId()
  window.localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}
