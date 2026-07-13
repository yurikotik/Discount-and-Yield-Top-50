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
      // Universe is rebuilt incrementally during the cron window — do not CDN-cache.
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    },
  })
}
