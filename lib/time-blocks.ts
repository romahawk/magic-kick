import { localDateISO } from "@/lib/weekly-plan"

/**
 * P20 (CC-2): whether a block on `dayISO` that ends at `endTime` ("HH:mm") is over at `now`, in local
 * time like the rest of Execution. A block that ends now is over. "00:00" (or "24:00") as an end
 * means the end of that day, not its start. Earlier days are over, later days are not.
 */
export function isPast(endTime: string, dayISO: string, now: Date): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(endTime)
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(dayISO)) return false
  const todayISO = localDateISO(now)
  if (dayISO !== todayISO) return dayISO < todayISO
  const endMinutes = Number(match[1]) * 60 + Number(match[2])
  const end = endMinutes === 0 ? 24 * 60 : endMinutes
  return end <= now.getHours() * 60 + now.getMinutes()
}
