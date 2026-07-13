import { CEF_TICKERS } from "../cef-tickers"
import type { CEFUniverseSnapshot } from "../cef-types"
import { computeRankings } from "../cef-scoring"
import { buildCEFProfile } from "./build-profile"
import {
  CEFConnectError,
  FETCH_DELAY_MS,
  fetchDailyPricing,
  fetchFundApis,
  sleep,
  type DailyPricingRow,
} from "./client"

export interface FetchUniverseOptions {
  tickers?: readonly string[]
  onProgress?: (completed: number, total: number, ticker: string) => void
}

export async function fetchUniverse(options: FetchUniverseOptions = {}): Promise<CEFUniverseSnapshot> {
  const tickers = options.tickers ?? CEF_TICKERS
  const dailyRows = await fetchDailyPricing()
  const dailyByTicker = new Map<string, DailyPricingRow>(
    dailyRows.map((row) => [row.Ticker.toUpperCase(), row]),
  )

  const profiles: CEFUniverseSnapshot["profiles"] = []
  const errors: CEFUniverseSnapshot["errors"] = []

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i].toUpperCase()
    options.onProgress?.(i + 1, tickers.length, ticker)

    try {
      const daily = dailyByTicker.get(ticker)
      if (!daily) {
        throw new CEFConnectError(`Ticker ${ticker} not found in DailyPricing feed`, ticker)
      }

      const apis = await fetchFundApis(ticker)
      profiles.push(
        buildCEFProfile(
          ticker,
          daily,
          apis.pricingHistory,
          apis.annualized,
          apis.calendar,
          apis.distributions,
          apis.assetAllocation,
          apis.html,
        ),
      )
    } catch (err) {
      errors.push({
        ticker,
        message: err instanceof Error ? err.message : String(err),
      })
    }

    if (i < tickers.length - 1) {
      await sleep(FETCH_DELAY_MS)
    }
  }

  return {
    version: 1,
    fetchedAt: new Date().toISOString(),
    source: "cefconnect",
    tickers: tickers.map((t) => t.toUpperCase()),
    profiles,
    rankings: computeRankings(profiles),
    errors,
  }
}
