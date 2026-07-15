import { NextResponse } from "next/server"
import { loadLatestUniverseSnapshot } from "@/lib/cef-storage"

export const dynamic = "force-dynamic"

export async function GET() {
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  const snapshot = await loadLatestUniverseSnapshot()

  if (!snapshot) {
    return NextResponse.json(
      {
        error: "No universe snapshot available. Run the fetch cron or POST /api/cron/fetch with CRON_SECRET.",
        profiles: [],
        rankings: [],
        diagnostics: {
          hasBlobToken,
          hint: hasBlobToken
            ? "Blob token is set but cef-universe/latest.json was not found. Redeploy the storage fix, or re-run batch fetch."
            : "BLOB_READ_WRITE_TOKEN is missing on this deployment — UI cannot read Blob.",
        },
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
