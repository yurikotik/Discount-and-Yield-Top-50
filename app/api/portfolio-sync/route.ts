import { NextResponse } from "next/server"

// CEFConnect endpoints
const CEFCONNECT_BASE = "https://www.cefconnect.com"
const LOGIN_URL = `${CEFCONNECT_BASE}/Account/Login`

interface PortfolioHolding {
  ticker: string
  name: string
  shares?: number
  nav?: number
  price?: number
  discount?: number
  zScore?: number
}

// Create a session with cookies
async function createSession() {
  const cookies: Record<string, string> = {}
  
  return {
    cookies,
    async fetch(url: string, options: RequestInit = {}) {
      const cookieHeader = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
        },
        redirect: "manual",
      })
      
      // Parse Set-Cookie headers
      const setCookies = response.headers.getSetCookie?.() || []
      for (const cookie of setCookies) {
        const [nameValue] = cookie.split(";")
        const [name, value] = nameValue.split("=")
        if (name && value) {
          cookies[name.trim()] = value.trim()
        }
      }
      
      return response
    }
  }
}

// Login to CEFConnect
async function loginToCEFConnect(
  session: Awaited<ReturnType<typeof createSession>>,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First get the login page to get any CSRF token
    const loginPage = await session.fetch(LOGIN_URL)
    const html = await loginPage.text()
    
    // Extract CSRF token if present
    const csrfMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)
    const csrfToken = csrfMatch?.[1]
    
    // Prepare form data
    const formData = new URLSearchParams()
    formData.append("Email", email)
    formData.append("Password", password)
    formData.append("RememberMe", "true")
    if (csrfToken) {
      formData.append("__RequestVerificationToken", csrfToken)
    }
    
    // Submit login
    const response = await session.fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": CEFCONNECT_BASE,
        "Referer": LOGIN_URL,
      },
      body: formData.toString(),
    })
    
    // Check for redirect to authenticated page
    const location = response.headers.get("location")
    if (location && !location.includes("login")) {
      return { success: true }
    }
    
    // Check response for error indicators
    const responseText = await response.text()
    if (responseText.toLowerCase().includes("invalid") || 
        responseText.toLowerCase().includes("incorrect")) {
      return { success: false, error: "Invalid email or password" }
    }
    
    // Check if we have auth cookies
    const hasAuthCookie = Object.keys(session.cookies).some(
      k => k.toLowerCase().includes("auth") || k.toLowerCase().includes("aspnet")
    )
    if (hasAuthCookie) {
      return { success: true }
    }
    
    return { success: false, error: "Login failed - no auth cookie received" }
  } catch (error) {
    return { success: false, error: `Login error: ${error}` }
  }
}

// Fetch portfolio page and parse holdings
async function fetchPortfolio(
  session: Awaited<ReturnType<typeof createSession>>
): Promise<{ holdings: PortfolioHolding[]; error?: string }> {
  try {
    const response = await session.fetch(`${CEFCONNECT_BASE}/closed-end-funds-portfolio`)
    
    // Check for redirect to login
    const location = response.headers.get("location")
    if (location?.includes("login")) {
      return { holdings: [], error: "Session expired - please try again" }
    }
    
    const html = await response.text()
    
    // Check if redirected to login page
    if (html.includes("Login") && html.includes("Password") && !html.includes("portfolio")) {
      return { holdings: [], error: "Not authenticated" }
    }
    
    // Parse portfolio table - look for ticker symbols and data
    const holdings: PortfolioHolding[] = []
    
    // Try to find table rows with fund data
    // Pattern: ticker symbols are typically 2-5 uppercase letters
    const tickerPattern = /href="\/fund\/([A-Z]{2,5})"/gi
    let match
    const seenTickers = new Set<string>()
    
    while ((match = tickerPattern.exec(html)) !== null) {
      const ticker = match[1].toUpperCase()
      if (!seenTickers.has(ticker)) {
        seenTickers.add(ticker)
        holdings.push({ ticker, name: ticker })
      }
    }
    
    // Try to extract more detailed data from table structure
    // Look for data-ticker attributes or similar
    const dataTickerPattern = /data-ticker="([A-Z]{2,5})"/gi
    while ((match = dataTickerPattern.exec(html)) !== null) {
      const ticker = match[1].toUpperCase()
      if (!seenTickers.has(ticker)) {
        seenTickers.add(ticker)
        holdings.push({ ticker, name: ticker })
      }
    }
    
    return { holdings }
  } catch (error) {
    return { holdings: [], error: `Portfolio fetch error: ${error}` }
  }
}

// Fetch detailed data for a single ticker from CEFConnect
async function fetchTickerDetails(
  session: Awaited<ReturnType<typeof createSession>>,
  ticker: string
): Promise<Partial<PortfolioHolding>> {
  try {
    const response = await session.fetch(`${CEFCONNECT_BASE}/fund/${ticker}`)
    const html = await response.text()
    
    // Parse NAV
    const navMatch = html.match(/NAV[^$]*\$(\d+\.?\d*)/i)
    const nav = navMatch ? parseFloat(navMatch[1]) : undefined
    
    // Parse Market Price
    const priceMatch = html.match(/Market\s*Price[^$]*\$(\d+\.?\d*)/i)
    const price = priceMatch ? parseFloat(priceMatch[1]) : undefined
    
    // Parse Discount/Premium
    const discountMatch = html.match(/(Discount|Premium)[^-\d]*(-?\d+\.?\d*)%/i)
    let discount = discountMatch ? parseFloat(discountMatch[2]) : undefined
    if (discount !== undefined && discountMatch?.[1].toLowerCase() === "premium") {
      discount = Math.abs(discount)
    } else if (discount !== undefined) {
      discount = -Math.abs(discount)
    }
    
    // Parse Z-Score
    const zScoreMatch = html.match(/Z-Score[^-\d]*(-?\d+\.?\d*)/i)
    const zScore = zScoreMatch ? parseFloat(zScoreMatch[1]) : undefined
    
    // Parse Fund Name
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const name = nameMatch ? nameMatch[1].trim() : ticker
    
    return { ticker, name, nav, price, discount, zScore }
  } catch {
    return { ticker }
  }
}

export async function POST() {
  // Get credentials from environment
  const email = process.env.CEFCONNECT_EMAIL
  const password = process.env.CEFCONNECT_PASSWORD
  
  if (!email || !password) {
    return NextResponse.json(
      { 
        success: false, 
        error: "CEFConnect credentials not configured. Please set CEFCONNECT_EMAIL and CEFCONNECT_PASSWORD environment variables." 
      },
      { status: 400 }
    )
  }
  
  try {
    // Create session
    const session = await createSession()
    
    // Login
    const loginResult = await loginToCEFConnect(session, email, password)
    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, error: loginResult.error || "Login failed" },
        { status: 401 }
      )
    }
    
    // Fetch portfolio
    const { holdings, error: portfolioError } = await fetchPortfolio(session)
    if (portfolioError) {
      return NextResponse.json(
        { success: false, error: portfolioError },
        { status: 500 }
      )
    }
    
    if (holdings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No holdings found in portfolio",
        holdings: [],
        timestamp: new Date().toISOString()
      })
    }
    
    // Enrich holdings with detailed data (in batches of 5)
    const enrichedHoldings: PortfolioHolding[] = []
    const batchSize = 5
    
    for (let i = 0; i < holdings.length; i += batchSize) {
      const batch = holdings.slice(i, i + batchSize)
      const details = await Promise.all(
        batch.map(h => fetchTickerDetails(session, h.ticker))
      )
      enrichedHoldings.push(...details.map(d => ({ ...d, ticker: d.ticker! })))
      
      // Small delay between batches
      if (i + batchSize < holdings.length) {
        await new Promise(r => setTimeout(r, 200))
      }
    }
    
    return NextResponse.json({
      success: true,
      count: enrichedHoldings.length,
      holdings: enrichedHoldings,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Portfolio sync error:", error)
    return NextResponse.json(
      { success: false, error: `Sync failed: ${error}` },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to sync portfolio from CEFConnect",
    configured: !!(process.env.CEFCONNECT_EMAIL && process.env.CEFCONNECT_PASSWORD)
  })
}
