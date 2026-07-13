#!/usr/bin/env tsx
/**
 * Local script to fetch the CEF universe and write to Vercel Blob.
 * Usage: CRON_SECRET=dev BLOB_READ_WRITE_TOKEN=... pnpm fetch:universe
 */
import { fetchUniverse } from "../lib/cef-connect/fetch-universe"
import { saveUniverseSnapshot } from "../lib/cef-storage"

async function main() {
  console.log("Fetching CEF universe from CEF Connect…")
  const snapshot = await fetchUniverse({
    onProgress: (done, total, ticker) => {
      console.log(`[${done}/${total}] ${ticker}`)
    },
  })
  const path = await saveUniverseSnapshot(snapshot)
  console.log(`Saved ${snapshot.profiles.length} profiles to ${path}`)
  if (snapshot.errors.length) {
    console.warn("Errors:", snapshot.errors)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
