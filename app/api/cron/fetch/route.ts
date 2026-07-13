import { NextResponse } from "next/server"
import { CEF_TICKERS } from "@/lib/cef-tickers"
import { fetchUniverse, FUNDS_PER_BATCH, TOTAL_BATCHES } from "@/lib/cef-connect/fetch-universe"
import {
  isMarketFetchWindow,
  isUniverseComplete,
  rebuildLatestFromBatches,
  resolveBatchRunId,
  saveBatchSnapshot,
} from "@/lib/cef-storage"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"

  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) return true

  if (request.headers.get("x-vercel-cron") === "1") return true

  const url = new URL(request.url)
  return url.searchParams.get("secret") === secret
}

function resolveBatchParams(url: URL): { batch: number; batchCount: number } | { error: string } {
  const batchParam = url.searchParams.get("batch")
  const batchCountParam = url.searchParams.get("batches")

  if (batchParam === null || batchCountParam === null) {
    return {
      error:
        `batch and batches are required. Each run fetches at most ${FUNDS_PER_BATCH} funds. ` +
        `Use batch=0..${TOTAL_BATCHES - 1}&batches=${TOTAL_BATCHES}`,
    }
  }

  const batch = Number(batchParam)
  const batchCount = Number(batchCountParam)

  if (!Number.isInteger(batch) || !Number.isInteger(batchCount)) {
    return { error: "batch and batches must be integers" }
  }
  if (batchCount !== TOTAL_BATCHES) {
    return {
      error: `batches must be ${TOTAL_BATCHES} (${FUNDS_PER_BATCH} funds/batch for the current universe)`,
    }
  }
  if (batch < 0 || batch >= TOTAL_BATCHES) {
    return { error: `batch must be 0..${TOTAL_BATCHES - 1}` }
  }

  return { batch, batchCount }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"
  const isVercelCron = request.headers.get("x-vercel-cron") === "1"
  const resolved = resolveBatchParams(url)

  if ("error" in resolved) {
    return NextResponse.json(
      {
        ok: false,
        error: resolved.error,
        fundsPerBatch: FUNDS_PER_BATCH,
        totalBatches: TOTAL_BATCHES,
        hint: `Example: ?force=1&batch=0&batches=${TOTAL_BATCHES}`,
      },
      { status: 400 },
    )
  }

  const { batch, batchCount } = resolved

  if (!force && !isVercelCron && !isMarketFetchWindow()) {
    return NextResponse.json({
      skipped: true,
      reason: "Outside 10:25–10:45 AM ET weekday fetch window. Pass ?force=1 to override.",
    })
  }

  try {
    const started = Date.now()
    const snapshot = await fetchUniverse({ batch, batchCount })
    const runId = await resolveBatchRunId(batch)
    const batchPath = await saveBatchSnapshot(runId, batch, snapshot)
    const finalSnapshot = await rebuildLatestFromBatches(runId, batchCount)
    const durationMs = Date.now() - started

    return NextResponse.json({
      ok: true,
      path: batchPath,
      runId,
      fetchedAt: finalSnapshot.fetchedAt,
      profileCount: finalSnapshot.profiles.length,
      expectedCount: CEF_TICKERS.length,
      batchProfileCount: snapshot.profiles.length,
      batchesLoaded: Math.ceil(finalSnapshot.profiles.length / FUNDS_PER_BATCH),
      errorCount: finalSnapshot.errors.length,
      errors: finalSnapshot.errors,
      durationMs,
      batch,
      batchCount,
      fundsPerBatch: FUNDS_PER_BATCH,
      complete: isUniverseComplete(finalSnapshot),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        error: message,
        fundsPerBatch: FUNDS_PER_BATCH,
        totalBatches: TOTAL_BATCHES,
        hint: `Run in order: batch=0..${TOTAL_BATCHES - 1} with batches=${TOTAL_BATCHES}`,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
