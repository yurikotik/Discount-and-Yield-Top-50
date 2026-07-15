#!/usr/bin/env tsx
/**
 * Local script: fetch all CEF batches and merge into Blob.
 * Usage: BLOB_READ_WRITE_TOKEN=... pnpm fetch:universe
 */
import { fetchUniverse, FUNDS_PER_BATCH, TOTAL_BATCHES } from "../lib/cef-connect/fetch-universe"
import {
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
    const rebuilt = await rebuildLatestFromBatches(runId, TOTAL_BATCHES)
    console.log(
      `  Saved batch → ${path} | UI universe: ${rebuilt.snapshot.profiles.length} | today: ${rebuilt.todayProfileCount} (batch errors: ${snapshot.errors.length})`,
    )
  }

  const final = await rebuildLatestFromBatches(runId, TOTAL_BATCHES)
  console.log(
    `\nDone. UI profiles: ${final.snapshot.profiles.length} | today: ${final.todayProfileCount} (complete: ${final.complete})`,
  )
  if (final.snapshot.errors.length) {
    console.warn("Errors:", final.snapshot.errors)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
