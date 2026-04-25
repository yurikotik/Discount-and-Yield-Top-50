import { NextResponse } from "next/server"

// CEF Universe - 59 tickers (Core 10 + 49 additional)
const UNIVERSE = [
  // Core 10 from dashboard
  "UTF", "PDI", "RQI", "PTY", "GOF", "EOS", "STK", "UTG", "DNP",
  // Additional watchlist tickers
  "BOE", "PEO", "EOD", "BCV", "BFZ", "BSTZ", "BGX", "DHF", "BWG", "RA",
  "CHW", "DSL", "ETJ", "EFR", "EVT", "ETW", "ETV", "FFA", "GDV", "GNT",
  "GAM", "HGLB", "PDT", "USA", "ASG", "CAF", "EDD", "DIAX", "JGH", "NMAI",
  "QQQX", "JRS", "BXMX", "NBXG", "PCQ", "PDX", "RMT", "RVT", "SABA", "HQH",
  "HQL", "TDF", "TY", "NCZ", "NIE", "ZTR", "IDE", "HYI", "WIW", "HIO"
]

// Human-readable fund names
const TICKER_NAME_MAP: Record<string, string> = {
  // Core 10 funds
  "UTF": "Cohen & Steers Infrastructure Fund",
  "PDI": "PIMCO Dynamic Income Fund",
  "RQI": "Cohen & Steers Quality Income Realty Fund",
  "PTY": "PIMCO Corporate & Income Opportunity Fund",
  "GOF": "Guggenheim Strategic Opportunities Fund",
  "EOS": "Eaton Vance Enhanced Equity Income Fund II",
  "STK": "Columbia Seligman Premium Technology Growth Fund",
  "UTG": "Reaves Utility Income Fund",
  "DNP": "DNP Select Income Fund",
  // Additional funds
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

export interface CEFDataRow {
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

// Fetch price data from Yahoo Finance v8 API
async function fetchYahooQuotes(tickers: string[]): Promise<Map<string, {
  last: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  ok: boolean
}>> {
  const results = new Map()
  
  try {
    // Yahoo Finance v8 quote endpoint
    const symbols = tickers.join(",")
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    })
    
    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`)
      // Return empty results for all tickers
      for (const ticker of tickers) {
        results.set(ticker, {
          last: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: 0, ok: false
        })
      }
      return results
    }
    
    const data = await response.json()
    const quotes = data?.quoteResponse?.result || []
    
    // Map results by symbol
    for (const quote of quotes) {
      results.set(quote.symbol, {
        last: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        open: quote.regularMarketOpen || 0,
        high: quote.regularMarketDayHigh || 0,
        low: quote.regularMarketDayLow || 0,
        volume: quote.regularMarketVolume || 0,
        ok: true
      })
    }
    
    // Fill in missing tickers
    for (const ticker of tickers) {
      if (!results.has(ticker)) {
        results.set(ticker, {
          last: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: 0, ok: false
        })
      }
    }
  } catch (error) {
    console.error("Yahoo Finance fetch error:", error)
    for (const ticker of tickers) {
      results.set(ticker, {
        last: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: 0, ok: false
      })
    }
  }
  
  return results
}

// Fetch NAV/Discount/Z-Score from CEFConnect
async function fetchCEFConnectData(ticker: string): Promise<{
  nav: number | null
  discount: number | null
  zScore: number | null
  ok: boolean
}> {
  try {
    const url = `https://www.cefconnect.com/fund/${ticker}`
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    })
    
    if (!response.ok) {
      return { nav: null, discount: null, zScore: null, ok: false }
    }
    
    const html = await response.text()
    
    // Parse NAV - look for pattern like "NAV</span>$XX.XX"
    const navMatch = html.match(/NAV[^$]*\$(\d+\.?\d*)/i)
    const nav = navMatch ? parseFloat(navMatch[1]) : null
    
    // Parse Discount/Premium - look for percentage pattern near "Discount" or "Premium"
    const discountMatch = html.match(/(Discount|Premium)[^-\d]*(-?\d+\.?\d*)%/i)
    let discount = discountMatch ? parseFloat(discountMatch[2]) : null
    if (discount !== null && discountMatch && discountMatch[1].toLowerCase() === "premium") {
      discount = Math.abs(discount) // Premium is positive
    } else if (discount !== null) {
      discount = -Math.abs(discount) // Discount is negative
    }
    
    // Parse Z-Score
    const zScoreMatch = html.match(/Z-Score[^-\d]*(-?\d+\.?\d*)/i)
    const zScore = zScoreMatch ? parseFloat(zScoreMatch[1]) : null
    
    const ok = nav !== null || discount !== null || zScore !== null
    
    return { nav, discount, zScore, ok }
  } catch (error) {
    console.error(`CEFConnect fetch error for ${ticker}:`, error)
    return { nav: null, discount: null, zScore: null, ok: false }
  }
}

// Rate-limited sequential fetch for CEFConnect
async function fetchAllCEFConnectData(tickers: string[]): Promise<Map<string, {
  nav: number | null
  discount: number | null
  zScore: number | null
  ok: boolean
}>> {
  const results = new Map()
  
  // Fetch in parallel batches of 5 with delay between batches
  const batchSize = 5
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(ticker => fetchCEFConnectData(ticker).then(data => ({ ticker, data })))
    )
    
    for (const { ticker, data } of batchResults) {
      results.set(ticker, data)
    }
    
    // Small delay between batches to be polite
    if (i + batchSize < tickers.length) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }
  
  return results
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Allow filtering by tickers (comma-separated) or get all
  const tickersParam = searchParams.get("tickers")
  const tickers = tickersParam 
    ? tickersParam.split(",").map(t => t.trim().toUpperCase()).filter(t => UNIVERSE.includes(t))
    : UNIVERSE
  
  // Option to skip CEFConnect for faster response (price-only mode)
  const priceOnly = searchParams.get("priceOnly") === "true"
  
  try {
    // Fetch Yahoo Finance data (fast batch request)
    const priceData = await fetchYahooQuotes(tickers)
    
    // Fetch CEFConnect data (slower, sequential with rate limiting)
    let cefData: Map<string, { nav: number | null; discount: number | null; zScore: number | null; ok: boolean }>
    if (priceOnly) {
      cefData = new Map()
      for (const ticker of tickers) {
        cefData.set(ticker, { nav: null, discount: null, zScore: null, ok: false })
      }
    } else {
      cefData = await fetchAllCEFConnectData(tickers)
    }
    
    // Combine results
    const today = new Date().toISOString().split("T")[0]
    const rows: CEFDataRow[] = tickers.map(ticker => {
      const price = priceData.get(ticker) || { last: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: 0, ok: false }
      const cef = cefData.get(ticker) || { nav: null, discount: null, zScore: null, ok: false }
      
      return {
        symbol: ticker,
        name: TICKER_NAME_MAP[ticker] || ticker,
        last: price.last,
        change: price.change,
        changePercent: price.changePercent,
        open: price.open,
        high: price.high,
        low: price.low,
        volume: price.volume,
        time: today,
        nav: cef.nav,
        discount: cef.discount,
        zScore: cef.zScore,
        yfOk: price.ok,
        cefOk: cef.ok
      }
    })
    
    return NextResponse.json({
      success: true,
      count: rows.length,
      timestamp: new Date().toISOString(),
      data: rows
    })
  } catch (error) {
    console.error("CEF data fetch error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch CEF data" },
      { status: 500 }
    )
  }
}
