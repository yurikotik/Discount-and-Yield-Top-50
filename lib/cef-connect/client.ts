const BASE_URL = "https://www.cefconnect.com"
const USER_AGENT =
  "Mozilla/5.0 (compatible; CEFXRayDashboard/1.0; +https://github.com/cef-xray)"

/** Delay between starting each fund worker task (default 400ms). */
export const FETCH_DELAY_MS = Number(process.env.CEF_FETCH_DELAY_MS ?? 400)
/** Parallel funds per wave (default 4 — override via CEF_FETCH_CONCURRENCY). */
export const FETCH_CONCURRENCY = Number(process.env.CEF_FETCH_CONCURRENCY ?? 4)
/** Delay between sequential fallback requests within a fund (default 200ms). */
export const INTRA_FUND_DELAY_MS = Number(process.env.CEF_INTRA_FUND_DELAY_MS ?? 200)
const REQUEST_TIMEOUT_MS = Number(process.env.CEF_REQUEST_TIMEOUT_MS ?? 90000)

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

async function fetchWithRetry(url: string, retries = 5): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < retries; attempt++) {
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
        await sleep(1500 * (attempt + 1))
        continue
      }
      return res
    } catch (err) {
      lastError = err
      const isTimeout =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.message.includes("aborted due to timeout"))
      await sleep(isTimeout ? 2000 * (attempt + 1) : 1000 * (attempt + 1))
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

async function fetchPricingHistory(ticker: string): Promise<PricingHistoryResponse> {
  const t = ticker.toUpperCase()
  const empty: PricingHistoryResponse = {
    Data: { Period: "1Y", PriceHistory: [], Ticker: t, Name: t },
  }

  // Try 1Y and 2Y in parallel first (covers most funds).
  const primary = await Promise.allSettled(
    (["1Y", "2Y"] as const).map((period) =>
      fetchJson<PricingHistoryResponse>(`/api/v3/pricinghistory/${t}/${period}`),
    ),
  )
  for (const result of primary) {
    if (result.status === "fulfilled" && (result.value.Data?.PriceHistory?.length ?? 0) > 0) {
      return result.value
    }
  }

  // Sequential fallback for edge cases.
  for (const period of ["3Y", "5Y", "YTD"] as const) {
    try {
      const res = await fetchJson<PricingHistoryResponse>(`/api/v3/pricinghistory/${t}/${period}`)
      if ((res.Data?.PriceHistory?.length ?? 0) > 0) return res
    } catch {
      // try next
    }
    if (INTRA_FUND_DELAY_MS > 0) await sleep(INTRA_FUND_DELAY_MS)
  }

  return empty
}

async function fetchDistributions(ticker: string): Promise<DistributionResponse> {
  const t = ticker.toUpperCase()
  const results = await Promise.allSettled(
    (["1Y", "2Y"] as const).map((period) =>
      fetchJson<DistributionResponse>(`/api/v3/distributioncharter/fund/${t}/${period}`),
    ),
  )
  for (const result of results) {
    if (result.status === "fulfilled" && (result.value.Data?.length ?? 0) > 0) {
      return result.value
    }
  }
  return { Data: [] }
}

export async function fetchFundApis(ticker: string) {
  const t = ticker.toUpperCase()

  const pricingHistory = await fetchPricingHistory(t)

  // Fetch remaining endpoints in parallel (one burst per fund).
  const [annualized, calendar, assetAllocation, html, distributions] = await Promise.all([
    fetchJson<PerformanceResponse>(`/api/v3/performance/annualized/${t}`).catch(() => ({
      Data: [],
    })),
    fetchJson<PerformanceResponse>(`/api/v3/performance/calendar/${t}`).catch(() => ({
      Data: [],
    })),
    fetchJson<AllocationResponse>(`/api/v3/assetallocation/${t}`).catch(() => ({ Data: [] })),
    fetchHtml(`/fund/${t}?view=holdings`),
    fetchDistributions(t),
  ])

  return { pricingHistory, annualized, calendar, distributions, assetAllocation, html }
}
