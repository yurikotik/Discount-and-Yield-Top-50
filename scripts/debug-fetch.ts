#!/usr/bin/env tsx
/**
 * Local debug: test CEF Connect fetch for one or more tickers with timing.
 * Usage:
 *   pnpm debug:fetch              # single fund AEF
 *   pnpm debug:fetch -- AEF PEO   # specific tickers
 *   pnpm debug:fetch -- --batch 0 # first batch slice (2 funds)
 */
import { fetchUniverse, FUNDS_PER_BATCH, TOTAL_BATCHES } from "../lib/cef-connect/fetch-universe"
import { fetchDailyPricing, fetchFundApis } from "../lib/cef-connect/client"

function elapsed(start: number) {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`
}

async function debugOneFund(ticker: string) {
  console.log(`\n=== ${ticker} ===`)
  const t0 = Date.now()

  console.log(`[${elapsed(t0)}] fetchDailyPricing…`)
  const daily = await fetchDailyPricing()
  const row = daily.find((r) => r.Ticker.toUpperCase() === ticker.toUpperCase())
  console.log(`[${elapsed(t0)}] daily pricing: ${daily.length} funds, ${ticker} ${row ? "found" : "NOT FOUND"}`)
  if (!row) return

  console.log(`[${elapsed(t0)}] fetchFundApis(${ticker})…`)
  const apis = await fetchFundApis(ticker)
  console.log(`[${elapsed(t0)}] done`)
  console.log({
    navHistory: apis.pricingHistory.Data?.PriceHistory?.length ?? 0,
    annualized: apis.annualized.Data?.length ?? 0,
    calendar: apis.calendar.Data?.length ?? 0,
    distributions: apis.distributions.Data?.length ?? 0,
    sectors: apis.assetAllocation.Data?.length ?? 0,
    htmlBytes: apis.html?.length ?? 0,
  })
}

async function main() {
  const args = process.argv.slice(2)
  const batchMode = args.includes("--batch")
  const tickers = args.filter((a) => !a.startsWith("--"))

  console.log("Config:", { FUNDS_PER_BATCH, TOTAL_BATCHES })

  if (batchMode) {
    const batch = Number(tickers[0] ?? 0)
    console.log(`\nRunning fetchUniverse batch=${batch} batches=${TOTAL_BATCHES}`)
    const t0 = Date.now()
    const snap = await fetchUniverse({
      batch,
      batchCount: TOTAL_BATCHES,
      onProgress: (d, t, x) => console.log(`  [${d}/${t}] ${x} @ ${elapsed(t0)}`),
    })
    console.log(`\nBatch complete in ${elapsed(t0)}`)
    console.log({
      profiles: snap.profiles.length,
      errors: snap.errors,
      tickers: snap.tickers,
    })
    return
  }

  const list = tickers.length > 0 ? tickers : ["AEF"]
  for (const ticker of list) {
    await debugOneFund(ticker)
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err)
  process.exit(1)
})
