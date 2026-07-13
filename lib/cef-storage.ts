import { list, put } from "@vercel/blob"
import { CEF_TICKERS } from "./cef-tickers"
import { computeRankings } from "./cef-scoring"
import type { CEFProfile, CEFUniverseSnapshot } from "./cef-types"

const SNAPSHOT_PREFIX = "cef-universe/"
const LATEST_PATH = `${SNAPSHOT_PREFIX}latest.json`
const BATCHES_PREFIX = `${SNAPSHOT_PREFIX}batches/`
const MANIFEST_PATH = `${BATCHES_PREFIX}manifest.json`

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

function etRunId(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date())
}

function batchPath(runId: string, batch: number): string {
  return `${BATCHES_PREFIX}${runId}/batch-${batch}.json`
}

async function fetchJsonFromBlob<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  return (await res.json()) as T
}

async function loadManifest(): Promise<BatchManifest | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null

  try {
    const { blobs } = await list({ prefix: BATCHES_PREFIX, limit: 100 })
    const manifest = blobs.find((b) => b.pathname === MANIFEST_PATH)
    if (!manifest?.url) return null
    return fetchJsonFromBlob<BatchManifest>(manifest.url)
  } catch {
    return null
  }
}

async function startBatchRun(): Promise<string> {
  const runId = etRunId()
  const manifest: BatchManifest = { runId, startedAt: new Date().toISOString() }
  await put(MANIFEST_PATH, JSON.stringify(manifest), BLOB_PUT_OPTS)
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

/** Merge all batch files for the run and write latest.json. */
export async function rebuildLatestFromBatches(
  runId: string,
  batchCount: number,
): Promise<CEFUniverseSnapshot> {
  const parts = await loadBatchSnapshots(runId, batchCount)
  const merged = mergeUniverseSnapshots(parts)
  await saveUniverseSnapshot(merged)
  return merged
}

export async function saveUniverseSnapshot(snapshot: CEFUniverseSnapshot): Promise<string> {
  const timestamp = snapshot.fetchedAt.replace(/[:.]/g, "-")
  const datedPath = `${SNAPSHOT_PREFIX}${timestamp}.json`
  const body = JSON.stringify(snapshot)

  await put(datedPath, body, BLOB_PUT_OPTS)
  await put(LATEST_PATH, body, BLOB_PUT_OPTS)

  return datedPath
}

export async function loadLatestUniverseSnapshot(): Promise<CEFUniverseSnapshot | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null

  try {
    const { blobs } = await list({ prefix: SNAPSHOT_PREFIX, limit: 100 })
    const latest = blobs.find((b) => b.pathname.endsWith("latest.json"))
    if (!latest?.url) return null
    return fetchJsonFromBlob<CEFUniverseSnapshot>(latest.url)
  } catch {
    return null
  }
}

export function isUniverseComplete(snapshot: CEFUniverseSnapshot): boolean {
  return snapshot.profiles.length >= CEF_TICKERS.length
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
