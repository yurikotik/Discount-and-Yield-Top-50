const BASE_URL = "https://www.cefconnect.com"
const USER_AGENT =
  "Mozilla/5.0 (compatible; CEFXRayDashboard/1.0; +https://github.com/cef-xray)"

export const FETCH_DELAY_MS = Number(process.env.CEF_FETCH_DELAY_MS ?? 4000)
export const INTRA_FUND_DELAY_MS = Number(process.env.CEF_INTRA_FUND_DELAY_MS ?? 600)

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

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json, text/html, */*",
          "User-Agent": USER_AGENT,
        },
        cache: "no-store",
      })
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (attempt + 1))
        continue
      }
      return res
    } catch (err) {
      lastError = err
      await sleep(1500 * (attempt + 1))
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

  let pricingHistory: PricingHistoryResponse | null = null
  for (const period of ["2Y", "1Y", "3Y", "5Y", "YTD"] as const) {
    try {
      const res = await fetchJson<PricingHistoryResponse>(`/api/v3/pricinghistory/${t}/${period}`)
      if ((res.Data?.PriceHistory?.length ?? 0) > 0) {
        pricingHistory = res
        break
      }
    } catch {
      // try next period
    }
    await sleep(INTRA_FUND_DELAY_MS)
  }
  if (!pricingHistory) {
    pricingHistory = {
      Data: { Period: "1Y", PriceHistory: [], Ticker: t, Name: t },
    }
  }

  await sleep(INTRA_FUND_DELAY_MS)
  const annualized = await fetchJson<PerformanceResponse>(`/api/v3/performance/annualized/${t}`)
  await sleep(INTRA_FUND_DELAY_MS)
  const calendar = await fetchJson<PerformanceResponse>(`/api/v3/performance/calendar/${t}`)
  await sleep(INTRA_FUND_DELAY_MS)

  let distributions: DistributionResponse = { Data: [] }
  for (const period of ["2Y", "1Y", "All"] as const) {
    try {
      const res = await fetchJson<DistributionResponse>(`/api/v3/distributioncharter/fund/${t}/${period}`)
      if ((res.Data?.length ?? 0) > 0) {
        distributions = res
        break
      }
    } catch {
      // try next period
    }
    await sleep(INTRA_FUND_DELAY_MS)
  }

  let assetAllocation: AllocationResponse = { Data: [] }
  try {
    assetAllocation = await fetchJson<AllocationResponse>(`/api/v3/assetallocation/${t}`)
  } catch {
    // optional
  }
  await sleep(INTRA_FUND_DELAY_MS)
  const html = await fetchHtml(`/fund/${t}?view=holdings`)

  return { pricingHistory, annualized, calendar, distributions, assetAllocation, html }
}
