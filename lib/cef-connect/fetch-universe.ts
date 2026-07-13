import { CEF_TICKERS, FUNDS_PER_BATCH, TOTAL_BATCHES } from "../cef-tickers"
import type { CEFProfile, CEFUniverseSnapshot } from "../cef-types"
import { computeRankings } from "../cef-scoring"
import { buildCEFProfile } from "./build-profile"
import {
  CEFConnectError,
  FETCH_CONCURRENCY,
  FETCH_DELAY_MS,
  fetchDailyPricing,
  fetchFundApis,
  politeDelay,
  type DailyPricingRow,
} from "./client"

export interface FetchUniverseOptions {
  tickers?: readonly string[]
  /** 0-based batch index. Required for production fetches (max FUNDS_PER_BATCH per run). */
  batch: number
  /** Total number of batches (should be TOTAL_BATCHES for the full universe). */
  batchCount: number
  onProgress?: (completed: number, total: number, ticker: string) => void
}

export { FETCH_CONCURRENCY, FETCH_DELAY_MS, FUNDS_PER_BATCH, TOTAL_BATCHES }

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
      if (index > 0) {
        await politeDelay()
      }
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

/**
 * Slice the universe into fixed-size batches of at most FUNDS_PER_BATCH.
 * batchCount is used only for validation; size is always FUNDS_PER_BATCH.
 */
export function sliceBatch(
  tickers: readonly string[],
  batch: number,
  batchCount: number,
): string[] {
  const size = FUNDS_PER_BATCH
  const expectedBatches = Math.ceil(tickers.length / size)

  if (!Number.isInteger(batch) || batch < 0 || batch >= expectedBatches) {
    throw new CEFConnectError(
      `Invalid batch=${batch}. Expected 0..${expectedBatches - 1} for ${tickers.length} funds at ${size}/batch.`,
    )
  }
  if (!Number.isInteger(batchCount) || batchCount !== expectedBatches) {
    throw new CEFConnectError(
      `Invalid batches=${batchCount}. Expected batches=${expectedBatches} for ${tickers.length} funds at ${size}/batch.`,
    )
  }

  const start = batch * size
  return tickers.slice(start, start + size).map((t) => t.toUpperCase())
}

export async function fetchUniverse(options: FetchUniverseOptions): Promise<CEFUniverseSnapshot> {
  const allTickers = options.tickers ?? CEF_TICKERS
  const tickers = sliceBatch(allTickers, options.batch, options.batchCount)

  if (tickers.length > FUNDS_PER_BATCH) {
    throw new CEFConnectError(
      `Batch safety check failed: attempted to fetch ${tickers.length} funds (max ${FUNDS_PER_BATCH}).`,
    )
  }

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
