#!/usr/bin/env tsx
/**
 * Local script: fetch all CEF batches (max 10 funds each) and merge into Blob.
 * Usage: BLOB_READ_WRITE_TOKEN=... pnpm fetch:universe
 */
import { fetchUniverse, FUNDS_PER_BATCH, TOTAL_BATCHES } from "../lib/cef-connect/fetch-universe"
import { loadLatestUniverseSnapshot, saveUniverseSnapshot } from "../lib/cef-storage"
import type { CEFProfile, CEFUniverseSnapshot } from "../lib/cef-types"
import { computeRankings } from "../lib/cef-scoring"

function mergeSnapshots(parts: CEFUniverseSnapshot[]): CEFUniverseSnapshot {
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

async function main() {
  console.log(
    `Fetching CEF universe in ${TOTAL_BATCHES} batches of up to ${FUNDS_PER_BATCH} funds…`,
  )

  let merged: CEFUniverseSnapshot | null = null

  for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
    console.log(`\n── Batch ${batch + 1}/${TOTAL_BATCHES} ──`)
    const snapshot = await fetchUniverse({
      batch,
      batchCount: TOTAL_BATCHES,
      onProgress: (done, total, ticker) => {
        console.log(`  [${done}/${total}] ${ticker}`)
      },
    })

    if (batch === 0) {
      merged = snapshot
    } else {
      const existing = (await loadLatestUniverseSnapshot()) ?? merged
      merged = existing ? mergeSnapshots([existing, snapshot]) : snapshot
    }

    const path = await saveUniverseSnapshot(merged!)
    console.log(
      `  Saved checkpoint: ${merged!.profiles.length} profiles → ${path} (batch errors: ${snapshot.errors.length})`,
    )
  }

  console.log(`\nDone. Total profiles: ${merged?.profiles.length ?? 0}`)
  if (merged?.errors.length) {
    console.warn("Errors:", merged.errors)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
