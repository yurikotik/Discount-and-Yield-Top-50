import { list, put } from "@vercel/blob"
import type { CEFUniverseSnapshot } from "./cef-types"

const SNAPSHOT_PREFIX = "cef-universe/"
const LATEST_PATH = `${SNAPSHOT_PREFIX}latest.json`

export async function saveUniverseSnapshot(snapshot: CEFUniverseSnapshot): Promise<string> {
  const timestamp = snapshot.fetchedAt.replace(/[:.]/g, "-")
  const datedPath = `${SNAPSHOT_PREFIX}${timestamp}.json`
  const body = JSON.stringify(snapshot)

  await put(datedPath, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  await put(LATEST_PATH, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  return datedPath
}

export async function loadLatestUniverseSnapshot(): Promise<CEFUniverseSnapshot | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null

  try {
    const { blobs } = await list({ prefix: SNAPSHOT_PREFIX, limit: 100 })
    const latest = blobs.find((b) => b.pathname.endsWith("latest.json"))
    if (!latest?.url) return null

    const res = await fetch(latest.url, { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as CEFUniverseSnapshot
  } catch {
    return null
  }
}

export function isMarketFetchWindow(): boolean {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now)

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? ""
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1)
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? -1)

  if (["Sat", "Sun"].includes(weekday)) return false
  // Run within a 20-minute window around 10:30 AM ET (1 hour after market open).
  if (hour !== 10) return false
  return minute >= 25 && minute <= 45
}
