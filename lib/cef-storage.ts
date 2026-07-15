import { del, head, list, put } from "@vercel/blob"
import { CEF_TICKERS, TOTAL_BATCHES } from "./cef-tickers"
import { computeRankings } from "./cef-scoring"
import type { CEFProfile, CEFUniverseSnapshot } from "./cef-types"

const SNAPSHOT_PREFIX = "cef-universe/"
const LATEST_PATH = `${SNAPSHOT_PREFIX}latest.json`
const BATCHES_PREFIX = `${SNAPSHOT_PREFIX}batches/`
const MANIFEST_PATH = `${BATCHES_PREFIX}manifest.json`

/** Keep today + yesterday only (ET calendar dates). */
const RETAIN_RUN_DAYS = 2

const BLOB_PUT_OPTS = {
  access: "public" as const,
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
}

interface BatchManifest {
  runId: string
  startedAt: string
}

function etRunId(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(date)
}

function etRunIdDaysAgo(daysAgo: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return etRunId(d)
}

function batchPath(runId: string, batch: number): string {
  return `${BATCHES_PREFIX}${runId}/batch-${batch}.json`
}

async function fetchJsonFromBlob<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  return (await res.json()) as T
}

/** Prefer exact head(); fall back to a narrow list so we never miss latest.json. */
async function resolveBlobUrl(pathname: string): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null

  try {
    const meta = await head(pathname)
    if (meta?.url) return meta.url
  } catch {
    // fall through
  }

  try {
    // Exact/near prefix — finds latest.json even if a broad cef-universe/ list is full
    const { blobs } = await list({ prefix: pathname, limit: 20 })
    const hit = blobs.find((b) => b.pathname === pathname)
    if (hit?.url) return hit.url
  } catch {
    // fall through
  }

  return null
}

async function loadJsonByPathname<T>(pathname: string): Promise<T | null> {
  const url = await resolveBlobUrl(pathname)
  if (!url) return null
  return fetchJsonFromBlob<T>(url)
}

/**
 * Rebuild snapshot from batch files for a runId and optionally republish latest.json.
 * Used when latest.json is missing but batch cron files exist (self-heal).
 */
async function rebuildFromRunFolders(runIds: string[]): Promise<CEFUniverseSnapshot | null> {
  for (const runId of runIds) {
    const parts = await loadBatchSnapshots(runId, TOTAL_BATCHES)
    if (parts.length === 0) continue
    const merged = mergeUniverseSnapshots(parts)
    if (merged.profiles.length === 0) continue
    // Republish latest so the next request is fast
    await put(LATEST_PATH, JSON.stringify(merged), BLOB_PUT_OPTS)
    return merged
  }
  return null
}

async function loadManifest(): Promise<BatchManifest | null> {
  return loadJsonByPathname<BatchManifest>(MANIFEST_PATH)
}

async function startBatchRun(): Promise<string> {
  const runId = etRunId()
  const manifest: BatchManifest = { runId, startedAt: new Date().toISOString() }
  await put(MANIFEST_PATH, JSON.stringify(manifest), BLOB_PUT_OPTS)
  // Drop older batch folders + dated archives so Blob stays small.
  await pruneOldUniverseBlobs(runId).catch(() => undefined)
  return runId
}

/** Resolve the active ET run id. Batch 0 starts a new daily run. */
export async function resolveBatchRunId(batch: number): Promise<string> {
  if (batch === 0) return startBatchRun()
  const manifest = await loadManifest()
  return manifest?.runId ?? etRunId()
}

export function mergeUniverseSnapshots(parts: CEFUniverseSnapshot[]): CEFUniverseSnapshot {
  const profiles: CEFProfile[] = []
  const errors = parts.flatMap((p) => p.errors)
  const seen = new Set<string>()

  for (const part of parts) {
    for (const profile of part.profiles) {
      const ticker = profile.overview.ticker
      if (seen.has(ticker)) continue
      seen.add(ticker)
      profiles.push(profile)
    }
  }

  return {
    version: 1,
    fetchedAt: new Date().toISOString(),
    source: "cefconnect",
    tickers: profiles.map((p) => p.overview.ticker),
    profiles,
    rankings: computeRankings(profiles),
    errors,
  }
}

export async function saveBatchSnapshot(
  runId: string,
  batch: number,
  snapshot: CEFUniverseSnapshot,
): Promise<string> {
  const path = batchPath(runId, batch)
  await put(path, JSON.stringify(snapshot), BLOB_PUT_OPTS)
  return path
}

export async function loadBatchSnapshots(
  runId: string,
  batchCount: number,
): Promise<CEFUniverseSnapshot[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return []

  const prefix = `${BATCHES_PREFIX}${runId}/`
  try {
    const { blobs } = await list({ prefix, limit: batchCount + 5 })
    const byBatch = new Map<number, CEFUniverseSnapshot>()

    for (const blob of blobs) {
      const match = blob.pathname.match(/batch-(\d+)\.json$/)
      if (!match || !blob.url) continue
      const index = Number(match[1])
      if (!Number.isInteger(index) || index < 0 || index >= batchCount) continue
      const snapshot = await fetchJsonFromBlob<CEFUniverseSnapshot>(blob.url)
      if (snapshot) byBatch.set(index, snapshot)
    }

    return Array.from({ length: batchCount }, (_, i) => byBatch.get(i)).filter(
      (s): s is CEFUniverseSnapshot => Boolean(s),
    )
  } catch {
    return []
  }
}

export interface RebuildLatestResult {
  /** What the UI should serve — never drops below previous full universe mid-cron. */
  snapshot: CEFUniverseSnapshot
  /** Profiles fetched successfully in today's run only. */
  todayProfileCount: number
  /** True when today's run has all expected tickers. */
  complete: boolean
}

/**
 * Merge today's batch files, overlay onto the previous latest.json, then publish.
 *
 * Mid-cron guarantee: if yesterday had 48 funds and today has only finished batch 0 (2 funds),
 * latest.json still has 48 — today's 2 replace yesterday's counterparts; the other 46 stay.
 * Users never see an empty/partial universe while cron is in progress.
 */
export async function rebuildLatestFromBatches(
  runId: string,
  batchCount: number,
): Promise<RebuildLatestResult> {
  const parts = await loadBatchSnapshots(runId, batchCount)
  const todayPartial = mergeUniverseSnapshots(parts)
  const existing = await loadLatestUniverseSnapshot()

  // First wins: today's profiles take priority; gaps filled from previous latest.
  const overlaid = existing
    ? mergeUniverseSnapshots([todayPartial, existing])
    : todayPartial

  const complete = isTodayFetchComplete(todayPartial)

  const snapshot: CEFUniverseSnapshot = {
    ...overlaid,
    // Keep last full-refresh timestamp until today's run finishes all tickers.
    fetchedAt: complete ? overlaid.fetchedAt : (existing?.fetchedAt ?? overlaid.fetchedAt),
  }

  await saveUniverseSnapshot(snapshot, { writeArchive: complete })

  return {
    snapshot,
    todayProfileCount: todayPartial.profiles.length,
    complete,
  }
}

/**
 * Always overwrite latest.json (what the UI reads) with the overlaid snapshot.
 * Dated archive only when today's fetch is fully complete.
 */
export async function saveUniverseSnapshot(
  snapshot: CEFUniverseSnapshot,
  options?: { writeArchive?: boolean },
): Promise<string> {
  const body = JSON.stringify(snapshot)

  await put(LATEST_PATH, body, BLOB_PUT_OPTS)

  if (options?.writeArchive) {
    const timestamp = snapshot.fetchedAt.replace(/[:.]/g, "-")
    const datedPath = `${SNAPSHOT_PREFIX}${timestamp}.json`
    await put(datedPath, body, BLOB_PUT_OPTS)
    return datedPath
  }

  return LATEST_PATH
}

/** Read latest.json by exact pathname — never via a capped broad list. */
export async function loadLatestUniverseSnapshot(): Promise<CEFUniverseSnapshot | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null

  const direct = await loadJsonByPathname<CEFUniverseSnapshot>(LATEST_PATH)
  if (direct) return direct

  // Self-heal: cron may have written batch-N.json files while latest.json
  // is missing/unfindable (e.g. old list(limit:100) regressions).
  const recovered = await rebuildFromRunFolders([
    etRunId(),
    etRunIdDaysAgo(1),
    etRunIdDaysAgo(2),
  ])
  return recovered
}

/**
 * Keep only today + yesterday (ET) batch folders and recent complete archives.
 * Helps storage/cost; not required for latest.json correctness after the head() fix.
 */
export async function pruneOldUniverseBlobs(keepRunId = etRunId()): Promise<number> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return 0

  const keepRunIds = new Set<string>([keepRunId])
  for (let i = 1; i < RETAIN_RUN_DAYS; i++) {
    keepRunIds.add(etRunIdDaysAgo(i))
  }

  const toDelete: string[] = []
  let cursor: string | undefined

  do {
    const page = await list({ prefix: SNAPSHOT_PREFIX, limit: 1000, cursor })
    cursor = page.cursor

    for (const blob of page.blobs) {
      const { pathname, url } = blob
      if (!url) continue

      // Always keep latest.json + active manifest
      if (pathname === LATEST_PATH || pathname === MANIFEST_PATH) continue

      // Batch folders: cef-universe/batches/YYYY-MM-DD/...
      const batchMatch = pathname.match(/^cef-universe\/batches\/(\d{4}-\d{2}-\d{2})\//)
      if (batchMatch) {
        if (!keepRunIds.has(batchMatch[1])) toDelete.push(url)
        continue
      }

      // Dated complete archives: cef-universe/2026-07-15T....json
      if (/^cef-universe\/\d{4}-\d{2}-\d{2}T.+\.json$/.test(pathname)) {
        const day = pathname.slice(SNAPSHOT_PREFIX.length, SNAPSHOT_PREFIX.length + 10)
        // Keep archives whose UTC date matches a retained ET run day (best-effort).
        if (![...keepRunIds].some((id) => day === id || pathname.includes(id))) {
          toDelete.push(url)
        }
      }
    }
  } while (cursor)

  if (toDelete.length === 0) return 0

  // Delete in chunks
  for (let i = 0; i < toDelete.length; i += 100) {
    await del(toDelete.slice(i, i + 100))
  }
  return toDelete.length
}

export function isUniverseComplete(snapshot: CEFUniverseSnapshot): boolean {
  return snapshot.profiles.length >= CEF_TICKERS.length
}

/** Today's cron has successfully fetched every ticker in CEF_TICKERS. */
export function isTodayFetchComplete(todayPartial: CEFUniverseSnapshot): boolean {
  if (todayPartial.profiles.length < CEF_TICKERS.length) return false
  const have = new Set(todayPartial.profiles.map((p) => p.overview.ticker.toUpperCase()))
  return CEF_TICKERS.every((t) => have.has(t.toUpperCase()))
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
