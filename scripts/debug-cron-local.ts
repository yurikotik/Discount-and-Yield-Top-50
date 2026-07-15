#!/usr/bin/env tsx
/**
 * Local cron auth + batch-0 fetch debug (no Vercel).
 * Usage:
 *   CRON_SECRET=... pnpm exec tsx scripts/debug-cron-local.ts
 *   CRON_SECRET=... BLOB_READ_WRITE_TOKEN=... pnpm exec tsx scripts/debug-cron-local.ts --save
 */
import { fetchUniverse, FUNDS_PER_BATCH, TOTAL_BATCHES } from "../lib/cef-connect/fetch-universe"
import {
  rebuildLatestFromBatches,
  resolveBatchRunId,
  saveBatchSnapshot,
} from "../lib/cef-storage"

function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim() || undefined
}

function hasValidBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  if (!match) return false
  return match[1].trim() === secret
}

function isVercelCronRequest(headers: Record<string, string>): boolean {
  const ua = (headers["user-agent"] ?? "").toLowerCase()
  if (ua.includes("vercel-cron")) return true
  if (headers["x-vercel-cron-schedule"]) return true
  return headers["x-vercel-cron"] === "1"
}

function simulateAuth(label: string, headers: Record<string, string>) {
  const secret = getCronSecret()
  const authHeader = headers.authorization ?? null
  const checks = {
    hasCronSecretEnv: Boolean(secret),
    secretLength: secret?.length ?? 0,
    hasAuthHeader: Boolean(authHeader),
    bearerMatch: secret ? hasValidBearer(authHeader, secret) : false,
    isCronUa: isVercelCronRequest(headers),
  }
  const authorized =
    !secret ||
    checks.bearerMatch ||
    checks.isCronUa ||
    (headers.secretQuery?.trim() === secret)
  console.log(`\n[auth] ${label}`)
  console.log(checks)
  console.log("→ authorized:", authorized)
  return authorized
}

async function main() {
  const secret = getCronSecret()
  if (!secret) {
    console.error("Set CRON_SECRET env var")
    process.exit(1)
  }

  console.log("=== Local cron debug ===")
  console.log({
    FUNDS_PER_BATCH,
    TOTAL_BATCHES,
    secretLength: secret.length,
    secretPreview: `${secret.slice(0, 8)}…${secret.slice(-8)}`,
    hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    save: process.argv.includes("--save"),
  })

  // Simulate what Vercel sends on scheduled cron
  simulateAuth("Vercel scheduled cron (Bearer + UA)", {
    authorization: `Bearer ${secret}`,
    "user-agent": "vercel-cron/1.0",
    "x-vercel-cron-schedule": "40 6 * * *",
  })

  // Simulate newline-polluted env (common 401 cause)
  const polluted = secret + "\n"
  const authClean = `Bearer ${secret}`
  console.log("\n[auth] Polluted env CRON_SECRET with trailing \\n vs clean Bearer")
  console.log({
    exactMatchWouldFail: authClean !== `Bearer ${polluted}`,
    trimmedMatchOk: hasValidBearer(authClean, polluted.trim()),
  })

  // Simulate missing Authorization (UA only) — our route allows this
  simulateAuth("UA only (no Bearer)", {
    "user-agent": "vercel-cron/1.0",
  })

  // Simulate random browser hit
  simulateAuth("Browser with no auth", {
    "user-agent": "Mozilla/5.0",
  })

  console.log("\n=== Fetch batch 0 ===")
  const t0 = Date.now()
  const snapshot = await fetchUniverse({
    batch: 0,
    batchCount: TOTAL_BATCHES,
    onProgress: (d, t, x) => console.log(`  [${d}/${t}] ${x} @ ${((Date.now() - t0) / 1000).toFixed(1)}s`),
  })
  console.log({
    batchProfiles: snapshot.profiles.length,
    tickers: snapshot.tickers,
    errors: snapshot.errors,
    durationMs: Date.now() - t0,
  })

  if (process.argv.includes("--save")) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("\n--save requires BLOB_READ_WRITE_TOKEN")
      process.exit(1)
    }
    const runId = await resolveBatchRunId(0)
    const path = await saveBatchSnapshot(runId, 0, snapshot)
    const rebuilt = await rebuildLatestFromBatches(runId, TOTAL_BATCHES)
    console.log("\n=== Saved to Blob ===", {
      path,
      runId,
      profileCount: rebuilt.snapshot.profiles.length,
      todayProfileCount: rebuilt.todayProfileCount,
      complete: rebuilt.complete,
    })
  } else {
    console.log("\n(Skip Blob write — pass --save with BLOB_READ_WRITE_TOKEN to persist)")
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err)
  process.exit(1)
})
