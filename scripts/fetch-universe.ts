#!/usr/bin/env tsx
/**
 * Local script: fetch all CEF batches and merge into Blob.
 * Usage: BLOB_READ_WRITE_TOKEN=... pnpm fetch:universe
 */
import { fetchUniverse, FUNDS_PER_BATCH, TOTAL_BATCHES } from "../lib/cef-connect/fetch-universe"
import {
  isUniverseComplete,
  rebuildLatestFromBatches,
  resolveBatchRunId,
  saveBatchSnapshot,
} from "../lib/cef-storage"

async function main() {
  console.log(
    `Fetching CEF universe in ${TOTAL_BATCHES} batches of up to ${FUNDS_PER_BATCH} funds…`,
  )

  let runId = ""

  for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
    console.log(`\n── Batch ${batch + 1}/${TOTAL_BATCHES} ──`)
    const snapshot = await fetchUniverse({
      batch,
      batchCount: TOTAL_BATCHES,
      onProgress: (done, total, ticker) => {
        console.log(`  [${done}/${total}] ${ticker}`)
      },
    })

    runId = await resolveBatchRunId(batch)
    const path = await saveBatchSnapshot(runId, batch, snapshot)
    const merged = await rebuildLatestFromBatches(runId, TOTAL_BATCHES)
    console.log(
      `  Saved batch → ${path} | universe: ${merged.profiles.length} profiles (batch errors: ${snapshot.errors.length})`,
    )
  }

  const final = await rebuildLatestFromBatches(runId, TOTAL_BATCHES)
  console.log(`\nDone. Total profiles: ${final.profiles.length} (complete: ${isUniverseComplete(final)})`)
  if (final.errors.length) {
    console.warn("Errors:", final.errors)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
