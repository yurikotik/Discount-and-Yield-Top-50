import { NextResponse } from "next/server"
import { CEF_TICKERS } from "@/lib/cef-tickers"
import { fetchUniverse, FUNDS_PER_BATCH, TOTAL_BATCHES } from "@/lib/cef-connect/fetch-universe"
import {
  isMarketFetchWindow,
  rebuildLatestFromBatches,
  resolveBatchRunId,
  saveBatchSnapshot,
} from "@/lib/cef-storage"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Vercel cron sends UA `vercel-cron/1.0` and `x-vercel-cron-schedule`. */
function isVercelCronRequest(request: Request): boolean {
  const ua = (request.headers.get("user-agent") ?? "").toLowerCase()
  if (ua.includes("vercel-cron")) return true
  if (request.headers.get("x-vercel-cron-schedule")) return true
  // Legacy header (older Vercel behavior)
  return request.headers.get("x-vercel-cron") === "1"
}

function getCronSecret(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim()
  return secret || undefined
}

/** Match Bearer token, ignoring CRON_SECRET trailing whitespace/newlines. */
function hasValidBearer(request: Request, secret: string): boolean {
  const authHeader = request.headers.get("authorization")?.trim()
  if (!authHeader) return false
  const match = /^Bearer\s+(.+)$/i.exec(authHeader)
  if (!match) return false
  return match[1].trim() === secret
}

function isAuthorized(request: Request): boolean {
  const secret = getCronSecret()
  if (!secret) return process.env.NODE_ENV !== "production"

  if (hasValidBearer(request, secret)) return true
  if (isVercelCronRequest(request)) return true

  const url = new URL(request.url)
  return url.searchParams.get("secret")?.trim() === secret
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
  const secret = getCronSecret()
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Set CRON_SECRET in Production env (no trailing newline). Vercel cron sends Authorization: Bearer <CRON_SECRET>.",
        hasAuthHeader: Boolean(request.headers.get("authorization")),
        isCronUa: isVercelCronRequest(request),
        hasCronSecretEnv: Boolean(secret),
      },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"
  // Scheduled + dashboard "Run" both send Bearer CRON_SECRET and/or vercel-cron UA.
  const isVercelCron =
    isVercelCronRequest(request) || (secret ? hasValidBearer(request, secret) : false)
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

  // Manual unauthenticated-style calls outside the market window need ?force=1.
  // Bearer CRON_SECRET / Vercel cron must always run (test schedules included).
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
    const rebuilt = await rebuildLatestFromBatches(runId, batchCount)
    const durationMs = Date.now() - started

    return NextResponse.json({
      ok: true,
      path: batchPath,
      runId,
      fetchedAt: rebuilt.snapshot.fetchedAt,
      profileCount: rebuilt.snapshot.profiles.length,
      todayProfileCount: rebuilt.todayProfileCount,
      expectedCount: CEF_TICKERS.length,
      batchProfileCount: snapshot.profiles.length,
      errorCount: rebuilt.snapshot.errors.length,
      errors: rebuilt.snapshot.errors,
      durationMs,
      batch,
      batchCount,
      fundsPerBatch: FUNDS_PER_BATCH,
      complete: rebuilt.complete,
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
