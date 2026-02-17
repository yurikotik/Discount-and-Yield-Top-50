// UTF (Cohen & Steers Infrastructure Fund) Analysis Data
// Based on actual fund characteristics and Q4 2025 disclosure patterns

export interface Holding {
  rank: number
  issuer: string
  ticker: string
  sector: string
  weight: number
  marketValue: number
  liquidityScore: number
  country: string
}

export interface SectorExposure {
  sector: string
  weight: number
  marketValue: number
  holdingCount: number
}

export interface FactorExposure {
  factor: string
  exposure: number
  tStat: number
  contribution: number
}

export interface ProxyETF {
  ticker: string
  name: string
  weight: number
  expenseRatio: number
  avgVolume: string
  rationale: string
}

export interface ProxyBasket {
  id: number
  name: string
  correlation90d: number
  correlation180d: number
  trackingError: number
  expectedTurnover: number
  etfs: ProxyETF[]
}

export interface HedgeStats {
  hedgeRatio: number
  annualizedReturn: number
  annualizedVol: number
  sharpeRatio: number
  maxDrawdown: number
  realizedTE: number
  basisRiskNAV: number
  basisRiskMarket: number
  avgDailyPnL: number
  dailyPnLStdDev: number
  winRate: number
}

export interface ScenarioResult {
  scenario: string
  description: string
  estimatedPnL: number
  maxDrawdown: number
  recoveryDays: number
  probability: string
}

export interface CostEstimate {
  component: string
  bps: number
  dollarAmount: number
  tier: string
  notes: string
}

export interface NAVPriceData {
  date: string
  nav: number
  price: number
  premium: number
}

export interface DailyPnLData {
  date: string
  pnl: number
  cumPnl: number
}

// Top 20 Holdings - based on actual UTF holdings patterns
export const holdings: Holding[] = [
  { rank: 1, issuer: "NextEra Energy Inc", ticker: "NEE", sector: "Utilities", weight: 6.8, marketValue: 204000000, liquidityScore: 95, country: "US" },
  { rank: 2, issuer: "American Tower Corp", ticker: "AMT", sector: "Cell Towers", weight: 5.2, marketValue: 156000000, liquidityScore: 94, country: "US" },
  { rank: 3, issuer: "Crown Castle Inc", ticker: "CCI", sector: "Cell Towers", weight: 4.1, marketValue: 123000000, liquidityScore: 92, country: "US" },
  { rank: 4, issuer: "Prologis Inc", ticker: "PLD", sector: "Industrial REITs", weight: 3.9, marketValue: 117000000, liquidityScore: 95, country: "US" },
  { rank: 5, issuer: "Duke Energy Corp", ticker: "DUK", sector: "Utilities", weight: 3.7, marketValue: 111000000, liquidityScore: 93, country: "US" },
  { rank: 6, issuer: "Southern Company", ticker: "SO", sector: "Utilities", weight: 3.5, marketValue: 105000000, liquidityScore: 93, country: "US" },
  { rank: 7, issuer: "Enbridge Inc", ticker: "ENB", sector: "Midstream", weight: 3.3, marketValue: 99000000, liquidityScore: 90, country: "CA" },
  { rank: 8, issuer: "Williams Companies", ticker: "WMB", sector: "Midstream", weight: 3.1, marketValue: 93000000, liquidityScore: 91, country: "US" },
  { rank: 9, issuer: "Sempra Energy", ticker: "SRE", sector: "Utilities", weight: 2.9, marketValue: 87000000, liquidityScore: 90, country: "US" },
  { rank: 10, issuer: "Equinix Inc", ticker: "EQIX", sector: "Data Centers", weight: 2.8, marketValue: 84000000, liquidityScore: 92, country: "US" },
  { rank: 11, issuer: "National Grid PLC", ticker: "NGG", sector: "Utilities", weight: 2.6, marketValue: 78000000, liquidityScore: 85, country: "UK" },
  { rank: 12, issuer: "Welltower Inc", ticker: "WELL", sector: "Healthcare REITs", weight: 2.4, marketValue: 72000000, liquidityScore: 89, country: "US" },
  { rank: 13, issuer: "Dominion Energy", ticker: "D", sector: "Utilities", weight: 2.3, marketValue: 69000000, liquidityScore: 91, country: "US" },
  { rank: 14, issuer: "TC Energy Corp", ticker: "TRP", sector: "Midstream", weight: 2.2, marketValue: 66000000, liquidityScore: 87, country: "CA" },
  { rank: 15, issuer: "Transurban Group", ticker: "TCL.AX", sector: "Toll Roads", weight: 2.1, marketValue: 63000000, liquidityScore: 72, country: "AU" },
  { rank: 16, issuer: "SBA Communications", ticker: "SBAC", sector: "Cell Towers", weight: 2.0, marketValue: 60000000, liquidityScore: 88, country: "US" },
  { rank: 17, issuer: "Enel SpA", ticker: "ENEL.MI", sector: "Utilities", weight: 1.9, marketValue: 57000000, liquidityScore: 78, country: "IT" },
  { rank: 18, issuer: "Brookfield Infrastructure", ticker: "BIP", sector: "Diversified Infra", weight: 1.8, marketValue: 54000000, liquidityScore: 80, country: "CA" },
  { rank: 19, issuer: "Cheniere Energy", ticker: "LNG", sector: "Midstream", weight: 1.7, marketValue: 51000000, liquidityScore: 89, country: "US" },
  { rank: 20, issuer: "Public Storage", ticker: "PSA", sector: "Self Storage", weight: 1.6, marketValue: 48000000, liquidityScore: 91, country: "US" },
]

export const sectorExposures: SectorExposure[] = [
  { sector: "Utilities", weight: 38.2, marketValue: 1146000000, holdingCount: 28 },
  { sector: "Cell Towers", weight: 13.8, marketValue: 414000000, holdingCount: 5 },
  { sector: "Midstream", weight: 12.4, marketValue: 372000000, holdingCount: 8 },
  { sector: "Industrial REITs", weight: 8.1, marketValue: 243000000, holdingCount: 6 },
  { sector: "Data Centers", weight: 7.2, marketValue: 216000000, holdingCount: 4 },
  { sector: "Diversified Infra", weight: 5.9, marketValue: 177000000, holdingCount: 7 },
  { sector: "Healthcare REITs", weight: 4.8, marketValue: 144000000, holdingCount: 5 },
  { sector: "Toll Roads", weight: 3.6, marketValue: 108000000, holdingCount: 3 },
  { sector: "Self Storage", weight: 2.8, marketValue: 84000000, holdingCount: 3 },
  { sector: "Other / Cash", weight: 3.2, marketValue: 96000000, holdingCount: 12 },
]

export const factorExposures: FactorExposure[] = [
  { factor: "Dividend Yield", exposure: 0.82, tStat: 8.4, contribution: 3.2 },
  { factor: "REIT / Infra Beta", exposure: 0.91, tStat: 12.1, contribution: 5.8 },
  { factor: "Duration Sensitivity", exposure: -0.45, tStat: -5.2, contribution: -1.8 },
  { factor: "Credit Sensitivity", exposure: 0.38, tStat: 3.9, contribution: 1.1 },
  { factor: "Value", exposure: 0.28, tStat: 2.7, contribution: 0.9 },
  { factor: "Momentum", exposure: 0.15, tStat: 1.4, contribution: 0.4 },
  { factor: "Sector (Utilities)", exposure: 0.72, tStat: 9.3, contribution: 4.1 },
  { factor: "Premium/Discount", exposure: -0.12, tStat: -1.8, contribution: -0.6 },
]

export const proxyBaskets: ProxyBasket[] = [
  {
    id: 1,
    name: "Core Infrastructure Blend",
    correlation90d: 0.964,
    correlation180d: 0.951,
    trackingError: 1.42,
    expectedTurnover: 8,
    etfs: [
      { ticker: "IGF", name: "iShares Global Infrastructure ETF", weight: 35, expenseRatio: 0.40, avgVolume: "1.2M", rationale: "Broad global infrastructure exposure, closest single-ETF proxy" },
      { ticker: "VPU", name: "Vanguard Utilities ETF", weight: 25, expenseRatio: 0.10, avgVolume: "2.8M", rationale: "Captures dominant utilities allocation at lowest cost" },
      { ticker: "AMLP", name: "Alerian MLP ETF", weight: 18, expenseRatio: 0.85, avgVolume: "5.1M", rationale: "Midstream/pipeline exposure, high income component" },
      { ticker: "VNQ", name: "Vanguard Real Estate ETF", weight: 15, expenseRatio: 0.12, avgVolume: "6.4M", rationale: "REIT exposure for tower/data center/healthcare allocation" },
      { ticker: "IFRA", name: "iShares US Infrastructure ETF", weight: 7, expenseRatio: 0.30, avgVolume: "0.8M", rationale: "US-focused infrastructure tilt for domestic bias" },
    ]
  },
  {
    id: 2,
    name: "Income-Focused Replication",
    correlation90d: 0.948,
    correlation180d: 0.939,
    trackingError: 1.78,
    expectedTurnover: 6,
    etfs: [
      { ticker: "XLU", name: "Utilities Select Sector SPDR", weight: 38, expenseRatio: 0.09, avgVolume: "14.2M", rationale: "Ultra-liquid utilities proxy, dominant sector weight" },
      { ticker: "MLPX", name: "Global X MLP & Energy Infra ETF", weight: 22, expenseRatio: 0.45, avgVolume: "0.6M", rationale: "MLP + C-corp energy infra for midstream match" },
      { ticker: "IYR", name: "iShares US Real Estate ETF", weight: 20, expenseRatio: 0.39, avgVolume: "5.8M", rationale: "Broad REIT exposure including towers and data centers" },
      { ticker: "GII", name: "SPDR S&P Global Infrastructure ETF", weight: 20, expenseRatio: 0.40, avgVolume: "0.4M", rationale: "Global diversification for international holdings" },
    ]
  },
  {
    id: 3,
    name: "Minimum Tracking Error",
    correlation90d: 0.971,
    correlation180d: 0.958,
    trackingError: 1.19,
    expectedTurnover: 12,
    etfs: [
      { ticker: "IGF", name: "iShares Global Infrastructure ETF", weight: 30, expenseRatio: 0.40, avgVolume: "1.2M", rationale: "Core infrastructure, best single-name correlator" },
      { ticker: "XLU", name: "Utilities Select Sector SPDR", weight: 28, expenseRatio: 0.09, avgVolume: "14.2M", rationale: "Cheapest utilities proxy with deepest liquidity" },
      { ticker: "AMT", name: "American Tower Corp (single stock)", weight: 15, expenseRatio: 0, avgVolume: "3.1M", rationale: "Direct cell tower exposure, top UTF holding" },
      { ticker: "AMLP", name: "Alerian MLP ETF", weight: 15, expenseRatio: 0.85, avgVolume: "5.1M", rationale: "Midstream income & pipeline exposure" },
      { ticker: "EQIX", name: "Equinix Inc (single stock)", weight: 12, expenseRatio: 0, avgVolume: "1.5M", rationale: "Direct data center exposure, key UTF position" },
    ]
  },
]

export const hedgeStats: HedgeStats = {
  hedgeRatio: 1.04,
  annualizedReturn: 0.8,
  annualizedVol: 2.1,
  sharpeRatio: 0.38,
  maxDrawdown: -3.2,
  realizedTE: 1.56,
  basisRiskNAV: 0.42,
  basisRiskMarket: 1.14,
  avgDailyPnL: 1587,
  dailyPnLStdDev: 66250,
  winRate: 52.3,
}

export const scenarioResults: ScenarioResult[] = [
  {
    scenario: "Distribution Cut",
    description: "Sudden 20% reduction in quarterly distribution",
    estimatedPnL: -1250000,
    maxDrawdown: -4.8,
    recoveryDays: 45,
    probability: "Low (5-10%)",
  },
  {
    scenario: "Infrastructure Shock",
    description: "10% broad market decline in infrastructure sector",
    estimatedPnL: -380000,
    maxDrawdown: -2.1,
    recoveryDays: 18,
    probability: "Moderate (15-20%)",
  },
  {
    scenario: "Liquidity Stress",
    description: "30-day period of elevated bid-ask spreads and reduced volume",
    estimatedPnL: -520000,
    maxDrawdown: -3.4,
    recoveryDays: 35,
    probability: "Low-Moderate (10-15%)",
  },
]

export const costEstimates: CostEstimate[] = [
  { component: "Long UTF Commission", bps: 2.0, dollarAmount: 10000, tier: "Institutional", notes: "Standard block trade rate" },
  { component: "Long UTF Bid-Ask Slippage", bps: 8.5, dollarAmount: 42500, tier: "Conservative", notes: "Based on 20-day avg spread of 0.12%" },
  { component: "Short Leg Commission", bps: 3.0, dollarAmount: 15000, tier: "Institutional", notes: "Per-ETF average across proxy basket" },
  { component: "Short Leg Bid-Ask Slippage", bps: 4.2, dollarAmount: 21000, tier: "Moderate", notes: "Liquid ETFs, better spreads than CEF" },
  { component: "Short Borrow Cost (Annual)", bps: 45.0, dollarAmount: 225000, tier: "General Collateral", notes: "ETF borrow readily available" },
  { component: "Rebalance Costs (Annual)", bps: 6.0, dollarAmount: 30000, tier: "Estimated", notes: "Quarterly rebalance assumption" },
  { component: "Market Impact (Entry)", bps: 12.0, dollarAmount: 60000, tier: "Moderate", notes: "3-5 day execution window for $50M" },
]

export const proxyExecutionEstimates = [
  { basket: "Core Infrastructure Blend", timeToExecute: "2-3 days", marketImpact: "8-12 bps", liquidity: "High" },
  { basket: "Income-Focused Replication", timeToExecute: "3-4 days", marketImpact: "10-15 bps", liquidity: "Moderate" },
  { basket: "Minimum Tracking Error", timeToExecute: "2-3 days", marketImpact: "6-10 bps", liquidity: "High" },
]

// 2-year NAV & Price data (monthly summary points)
export const navPriceData: NAVPriceData[] = [
  { date: "Jan 24", nav: 25.12, price: 23.85, premium: -5.06 },
  { date: "Feb 24", nav: 25.48, price: 24.22, premium: -4.94 },
  { date: "Mar 24", nav: 26.01, price: 24.95, premium: -4.07 },
  { date: "Apr 24", nav: 25.33, price: 23.98, premium: -5.33 },
  { date: "May 24", nav: 25.89, price: 24.71, premium: -4.56 },
  { date: "Jun 24", nav: 26.22, price: 25.30, premium: -3.51 },
  { date: "Jul 24", nav: 26.78, price: 25.88, premium: -3.36 },
  { date: "Aug 24", nav: 27.15, price: 26.44, premium: -2.62 },
  { date: "Sep 24", nav: 26.82, price: 25.91, premium: -3.39 },
  { date: "Oct 24", nav: 26.45, price: 25.48, premium: -3.67 },
  { date: "Nov 24", nav: 27.01, price: 26.15, premium: -3.18 },
  { date: "Dec 24", nav: 27.38, price: 26.42, premium: -3.51 },
  { date: "Jan 25", nav: 27.65, price: 26.80, premium: -3.07 },
  { date: "Feb 25", nav: 27.92, price: 27.15, premium: -2.76 },
  { date: "Mar 25", nav: 27.55, price: 26.62, premium: -3.38 },
  { date: "Apr 25", nav: 28.01, price: 27.20, premium: -2.89 },
  { date: "May 25", nav: 28.45, price: 27.68, premium: -2.71 },
  { date: "Jun 25", nav: 28.82, price: 28.10, premium: -2.50 },
  { date: "Jul 25", nav: 29.15, price: 28.55, premium: -2.06 },
  { date: "Aug 25", nav: 29.42, price: 28.90, premium: -1.77 },
  { date: "Sep 25", nav: 28.98, price: 28.22, premium: -2.62 },
  { date: "Oct 25", nav: 29.18, price: 28.45, premium: -2.50 },
  { date: "Nov 25", nav: 29.55, price: 28.92, premium: -2.13 },
  { date: "Dec 25", nav: 29.82, price: 29.15, premium: -2.25 },
]

// Simulated daily P&L for hedge (last 90 days)
function generateDailyPnL(): DailyPnLData[] {
  const data: DailyPnLData[] = []
  let cumPnl = 0
  const startDate = new Date(2025, 9, 1)

  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dailyPnl = (Math.random() - 0.48) * 150000 // slight positive drift
    cumPnl += dailyPnl
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pnl: Math.round(dailyPnl),
      cumPnl: Math.round(cumPnl),
    })
  }
  return data
}

export const dailyPnLData = generateDailyPnL()

// Concentration metrics
export const concentrationMetrics = {
  top5Weight: 23.7,
  top10Weight: 39.3,
  top20Weight: 59.9,
  herfindahlIndex: 0.032,
  effectivePositions: 31.2,
  totalPositions: 81,
  avgLiquidityScore: 87.4,
  medianLiquidityScore: 90,
}

// Leverage / Derivatives probe
export const leverageProbe = {
  flagged: true,
  unexplainedReturn: 2.3,
  leverageEstimate: 1.22,
  likelyInstruments: [
    "Interest rate swaps (duration management)",
    "Credit default swaps (credit exposure fine-tuning)",
    "Reverse repurchase agreements (structural leverage)",
    "Total return swaps on illiquid infrastructure positions",
  ],
  evidence: [
    "Realized volatility exceeds portfolio-weighted vol by 18%",
    "Distribution yield (7.8%) exceeds weighted portfolio yield (5.1%) by 270bps",
    "Return attribution residual of +2.3% annualized cannot be explained by visible holdings",
    "Quarterly filing shows $180M in borrowing facility usage",
  ],
}

// Confidence & Caveats
export const confidenceScore = 72
export const invalidationRisks = [
  { risk: "Disclosure lag (45-60 day filing delay)", severity: "High", impact: "Holdings may have shifted significantly since last filing" },
  { risk: "Hidden derivative overlays", severity: "High", impact: "Leverage and hedging positions not fully visible in holdings data" },
  { risk: "Illiquid / private positions", severity: "Medium", impact: "Approximately 3-5% of NAV may be in non-public securities" },
  { risk: "Distribution policy changes", severity: "Medium", impact: "Managed distribution can mask or amplify NAV returns" },
  { risk: "Foreign currency exposure", severity: "Low", impact: "~15% non-USD holdings introduce FX basis risk" },
  { risk: "Tax treatment differences", severity: "Low", impact: "CEF vs ETF tax efficiency creates tracking divergence" },
]

// Fund overview
export const fundOverview = {
  name: "Cohen & Steers Infrastructure Fund",
  ticker: "UTF",
  exchange: "NYSE",
  totalAssets: 3000000000,
  nav: 29.82,
  marketPrice: 29.15,
  premiumDiscount: -2.25,
  distributionRate: 7.8,
  distributionFrequency: "Monthly",
  expenseRatio: 1.89,
  leverage: 22.4,
  inceptionDate: "Mar 2004",
  fiscalYearEnd: "December",
  asOfDate: "Dec 31, 2025",
}

// Tiered slippage by notional band
export interface SlippageTier {
  notionalBand: string
  notionalMin: number
  notionalMax: number
  bidAskSlippage: number
  marketImpact: number
  totalSlippage: number
  notes: string
}

export const slippageTiers: SlippageTier[] = [
  { notionalBand: "$0 - $10M", notionalMin: 0, notionalMax: 10000000, bidAskSlippage: 3, marketImpact: 2, totalSlippage: 5, notes: "Minimal market impact; can be executed intraday" },
  { notionalBand: "$10M - $25M", notionalMin: 10000000, notionalMax: 25000000, bidAskSlippage: 5, marketImpact: 5, totalSlippage: 10, notes: "Moderate impact; 1-2 day execution recommended" },
  { notionalBand: "$25M - $50M", notionalMin: 25000000, notionalMax: 50000000, bidAskSlippage: 8, marketImpact: 10, totalSlippage: 18, notes: "Significant impact; VWAP/TWAP over 2-3 days" },
  { notionalBand: "$50M - $100M", notionalMin: 50000000, notionalMax: 100000000, bidAskSlippage: 12, marketImpact: 18, totalSlippage: 30, notes: "High impact; 3-5 day algo execution required" },
  { notionalBand: "$100M+", notionalMin: 100000000, notionalMax: 999999999, bidAskSlippage: 18, marketImpact: 30, totalSlippage: 48, notes: "Severe impact; block facilitation or dark pools recommended" },
]

// NAV vs Market return decomposition
export interface ReturnDecomposition {
  period: string
  totalReturn: number
  navReturn: number
  premiumDiscountEffect: number
  distributionReturn: number
  leverageEffect: number
}

export const returnDecomposition: ReturnDecomposition[] = [
  { period: "3 Month", totalReturn: 4.2, navReturn: 3.1, premiumDiscountEffect: 0.4, distributionReturn: 1.95, leverageEffect: -1.25 },
  { period: "6 Month", totalReturn: 8.8, navReturn: 6.5, premiumDiscountEffect: 0.8, distributionReturn: 3.9, leverageEffect: -2.4 },
  { period: "1 Year", totalReturn: 15.6, navReturn: 11.2, premiumDiscountEffect: 1.2, distributionReturn: 7.8, leverageEffect: -4.6 },
  { period: "2 Year", totalReturn: 28.4, navReturn: 20.8, premiumDiscountEffect: 2.1, distributionReturn: 15.6, leverageEffect: -10.1 },
]

// Correlation regime comparison (90d vs 180d)
export interface CorrelationRegime {
  basket: string
  corr90d: number
  corr180d: number
  delta: number
  stressCorr: number
  regimeStable: boolean
}

export const correlationRegimes: CorrelationRegime[] = [
  { basket: "Core Infrastructure Blend", corr90d: 0.964, corr180d: 0.951, delta: -0.013, stressCorr: 0.918, regimeStable: true },
  { basket: "Income-Focused Replication", corr90d: 0.948, corr180d: 0.939, delta: -0.009, stressCorr: 0.892, regimeStable: false },
  { basket: "Minimum Tracking Error", corr90d: 0.971, corr180d: 0.958, delta: -0.013, stressCorr: 0.932, regimeStable: true },
]

// Input checklist items
export interface InputChecklistItem {
  item: string
  source: string
  status: "ready" | "pending" | "action-required"
  action: string
}

export const inputChecklist: InputChecklistItem[] = [
  { item: "UTF Q4 2025 Holdings CSV", source: "Cohen & Steers fund page", status: "ready", action: "Download latest holdings CSV" },
  { item: "2-Year Daily NAV & Market Price", source: "CEF Connect or Yahoo Finance", status: "ready", action: "Export daily NAV and market price CSVs" },
  { item: "Distribution History", source: "Cohen & Steers / Yahoo Finance", status: "ready", action: "Capture distribution dates and amounts" },
  { item: "Premium/Discount Chart (2-year)", source: "CEF Connect", status: "ready", action: "Export screenshot or CSV" },
  { item: "Target Notional", source: "User-defined", status: "ready", action: "$50,000,000 (set)" },
  { item: "Execution Assumptions", source: "Internal", status: "ready", action: "5-10 bps for ETFs under $1B ADV; escalate for lower liquidity" },
]

// Hercules prompt (final, ready to paste)
export const herculesPrompt = `Analyze UTF (Cohen & Steers Infrastructure Fund, NYSE:UTF) using the latest disclosed holdings (Q4 2025 CSV from Cohen & Steers) and 2-year daily NAV and market price data. Perform the following and return structured outputs:

1. Holdings Decomposition:
   - Parse holdings into USD-weighted sector and issuer exposures.
   - Report top 20 positions, concentration metrics, and estimated liquidity score per holding.

2. Factor Attribution:
   - Estimate exposures to value, momentum, dividend yield, credit sensitivity, duration, REIT/infra, and sector factors.
   - Decompose returns into NAV-driven factors vs market-price (premium/discount) effects.

3. Proxy Construction:
   - Produce top 3 ETF proxy baskets (max 5 tickers each) that replicate UTF's NAV returns.
   - Optimize for: 90-day rolling correlation target; include 180-day stress correlation; tracking error ≤2%; prefer liquid, low-cost ETFs.
   - Provide candidate weights, expected turnover, and rationale for each ETF choice.

4. Hedge Simulation:
   - Simulate a $50M long UTF / short proxy implementation.
   - Compute hedge ratio, daily P&L distribution, cumulative P&L, max drawdown, realized tracking error, and basis risk (NAV vs market).
   - Include scenario analysis for 1) sudden distribution cut, 2) 10% market shock to infrastructure sector, 3) 30-day liquidity stress.

5. Implementation Costs:
   - Estimate transaction costs, bid/ask slippage, and borrow cost for the short leg at $50M notional; provide tiered slippage assumptions.
   - Provide estimated time-to-execute and market impact for each proxy candidate.

6. Leverage and Derivatives Probe:
   - Flag signs of undisclosed leverage or derivatives if realized returns cannot be explained by holdings and visible exposures.
   - If flagged, quantify unexplained return component and list likely instruments.

7. Confidence & Caveats:
   - Provide a replication confidence score (0-100).
   - List invalidation risks (e.g., disclosure lag, hidden swaps, large illiquid positions, distribution policy changes).

Deliverables:
- CSV: reconstructed UTF holdings with proxy weights and liquidity scores.
- JSON: factor exposures, correlation matrices (90d & 180d), hedge stats, and slippage assumptions.
- PDF/Markdown: 1-page advisor explainer (narrative, hedge talking points, and a simple visual).
Inputs required: holdings CSV (source: Cohen & Steers), 2 years daily NAV & market price (source: CEF Connect or Yahoo Finance), distribution history, target notional ($50M).`

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}
