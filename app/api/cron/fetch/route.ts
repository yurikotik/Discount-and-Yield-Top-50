import { NextResponse } from "next/server"
import { fetchUniverse } from "@/lib/cef-connect/fetch-universe"
import { isMarketFetchWindow, saveUniverseSnapshot } from "@/lib/cef-storage"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"

  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) return true

  // Vercel Cron sends this header automatically when CRON_SECRET is configured.
  if (request.headers.get("x-vercel-cron") === "1") return true

  const url = new URL(request.url)
  return url.searchParams.get("secret") === secret
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"

  if (!force && !isMarketFetchWindow()) {
    return NextResponse.json({
      skipped: true,
      reason: "Outside 10:25–10:45 AM ET weekday fetch window. Pass ?force=1 to override.",
    })
  }

  try {
    const snapshot = await fetchUniverse()
    const path = await saveUniverseSnapshot(snapshot)

    return NextResponse.json({
      ok: true,
      path,
      fetchedAt: snapshot.fetchedAt,
      profileCount: snapshot.profiles.length,
      errorCount: snapshot.errors.length,
      errors: snapshot.errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
