import { CEF_TICKERS } from "../cef-tickers"
import type { CEFProfile, CEFUniverseSnapshot } from "../cef-types"
import { computeRankings } from "../cef-scoring"
import { buildCEFProfile } from "./build-profile"
import {
  CEFConnectError,
  FETCH_CONCURRENCY,
  FETCH_DELAY_MS,
  fetchDailyPricing,
  fetchFundApis,
  sleep,
  type DailyPricingRow,
} from "./client"

export interface FetchUniverseOptions {
  tickers?: readonly string[]
  /** Process tickers in slices (0-based). Use when the serverless function time limit is tight. */
  batch?: number
  batchCount?: number
  onProgress?: (completed: number, total: number, ticker: string) => void
}

export { FETCH_CONCURRENCY, FETCH_DELAY_MS }

async function fetchOneFund(
  ticker: string,
  dailyByTicker: Map<string, DailyPricingRow>,
): Promise<{ profile?: CEFProfile; error?: { ticker: string; message: string } }> {
  const upper = ticker.toUpperCase()
  try {
    const daily = dailyByTicker.get(upper)
    if (!daily) {
      throw new CEFConnectError(`Ticker ${upper} not found in DailyPricing feed`, upper)
    }

    const apis = await fetchFundApis(upper)
    return {
      profile: buildCEFProfile(
        upper,
        daily,
        apis.pricingHistory,
        apis.annualized,
        apis.calendar,
        apis.distributions,
        apis.assetAllocation,
        apis.html,
      ),
    }
  } catch (err) {
    return {
      error: {
        ticker: upper,
        message: err instanceof Error ? err.message : String(err),
      },
    }
  }
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++
      if (index >= items.length) return
      if (index > 0 && FETCH_DELAY_MS > 0) {
        await sleep(FETCH_DELAY_MS)
      }
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

function sliceBatch(tickers: readonly string[], batch?: number, batchCount?: number): string[] {
  if (batch === undefined || batchCount === undefined || batchCount <= 1) {
    return [...tickers]
  }
  const size = Math.ceil(tickers.length / batchCount)
  const start = batch * size
  return tickers.slice(start, start + size).map((t) => t.toUpperCase())
}

export async function fetchUniverse(options: FetchUniverseOptions = {}): Promise<CEFUniverseSnapshot> {
  const allTickers = options.tickers ?? CEF_TICKERS
  const tickers = sliceBatch(allTickers, options.batch, options.batchCount)
  const dailyRows = await fetchDailyPricing()
  const dailyByTicker = new Map<string, DailyPricingRow>(
    dailyRows.map((row) => [row.Ticker.toUpperCase(), row]),
  )

  let completed = 0
  const results = await mapWithConcurrency(tickers, FETCH_CONCURRENCY, async (ticker) => {
    const result = await fetchOneFund(ticker, dailyByTicker)
    completed++
    options.onProgress?.(completed, tickers.length, ticker.toUpperCase())
    return result
  })

  const profiles: CEFProfile[] = []
  const errors: CEFUniverseSnapshot["errors"] = []

  for (const result of results) {
    if (result.profile) profiles.push(result.profile)
    if (result.error) errors.push(result.error)
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
