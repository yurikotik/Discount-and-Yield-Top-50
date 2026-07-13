const BASE_URL = "https://www.cefconnect.com"
// CEF Connect blocks/slows non-browser user agents — use a standard browser UA.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

// Polite-scraping knobs (override via env if needed)
const MIN_DELAY_MS = Number(process.env.CEF_MIN_DELAY_MS ?? 2500)
const JITTER_MS = Number(process.env.CEF_JITTER_MS ?? 1500)
const MAX_RETRIES = Number(process.env.CEF_MAX_RETRIES ?? 3)
const RETRY_BASE_DELAY_MS = Number(process.env.CEF_RETRY_BASE_DELAY_MS ?? 4000)
const REQUEST_TIMEOUT_MS = Number(process.env.CEF_REQUEST_TIMEOUT_MS ?? 20000)

/** Sequential funds only — polite scraping should not hammer in parallel. */
export const FETCH_CONCURRENCY = Number(process.env.CEF_FETCH_CONCURRENCY ?? 1)
/** @deprecated use politeDelay() — kept for exports/compat */
export const FETCH_DELAY_MS = MIN_DELAY_MS

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 2.5s–4.0s pause between fund scrapes. */
export async function politeDelay(): Promise<void> {
  const jitter = Math.floor(Math.random() * (JITTER_MS + 1))
  await sleep(MIN_DELAY_MS + jitter)
}

export class CEFConnectError extends Error {
  ticker?: string
  status?: number

  constructor(message: string, ticker?: string, status?: number) {
    super(message)
    this.name = "CEFConnectError"
    this.ticker = ticker
    this.status = status
  }
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json, text/html, */*",
          "User-Agent": USER_AGENT,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (res.status === 429 || res.status >= 500) {
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt))
        continue
      }
      return res
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function fetchJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? path : `/api/v3/${path}`}`
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    throw new CEFConnectError(`HTTP ${res.status} for ${url}`, undefined, res.status)
  }
  const text = await res.text()
  if (text.trimStart().startsWith("<!")) {
    throw new CEFConnectError(`Expected JSON but received HTML for ${url}`)
  }
  return JSON.parse(text) as T
}

export async function fetchHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    throw new CEFConnectError(`HTTP ${res.status} for ${url}`, undefined, res.status)
  }
  return res.text()
}

export interface DailyPricingRow {
  Ticker: string
  Name: string
  Price: number | null
  NAV: number | null
  Discount: number | null
  DistributionRatePrice: number | null
  ReturnOnNAV: number | null
  CategoryName: string | null
  PriceChange: number | null
  LastUpdated: string | null
  NAVPublished: string | null
}

export interface PricingHistoryPoint {
  NAVData: number
  DiscountData: number
  Data: number
  DataDate: string
  DataDateDisplay?: string
}

export interface PricingHistoryResponse {
  Data: {
    Period: string
    PriceHistory: PricingHistoryPoint[]
    Ticker: string
    Name: string
    LastUpdated?: string
  }
}

export interface AllocationRow {
  Text: string
  Value: number
}

export interface AllocationResponse {
  Data: AllocationRow[]
  AsOfDate?: string
}

export interface PerformanceRow {
  Type: string
  PriceTR: number
  PricePGTR: number
  NAVPGTR: number
  NAVTR: number
}

export interface PerformanceResponse {
  Data: PerformanceRow[]
}

export interface DistributionRow {
  Date: string
  DateText: string
  Amount: number
}

export interface DistributionResponse {
  Data: DistributionRow[]
}

export async function fetchDailyPricing(): Promise<DailyPricingRow[]> {
  const props = [
    "Ticker",
    "Name",
    "Price",
    "NAV",
    "Discount",
    "DistributionRatePrice",
    "ReturnOnNAV",
    "CategoryName",
    "PriceChange",
    "LastUpdated",
    "NAVPublished",
  ].join(",")
  return fetchJson<DailyPricingRow[]>(`/api/v3/DailyPricing?props=${props}`)
}

export async function fetchFundApis(ticker: string) {
  const t = ticker.toUpperCase()
  const emptyHistory: PricingHistoryResponse = {
    Data: { Period: "1Y", PriceHistory: [], Ticker: t, Name: t },
  }

  // Parallel endpoints for one fund (one burst), then politeDelay between funds.
  const [pricingHistory, annualized, calendar, assetAllocation, html, distributions] =
    await Promise.all([
      fetchJson<PricingHistoryResponse>(`/api/v3/pricinghistory/${t}/1Y`).catch(() => emptyHistory),
      fetchJson<PerformanceResponse>(`/api/v3/performance/annualized/${t}`).catch(() => ({
        Data: [],
      })),
      fetchJson<PerformanceResponse>(`/api/v3/performance/calendar/${t}`).catch(() => ({
        Data: [],
      })),
      fetchJson<AllocationResponse>(`/api/v3/assetallocation/${t}`).catch(() => ({ Data: [] })),
      fetchHtml(`/fund/${t}?view=holdings`).catch(() => ""),
      fetchJson<DistributionResponse>(`/api/v3/distributioncharter/fund/${t}/1Y`).catch(() => ({
        Data: [],
      })),
    ])

  return { pricingHistory, annualized, calendar, distributions, assetAllocation, html }
}
