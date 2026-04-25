// Types and utilities for live CEF data fetching

export interface CEFLiveData {
  symbol: string
  name: string
  last: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  time: string
  nav: number | null
  discount: number | null
  zScore: number | null
  yfOk: boolean
  cefOk: boolean
}

export interface CEFDataResponse {
  success: boolean
  count: number
  timestamp: string
  data: CEFLiveData[]
  error?: string
}

// CEF Universe - 50 tickers
export const CEF_UNIVERSE = [
  "BOE", "PEO", "EOD", "BCV", "BFZ", "BSTZ", "BGX", "DHF", "BWG", "RA",
  "CHW", "DSL", "ETJ", "EFR", "EVT", "ETW", "ETV", "FFA", "GDV", "GNT",
  "GAM", "HGLB", "PDT", "USA", "ASG", "CAF", "EDD", "DIAX", "JGH", "NMAI",
  "QQQX", "JRS", "BXMX", "NBXG", "PCQ", "PDX", "RMT", "RVT", "SABA", "HQH",
  "HQL", "TDF", "TY", "NCZ", "NIE", "ZTR", "IDE", "HYI", "WIW", "HIO"
] as const

export type CEFTicker = typeof CEF_UNIVERSE[number]

// Human-readable fund names
export const CEF_NAMES: Record<string, string> = {
  "USA": "Liberty All-Star Equity Fund",
  "RVT": "Royce Value Trust",
  "RMT": "Royce Micro-Cap Trust",
  "BOE": "BlackRock Enhanced Global Dividend Trust",
  "PEO": "Adams Natural Resources Fund",
  "EOD": "Allspring Global Dividend Opportunity Fund",
  "BCV": "Bancroft Fund Ltd",
  "BFZ": "BlackRock California Municipal Income Trust",
  "BSTZ": "BlackRock Science and Technology Term Trust",
  "BGX": "Blackstone Long-Short Credit Income Fund",
  "DHF": "Dreyfus Municipal Bond Infrastructure Fund",
  "BWG": "BrandywineGlobal Global Income Opportunities Fund",
  "RA": "Brookfield Real Assets Income Fund",
  "CHW": "Calamos Global Dynamic Income Fund",
  "DSL": "DoubleLine Income Solutions Fund",
  "ETJ": "Eaton Vance Risk-Managed Diversified Equity Income Fund",
  "EFR": "Eaton Vance Senior Floating-Rate Fund",
  "EVT": "Eaton Vance Tax-Advantaged Dividend Income Fund",
  "ETW": "Eaton Vance Tax-Managed Global Buy-Write Opportunities Fund",
  "ETV": "Eaton Vance Tax-Managed Buy-Write Opportunities Fund",
  "FFA": "First Trust Enhanced Equity Income Fund",
  "GDV": "Gabelli Dividend & Income Trust",
  "GNT": "GAMCO Natural Resources, Gold & Income Trust",
  "GAM": "General American Investors Company",
  "HGLB": "Highland Global Allocation Fund",
  "PDT": "John Hancock Premium Dividend Fund",
  "ASG": "Liberty All-Star Growth Fund",
  "CAF": "Morgan Stanley China A Share Fund",
  "EDD": "Morgan Stanley Emerging Markets Debt Fund",
  "DIAX": "Nuveen Dow 30 Dynamic Overwrite Fund",
  "JGH": "Nuveen Global High Income Fund",
  "NMAI": "Nuveen Multi-Asset Income Fund",
  "QQQX": "Nuveen Nasdaq 100 Dynamic Overwrite Fund",
  "JRS": "Nuveen Real Asset Income and Growth Fund",
  "BXMX": "Nuveen S&P 500 Buy-Write Income Fund",
  "NBXG": "Neuberger Berman Next Generation Connectivity Fund",
  "PCQ": "PIMCO California Municipal Income Fund",
  "PDX": "PIMCO Dynamic Income Strategy Fund",
  "SABA": "Saba Capital Income & Opportunities Fund",
  "HQH": "Tekla Healthcare Investors",
  "HQL": "Tekla Life Sciences Investors",
  "TDF": "Templeton Dragon Fund",
  "TY": "Tri-Continental Corporation",
  "NCZ": "Virtus Convertible & Income Fund II",
  "NIE": "Virtus Equity & Convertible Income Fund",
  "ZTR": "Virtus Total Return Fund",
  "IDE": "Voya Infrastructure, Industrials and Materials Fund",
  "HYI": "Western Asset High Yield Defined Opportunity Fund",
  "WIW": "Western Asset/Claymore Inflation-Linked Opportunities & Income Fund",
  "HIO": "Western Asset High Income Opportunity Fund"
}

/**
 * Fetch live CEF data from the API
 * @param tickers - Optional array of specific tickers to fetch (defaults to all)
 * @param priceOnly - If true, skip CEFConnect data for faster response
 */
export async function fetchCEFData(
  tickers?: string[],
  priceOnly = false
): Promise<CEFDataResponse> {
  const params = new URLSearchParams()
  
  if (tickers && tickers.length > 0) {
    params.set("tickers", tickers.join(","))
  }
  
  if (priceOnly) {
    params.set("priceOnly", "true")
  }
  
  const url = `/api/cef-data${params.toString() ? `?${params.toString()}` : ""}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch CEF data: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Format price change with sign and color class
 */
export function formatPriceChange(change: number, changePercent: number): {
  text: string
  colorClass: string
} {
  const sign = change >= 0 ? "+" : ""
  const text = `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
  const colorClass = change >= 0 ? "text-green-600" : "text-red-600"
  return { text, colorClass }
}

/**
 * Format discount/premium value
 */
export function formatDiscount(discount: number | null): {
  text: string
  colorClass: string
} {
  if (discount === null) return { text: "N/A", colorClass: "text-muted-foreground" }
  
  const isDiscount = discount < 0
  const text = `${isDiscount ? "" : "+"}${discount.toFixed(2)}%`
  const colorClass = isDiscount ? "text-green-600" : "text-amber-600"
  return { text, colorClass }
}

/**
 * Format Z-Score value
 */
export function formatZScore(zScore: number | null): {
  text: string
  colorClass: string
} {
  if (zScore === null) return { text: "N/A", colorClass: "text-muted-foreground" }
  
  const text = zScore.toFixed(2)
  let colorClass = "text-muted-foreground"
  
  if (zScore < -1) colorClass = "text-green-600" // Attractive
  else if (zScore > 1) colorClass = "text-red-600" // Expensive
  
  return { text, colorClass }
}

/**
 * Format volume with K/M suffix
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`
  return volume.toString()
}
