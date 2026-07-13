import { NextResponse } from "next/server"
import { fetchUniverse } from "@/lib/cef-connect/fetch-universe"
import { isMarketFetchWindow, loadLatestUniverseSnapshot, saveUniverseSnapshot } from "@/lib/cef-storage"
import type { CEFProfile, CEFUniverseSnapshot } from "@/lib/cef-types"
import { computeRankings } from "@/lib/cef-scoring"

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"
  const isVercelCron = request.headers.get("x-vercel-cron") === "1"
  const batchParam = url.searchParams.get("batch")
  const batchCountParam = url.searchParams.get("batches")
  const batch = batchParam !== null ? Number(batchParam) : undefined
  const batchCount = batchCountParam !== null ? Number(batchCountParam) : undefined

  if (!force && !isVercelCron && !isMarketFetchWindow()) {
    return NextResponse.json({
      skipped: true,
      reason: "Outside 10:25–10:45 AM ET weekday fetch window. Pass ?force=1 to override.",
    })
  }

  try {
    const started = Date.now()
    const snapshot = await fetchUniverse({
      batch: Number.isFinite(batch) ? batch : undefined,
      batchCount: Number.isFinite(batchCount) ? batchCount : undefined,
    })

    let finalSnapshot = snapshot

    if (batch !== undefined && batchCount !== undefined && batchCount > 1) {
      if (batch > 0) {
        const existing = await loadLatestUniverseSnapshot()
        finalSnapshot = existing ? mergeSnapshots([existing, snapshot]) : snapshot
      }
    }

    const path = await saveUniverseSnapshot(finalSnapshot)
    const durationMs = Date.now() - started

    return NextResponse.json({
      ok: true,
      path,
      fetchedAt: finalSnapshot.fetchedAt,
      profileCount: finalSnapshot.profiles.length,
      errorCount: finalSnapshot.errors.length,
      errors: finalSnapshot.errors,
      durationMs,
      batch: batch ?? null,
      batchCount: batchCount ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: "If this persists, try split batches: ?force=1&batch=0&batches=2 then ?force=1&batch=1&batches=2",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
