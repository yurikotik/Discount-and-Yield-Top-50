import { NextResponse } from "next/server"
import { loadLatestUniverseSnapshot } from "@/lib/cef-storage"

export const dynamic = "force-dynamic"

export async function GET() {
  const snapshot = await loadLatestUniverseSnapshot()

  if (!snapshot) {
    return NextResponse.json(
      {
        error: "No universe snapshot available. Run the fetch cron or POST /api/cron/fetch with CRON_SECRET.",
        profiles: [],
        rankings: [],
      },
      { status: 503 },
    )
  }

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  })
}
