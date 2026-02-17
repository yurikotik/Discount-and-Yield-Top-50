// Multi-CEF Universe Data Layer
// Contains typed profiles for 10 CEFs with full analysis data,
// plus aggregation logic for the synthetic hedge fund.

import {
  type Holding,
  type SectorExposure,
  type FactorExposure,
  type ProxyBasket,
  type HedgeSimulation,
  type CostComponent,
  type LeverageProbe,
  type SlippageTier,
  type ReturnDecomposition,
  type CorrelationRegime,
  formatCurrency,
  formatPercent,
  formatBps,
} from "./utf-data"

// Re-export for convenience
export { formatCurrency, formatPercent, formatBps }

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CEFOverview {
  ticker: string
  name: string
  sponsor: string
  strategy: string
  aum: number           // in billions
  navPerShare: number
  marketPrice: number
  premiumDiscount: number // percent
  distributionRate: number // percent
  leverageRatio: number // percent
  expenseRatio: number  // percent
  inceptionDate: string
  benchmark: string
}

export interface CEFProfile {
  overview: CEFOverview
  holdings: Holding[]
  sectors: SectorExposure[]
  factors: FactorExposure[]
  proxyBaskets: ProxyBasket[]
  hedgeSimulation: HedgeSimulation
  costs: CostComponent[]
  leverageProbe: LeverageProbe
  confidence: number
  caveats: string[]
  correlationRegimes: CorrelationRegime[]
  returnDecomposition: ReturnDecomposition[]
  slippageTiers: SlippageTier[]
  selectedProxyIndex: number // which basket the user chose (0-2)
  navHistory: { date: string; nav: number; price: number }[]
}

export type WeightingRule = "aum-weighted" | "risk-parity" | "equal-risk"

export interface SyntheticHedgeFund {
  name: string
  totalNotional: number
  weightingRule: WeightingRule
  allocations: {
    ticker: string
    weight: number
    notional: number
    proxyBasket: ProxyBasket
    hedgeRatio: number
    correlation: number
    trackingError: number
    slippage: number
    borrowCost: number
    executionDays: number
  }[]
  portfolioMetrics: {
    weightedCorrelation: number
    portfolioTrackingError: number
    diversificationRatio: number
    aggregateMaxDrawdown: number
    totalBorrowCost: number
    totalSlippage: number
    expectedSharpe: number
    netBeta: number
  }
  combinedPnl: { day: number; pnl: number; cumulative: number }[]
  crossCorrelationMatrix: number[][]
  factorConcentration: { factor: string; exposure: number }[]
}

// ─── Utility: generate 60-day nav+price history ─────────────────────────────

function generateNavHistory(
  baseNav: number,
  basePrice: number,
  volatility: number
): { date: string; nav: number; price: number }[] {
  const history: { date: string; nav: number; price: number }[] = []
  let nav = baseNav
  let price = basePrice
  const today = new Date(2026, 1, 17) // Feb 17 2026
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    nav += (Math.random() - 0.48) * volatility * nav
    price += (Math.random() - 0.48) * volatility * 1.15 * price // price is more volatile
    nav = Math.max(nav * 0.7, Math.min(nav * 1.3, nav))
    price = Math.max(price * 0.7, Math.min(price * 1.3, price))
    history.push({
      date: dateStr,
      nav: parseFloat(nav.toFixed(2)),
      price: parseFloat(price.toFixed(2)),
    })
  }
  return history
}

// ─── Per-fund seeded PnL ────────────────────────────────────────────────────

function generateHedgePnl(
  seed: number,
  drift: number,
  vol: number
): { day: number; pnl: number; cumulative: number }[] {
  const data: { day: number; pnl: number; cumulative: number }[] = []
  let cumulative = 0
  let s = seed
  for (let d = 1; d <= 504; d++) {
    s = (s * 16807) % 2147483647
    const u = s / 2147483647
    const daily = drift + (u - 0.5) * vol
    cumulative += daily
    data.push({ day: d, pnl: parseFloat(daily.toFixed(0)), cumulative: parseFloat(cumulative.toFixed(0)) })
  }
  return data
}

// ─── Standard slippage tiers (same structure, fund-specific scaling) ────────

function makeSlippageTiers(scale: number): SlippageTier[] {
  return [
    { notionalBand: "$0 - $10M", notionalMin: 0, notionalMax: 10e6, bidAskSlippage: Math.round(3 * scale), marketImpact: Math.round(2 * scale), totalSlippage: Math.round(5 * scale), notes: "Minimal market impact; can be executed intraday" },
    { notionalBand: "$10M - $25M", notionalMin: 10e6, notionalMax: 25e6, bidAskSlippage: Math.round(5 * scale), marketImpact: Math.round(5 * scale), totalSlippage: Math.round(10 * scale), notes: "Moderate impact; 1-2 day execution recommended" },
    { notionalBand: "$25M - $50M", notionalMin: 25e6, notionalMax: 50e6, bidAskSlippage: Math.round(8 * scale), marketImpact: Math.round(10 * scale), totalSlippage: Math.round(18 * scale), notes: "Significant impact; VWAP/TWAP over 2-3 days" },
    { notionalBand: "$50M - $100M", notionalMin: 50e6, notionalMax: 100e6, bidAskSlippage: Math.round(12 * scale), marketImpact: Math.round(18 * scale), totalSlippage: Math.round(30 * scale), notes: "High impact; 3-5 day algo execution required" },
    { notionalBand: "$100M+", notionalMin: 100e6, notionalMax: 999e6, bidAskSlippage: Math.round(18 * scale), marketImpact: Math.round(30 * scale), totalSlippage: Math.round(48 * scale), notes: "Severe impact; block facilitation or dark pools recommended" },
  ]
}

// ─── CEF Profiles ────────────────────────────────────────────────────────────

const utfProfile: CEFProfile = {
  overview: {
    ticker: "UTF",
    name: "Cohen & Steers Infrastructure Fund",
    sponsor: "Cohen & Steers",
    strategy: "Global listed infrastructure with leverage",
    aum: 3.0,
    navPerShare: 26.42,
    marketPrice: 24.89,
    premiumDiscount: -5.79,
    distributionRate: 7.8,
    leverageRatio: 22.4,
    expenseRatio: 2.16,
    inceptionDate: "2004-03-30",
    benchmark: "S&P Global Infrastructure Index",
  },
  holdings: [
    { name: "NextEra Energy Inc", ticker: "NEE", sector: "Utilities", weight: 6.2, marketValue: 186000000, country: "US" },
    { name: "American Tower Corp", ticker: "AMT", sector: "REITs", weight: 5.8, marketValue: 174000000, country: "US" },
    { name: "Crown Castle Intl", ticker: "CCI", sector: "REITs", weight: 4.1, marketValue: 123000000, country: "US" },
    { name: "Enbridge Inc", ticker: "ENB", sector: "Energy Infrastructure", weight: 3.9, marketValue: 117000000, country: "CA" },
    { name: "Transurban Group", ticker: "TCL.AX", sector: "Toll Roads", weight: 3.6, marketValue: 108000000, country: "AU" },
    { name: "National Grid PLC", ticker: "NGG", sector: "Utilities", weight: 3.4, marketValue: 102000000, country: "UK" },
    { name: "Williams Companies", ticker: "WMB", sector: "Energy Infrastructure", weight: 3.2, marketValue: 96000000, country: "US" },
    { name: "SBA Communications", ticker: "SBAC", sector: "REITs", weight: 3.0, marketValue: 90000000, country: "US" },
    { name: "Sempra Energy", ticker: "SRE", sector: "Utilities", weight: 2.8, marketValue: 84000000, country: "US" },
    { name: "Brookfield Asset Mgmt", ticker: "BAM", sector: "Asset Management", weight: 2.7, marketValue: 81000000, country: "CA" },
    { name: "Duke Energy Corp", ticker: "DUK", sector: "Utilities", weight: 2.5, marketValue: 75000000, country: "US" },
    { name: "Aena SME SA", ticker: "AENA.MC", sector: "Airports", weight: 2.4, marketValue: 72000000, country: "ES" },
    { name: "TC Energy Corp", ticker: "TRP", sector: "Energy Infrastructure", weight: 2.3, marketValue: 69000000, country: "CA" },
    { name: "Prologis Inc", ticker: "PLD", sector: "REITs", weight: 2.2, marketValue: 66000000, country: "US" },
    { name: "Enel SpA", ticker: "ENEL.MI", sector: "Utilities", weight: 2.1, marketValue: 63000000, country: "IT" },
    { name: "Ferrovial SE", ticker: "FER", sector: "Toll Roads", weight: 1.9, marketValue: 57000000, country: "NL" },
    { name: "Dominion Energy Inc", ticker: "D", sector: "Utilities", weight: 1.8, marketValue: 54000000, country: "US" },
    { name: "Cellnex Telecom", ticker: "CLNX.MC", sector: "Telecom Infrastructure", weight: 1.7, marketValue: 51000000, country: "ES" },
    { name: "Atlas Copco AB", ticker: "ATCO-A.ST", sector: "Industrials", weight: 1.5, marketValue: 45000000, country: "SE" },
    { name: "Cheniere Energy Inc", ticker: "LNG", sector: "Energy Infrastructure", weight: 1.4, marketValue: 42000000, country: "US" },
  ],
  sectors: [
    { sector: "Utilities", weight: 32.8, color: "#4a9eff" },
    { sector: "REITs", weight: 18.4, color: "#34d399" },
    { sector: "Energy Infrastructure", weight: 16.2, color: "#fbbf24" },
    { sector: "Toll Roads / Transport", weight: 10.8, color: "#f87171" },
    { sector: "Telecom Infrastructure", weight: 8.6, color: "#a78bfa" },
    { sector: "Airports", weight: 5.2, color: "#fb923c" },
    { sector: "Other", weight: 8.0, color: "#64748b" },
  ],
  factors: [
    { factor: "Dividend Yield", exposure: 0.82, tStat: 8.4, significance: "high" },
    { factor: "Interest Rate Sensitivity", exposure: -0.65, tStat: -6.2, significance: "high" },
    { factor: "Infrastructure Beta", exposure: 0.91, tStat: 12.1, significance: "high" },
    { factor: "REIT Beta", exposure: 0.48, tStat: 4.1, significance: "high" },
    { factor: "Value", exposure: 0.35, tStat: 2.8, significance: "medium" },
    { factor: "Momentum", exposure: 0.12, tStat: 1.1, significance: "low" },
    { factor: "Credit Sensitivity", exposure: 0.28, tStat: 2.3, significance: "medium" },
    { factor: "Leverage Factor", exposure: 0.44, tStat: 3.6, significance: "high" },
  ],
  proxyBaskets: [
    {
      name: "Core Infrastructure Blend",
      tickers: ["IGF", "IFRA", "VPU", "AMT", "ENB"],
      weights: [0.30, 0.25, 0.20, 0.15, 0.10],
      correlation: 0.964,
      trackingError: 1.42,
      annualizedCost: 0.18,
      rationale: "Broad infrastructure exposure via liquid ETFs; overweight US utilities to match UTF tilt",
    },
    {
      name: "Income-Focused Replication",
      tickers: ["PFFA", "VPU", "EMLP", "REM", "HYG"],
      weights: [0.25, 0.25, 0.20, 0.15, 0.15],
      correlation: 0.948,
      trackingError: 1.78,
      annualizedCost: 0.32,
      rationale: "Higher-yield proxies targeting UTF distribution profile; includes credit for leverage effect",
    },
    {
      name: "Minimum Tracking Error",
      tickers: ["IGF", "VPU", "IFRA", "XLRE"],
      weights: [0.35, 0.30, 0.20, 0.15],
      correlation: 0.971,
      trackingError: 1.18,
      annualizedCost: 0.15,
      rationale: "Lowest tracking error blend; sacrifices some yield matching for NAV return correlation",
    },
  ],
  hedgeSimulation: {
    notional: 50000000,
    hedgeRatio: 0.92,
    dailyPnl: generateHedgePnl(42, -200, 80000),
    maxDrawdown: -2850000,
    realizedTrackingError: 1.42,
    sharpeRatio: -0.18,
    basisRisk: 0.036,
    scenarios: [
      { scenario: "Distribution Cut (50%)", pnlImpact: -3200000, probability: "Low (5-10%)", description: "Market price drops 8-12% on distribution cut; NAV impact smaller" },
      { scenario: "Infrastructure Sector -10%", pnlImpact: -1800000, probability: "Medium (15-20%)", description: "Beta mismatch causes tracking divergence in sharp selloffs" },
      { scenario: "30-Day Liquidity Stress", pnlImpact: -4100000, probability: "Low (5%)", description: "Bid-ask widens to 80bps; forced rebalance at adverse prices" },
    ],
  },
  costs: [
    { component: "Bid-Ask Spread (ETF leg)", bps: 3, dollarCost: 15000, notes: "Weighted avg across proxy ETFs" },
    { component: "Bid-Ask Spread (CEF leg)", bps: 8, dollarCost: 40000, notes: "UTF avg spread ~15-20 cents" },
    { component: "Market Impact (entry)", bps: 5, dollarCost: 25000, notes: "Estimated for $50M over 2-3 days" },
    { component: "Short Borrow Cost (annual)", bps: 45, dollarCost: 225000, notes: "General collateral; may spike" },
    { component: "Rebalance Cost (quarterly)", bps: 4, dollarCost: 20000, notes: "Proxy weight drift adjustment" },
    { component: "Total Year-1 Estimated", bps: 65, dollarCost: 325000, notes: "All-in first year cost" },
  ],
  leverageProbe: {
    leverageDetected: true,
    estimatedLeverage: 22.4,
    instruments: [
      { type: "Reverse Repurchase Agreements", notional: 450000000, description: "Primary leverage via repo financing at SOFR + 85bps" },
      { type: "Credit Facility", notional: 220000000, description: "Committed bank line; variable rate" },
    ],
    unexplainedReturn: 1.8,
    confidenceInDetection: 88,
    notes: "Leverage is disclosed in filings. Reverse repos account for ~60% of total leverage. Unexplained return component likely from active management alpha and timing of leverage deployment.",
  },
  confidence: 72,
  caveats: [
    "Holdings disclosure lags by ~60 days (Q4 data as of Dec 2025)",
    "Reverse repo financing rates may change with SOFR movements",
    "Active management alpha not captured by static proxy",
    "Premium/discount dynamics are path-dependent and not fully replicable",
    "International holdings subject to FX hedging not visible in filings",
  ],
  correlationRegimes: [
    { basket: "Core Infrastructure Blend", corr90d: 0.964, corr180d: 0.951, delta: -0.013, stressCorr: 0.918, regimeStable: true },
    { basket: "Income-Focused Replication", corr90d: 0.948, corr180d: 0.939, delta: -0.009, stressCorr: 0.892, regimeStable: false },
    { basket: "Minimum Tracking Error", corr90d: 0.971, corr180d: 0.958, delta: -0.013, stressCorr: 0.932, regimeStable: true },
  ],
  returnDecomposition: [
    { period: "3 Month", totalReturn: 4.2, navReturn: 3.1, premiumDiscountEffect: 0.4, distributionReturn: 1.95, leverageEffect: -1.25 },
    { period: "6 Month", totalReturn: 8.8, navReturn: 6.5, premiumDiscountEffect: 0.8, distributionReturn: 3.9, leverageEffect: -2.4 },
    { period: "1 Year", totalReturn: 15.6, navReturn: 11.2, premiumDiscountEffect: 1.2, distributionReturn: 7.8, leverageEffect: -4.6 },
    { period: "2 Year", totalReturn: 28.4, navReturn: 20.8, premiumDiscountEffect: 2.1, distributionReturn: 15.6, leverageEffect: -10.1 },
  ],
  slippageTiers: makeSlippageTiers(1.0),
  selectedProxyIndex: 0,
  navHistory: generateNavHistory(26.42, 24.89, 0.008),
}

const pdiProfile: CEFProfile = {
  overview: {
    ticker: "PDI",
    name: "PIMCO Dynamic Income Fund",
    sponsor: "PIMCO",
    strategy: "Multi-sector fixed income with aggressive leverage",
    aum: 4.8,
    navPerShare: 18.92,
    marketPrice: 19.84,
    premiumDiscount: 4.86,
    distributionRate: 12.1,
    leverageRatio: 38.2,
    expenseRatio: 3.42,
    inceptionDate: "2012-05-30",
    benchmark: "Bloomberg US Aggregate Bond Index",
  },
  holdings: [
    { name: "US Treasury 2.875% 2032", ticker: "UST", sector: "Government", weight: 8.2, marketValue: 393600000, country: "US" },
    { name: "FNMA 30Y 4.0%", ticker: "FNMA", sector: "Agency MBS", weight: 7.1, marketValue: 340800000, country: "US" },
    { name: "GNMA 30Y 3.5%", ticker: "GNMA", sector: "Agency MBS", weight: 5.8, marketValue: 278400000, country: "US" },
    { name: "JPMorgan Chase 5.25% 2030", ticker: "JPM", sector: "Investment Grade Corp", weight: 3.4, marketValue: 163200000, country: "US" },
    { name: "Brazil 6.0% 2033", ticker: "BRAZIL", sector: "EM Sovereign", weight: 3.1, marketValue: 148800000, country: "BR" },
    { name: "FHLMC 15Y 3.0%", ticker: "FHLMC", sector: "Agency MBS", weight: 2.9, marketValue: 139200000, country: "US" },
    { name: "Mexico 5.75% 2034", ticker: "MEXICO", sector: "EM Sovereign", weight: 2.7, marketValue: 129600000, country: "MX" },
    { name: "Goldman Sachs 4.75% 2029", ticker: "GS", sector: "Investment Grade Corp", weight: 2.5, marketValue: 120000000, country: "US" },
    { name: "Ford Motor Credit 6.5% 2028", ticker: "F", sector: "High Yield Corp", weight: 2.3, marketValue: 110400000, country: "US" },
    { name: "CCC-rated CLO Equity Tranche", ticker: "CLO-EQ", sector: "Structured Credit", weight: 2.1, marketValue: 100800000, country: "US" },
    { name: "T-Mobile 4.375% 2030", ticker: "TMUS", sector: "Investment Grade Corp", weight: 1.9, marketValue: 91200000, country: "US" },
    { name: "Turkey 7.25% 2032", ticker: "TURKEY", sector: "EM Sovereign", weight: 1.8, marketValue: 86400000, country: "TR" },
    { name: "Carnival Corp 7.0% 2029", ticker: "CCL", sector: "High Yield Corp", weight: 1.7, marketValue: 81600000, country: "US" },
    { name: "CMBS 2024-1 A1", ticker: "CMBS", sector: "CMBS", weight: 1.6, marketValue: 76800000, country: "US" },
    { name: "Indonesia 5.5% 2035", ticker: "INDO", sector: "EM Sovereign", weight: 1.5, marketValue: 72000000, country: "ID" },
    { name: "Sprint Cap 6.875% 2028", ticker: "S", sector: "High Yield Corp", weight: 1.4, marketValue: 67200000, country: "US" },
    { name: "South Africa 6.25% 2036", ticker: "SOAF", sector: "EM Sovereign", weight: 1.3, marketValue: 62400000, country: "ZA" },
    { name: "ABS Auto 2024-2 B", ticker: "ABS", sector: "ABS", weight: 1.2, marketValue: 57600000, country: "US" },
    { name: "Greece 3.875% 2033", ticker: "GREECE", sector: "EM Sovereign", weight: 1.1, marketValue: 52800000, country: "GR" },
    { name: "Residential MBS Non-Agency", ticker: "RMBS-NA", sector: "Non-Agency RMBS", weight: 1.0, marketValue: 48000000, country: "US" },
  ],
  sectors: [
    { sector: "Agency MBS", weight: 28.4, color: "#4a9eff" },
    { sector: "EM Sovereign", weight: 18.2, color: "#34d399" },
    { sector: "Investment Grade Corp", weight: 14.8, color: "#fbbf24" },
    { sector: "High Yield Corp", weight: 12.6, color: "#f87171" },
    { sector: "Government", weight: 10.1, color: "#a78bfa" },
    { sector: "Structured Credit", weight: 8.4, color: "#fb923c" },
    { sector: "Other", weight: 7.5, color: "#64748b" },
  ],
  factors: [
    { factor: "Duration", exposure: 0.72, tStat: 7.8, significance: "high" },
    { factor: "Credit Spread", exposure: 0.88, tStat: 9.2, significance: "high" },
    { factor: "MBS Prepayment", exposure: 0.61, tStat: 5.4, significance: "high" },
    { factor: "EM Currency", exposure: 0.35, tStat: 3.1, significance: "medium" },
    { factor: "Leverage Factor", exposure: 0.78, tStat: 6.8, significance: "high" },
    { factor: "Dividend Yield", exposure: 0.92, tStat: 10.4, significance: "high" },
    { factor: "Value", exposure: 0.15, tStat: 1.3, significance: "low" },
    { factor: "Momentum", exposure: -0.22, tStat: -1.8, significance: "low" },
  ],
  proxyBaskets: [
    { name: "Fixed Income Core", tickers: ["AGG", "MBB", "HYG", "EMB", "TLT"], weights: [0.25, 0.25, 0.20, 0.15, 0.15], correlation: 0.912, trackingError: 2.84, annualizedCost: 0.22, rationale: "Broad fixed income with MBS tilt; EM sovereign for international exposure" },
    { name: "High Yield + MBS Blend", tickers: ["HYG", "MBB", "BKLN", "EMB"], weights: [0.30, 0.30, 0.20, 0.20], correlation: 0.928, trackingError: 2.41, annualizedCost: 0.35, rationale: "Higher-yield focus matching PDI distribution; leveraged loan proxy for CLO exposure" },
    { name: "Leveraged Bond Proxy", tickers: ["MBB", "AGG", "HYG", "TLT", "BKLN"], weights: [0.25, 0.20, 0.20, 0.20, 0.15], correlation: 0.935, trackingError: 2.18, annualizedCost: 0.28, rationale: "Best tracking; broad curve exposure mimics leveraged portfolio duration" },
  ],
  hedgeSimulation: {
    notional: 50000000,
    hedgeRatio: 0.78,
    dailyPnl: generateHedgePnl(123, -420, 120000),
    maxDrawdown: -4800000,
    realizedTrackingError: 2.84,
    sharpeRatio: -0.35,
    basisRisk: 0.068,
    scenarios: [
      { scenario: "Distribution Cut (50%)", pnlImpact: -5600000, probability: "Medium (10-15%)", description: "Premium collapses; PDI trades from +5% to -8% discount" },
      { scenario: "Rates +100bps Shock", pnlImpact: -3200000, probability: "Medium (15-20%)", description: "Duration mismatch between PDI leveraged portfolio and proxy" },
      { scenario: "EM Credit Crisis", pnlImpact: -6200000, probability: "Low (5-8%)", description: "EM sovereign holdings gap down; limited proxy coverage" },
    ],
  },
  costs: [
    { component: "Bid-Ask Spread (ETF leg)", bps: 4, dollarCost: 20000, notes: "Slightly wider due to HYG/EMB" },
    { component: "Bid-Ask Spread (CEF leg)", bps: 6, dollarCost: 30000, notes: "PDI is highly liquid for a CEF" },
    { component: "Market Impact (entry)", bps: 8, dollarCost: 40000, notes: "Larger AUM absorbs flow better" },
    { component: "Short Borrow Cost (annual)", bps: 55, dollarCost: 275000, notes: "Moderate demand for borrow" },
    { component: "Rebalance Cost (quarterly)", bps: 6, dollarCost: 30000, notes: "Duration drift requires frequent rebalance" },
    { component: "Total Year-1 Estimated", bps: 79, dollarCost: 395000, notes: "Higher costs due to complexity" },
  ],
  leverageProbe: {
    leverageDetected: true,
    estimatedLeverage: 38.2,
    instruments: [
      { type: "Reverse Repurchase Agreements", notional: 1200000000, description: "Primary leverage source; SOFR + 75bps" },
      { type: "Total Return Swaps", notional: 480000000, description: "Synthetic EM and credit exposure" },
      { type: "Interest Rate Swaps", notional: 320000000, description: "Duration management overlay" },
    ],
    unexplainedReturn: 3.4,
    confidenceInDetection: 72,
    notes: "High leverage ratio creates significant basis risk. TRS on EM sovereign creates hidden convexity exposure not captured by linear proxy. Unexplained return likely from active swap management and CLO equity carry.",
  },
  confidence: 58,
  caveats: [
    "38% leverage amplifies all tracking errors by ~1.6x",
    "CLO equity positions are illiquid and mark-to-model",
    "Active derivative overlay creates non-linear payoff profiles",
    "Distribution at 12.1% may include return of capital",
    "Premium (+4.9%) creates entry risk for new positions",
    "EM sovereign exposure subject to sudden gap risk",
  ],
  correlationRegimes: [
    { basket: "Fixed Income Core", corr90d: 0.912, corr180d: 0.895, delta: -0.017, stressCorr: 0.842, regimeStable: false },
    { basket: "High Yield + MBS Blend", corr90d: 0.928, corr180d: 0.911, delta: -0.017, stressCorr: 0.868, regimeStable: false },
    { basket: "Leveraged Bond Proxy", corr90d: 0.935, corr180d: 0.920, delta: -0.015, stressCorr: 0.881, regimeStable: true },
  ],
  returnDecomposition: [
    { period: "3 Month", totalReturn: 3.8, navReturn: 2.4, premiumDiscountEffect: 0.8, distributionReturn: 3.0, leverageEffect: -2.4 },
    { period: "6 Month", totalReturn: 6.9, navReturn: 4.2, premiumDiscountEffect: 1.4, distributionReturn: 6.1, leverageEffect: -4.8 },
    { period: "1 Year", totalReturn: 11.8, navReturn: 7.6, premiumDiscountEffect: 2.2, distributionReturn: 12.1, leverageEffect: -10.1 },
    { period: "2 Year", totalReturn: 19.4, navReturn: 12.8, premiumDiscountEffect: 3.8, distributionReturn: 24.2, leverageEffect: -21.4 },
  ],
  slippageTiers: makeSlippageTiers(1.15),
  selectedProxyIndex: 0,
  navHistory: generateNavHistory(18.92, 19.84, 0.006),
}

const rqiProfile: CEFProfile = {
  overview: { ticker: "RQI", name: "Cohen & Steers Quality Income Realty Fund", sponsor: "Cohen & Steers", strategy: "US REIT income with moderate leverage", aum: 2.1, navPerShare: 13.88, marketPrice: 13.12, premiumDiscount: -5.47, distributionRate: 6.9, leverageRatio: 25.1, expenseRatio: 1.92, inceptionDate: "2002-02-28", benchmark: "FTSE Nareit All Equity REITs Index" },
  holdings: [
    { name: "Prologis Inc", ticker: "PLD", sector: "Industrial REITs", weight: 7.4, marketValue: 155400000, country: "US" },
    { name: "American Tower Corp", ticker: "AMT", sector: "Specialty REITs", weight: 6.8, marketValue: 142800000, country: "US" },
    { name: "Equinix Inc", ticker: "EQIX", sector: "Data Center REITs", weight: 5.2, marketValue: 109200000, country: "US" },
    { name: "Welltower Inc", ticker: "WELL", sector: "Healthcare REITs", weight: 4.6, marketValue: 96600000, country: "US" },
    { name: "Digital Realty Trust", ticker: "DLR", sector: "Data Center REITs", weight: 4.1, marketValue: 86100000, country: "US" },
    { name: "Public Storage", ticker: "PSA", sector: "Self Storage", weight: 3.8, marketValue: 79800000, country: "US" },
    { name: "Simon Property Group", ticker: "SPG", sector: "Retail REITs", weight: 3.5, marketValue: 73500000, country: "US" },
    { name: "Realty Income Corp", ticker: "O", sector: "Net Lease", weight: 3.2, marketValue: 67200000, country: "US" },
    { name: "VICI Properties", ticker: "VICI", sector: "Specialty REITs", weight: 2.9, marketValue: 60900000, country: "US" },
    { name: "Crown Castle Intl", ticker: "CCI", sector: "Specialty REITs", weight: 2.7, marketValue: 56700000, country: "US" },
    { name: "AvalonBay Communities", ticker: "AVB", sector: "Residential REITs", weight: 2.4, marketValue: 50400000, country: "US" },
    { name: "Extra Space Storage", ticker: "EXR", sector: "Self Storage", weight: 2.2, marketValue: 46200000, country: "US" },
    { name: "SBA Communications", ticker: "SBAC", sector: "Specialty REITs", weight: 2.0, marketValue: 42000000, country: "US" },
    { name: "Alexandria Real Estate", ticker: "ARE", sector: "Office REITs", weight: 1.8, marketValue: 37800000, country: "US" },
    { name: "Invitation Homes", ticker: "INVH", sector: "Residential REITs", weight: 1.7, marketValue: 35700000, country: "US" },
    { name: "Ventas Inc", ticker: "VTR", sector: "Healthcare REITs", weight: 1.6, marketValue: 33600000, country: "US" },
    { name: "UDR Inc", ticker: "UDR", sector: "Residential REITs", weight: 1.5, marketValue: 31500000, country: "US" },
    { name: "Kilroy Realty", ticker: "KRC", sector: "Office REITs", weight: 1.3, marketValue: 27300000, country: "US" },
    { name: "Rexford Industrial", ticker: "REXR", sector: "Industrial REITs", weight: 1.2, marketValue: 25200000, country: "US" },
    { name: "Lamar Advertising", ticker: "LAMR", sector: "Specialty REITs", weight: 1.1, marketValue: 23100000, country: "US" },
  ],
  sectors: [
    { sector: "Specialty REITs", weight: 24.8, color: "#4a9eff" },
    { sector: "Data Center REITs", weight: 16.2, color: "#34d399" },
    { sector: "Industrial REITs", weight: 14.6, color: "#fbbf24" },
    { sector: "Healthcare REITs", weight: 10.8, color: "#f87171" },
    { sector: "Residential REITs", weight: 10.2, color: "#a78bfa" },
    { sector: "Self Storage", weight: 8.4, color: "#fb923c" },
    { sector: "Other", weight: 15.0, color: "#64748b" },
  ],
  factors: [
    { factor: "REIT Beta", exposure: 0.95, tStat: 14.2, significance: "high" },
    { factor: "Dividend Yield", exposure: 0.78, tStat: 7.6, significance: "high" },
    { factor: "Interest Rate Sensitivity", exposure: -0.72, tStat: -6.8, significance: "high" },
    { factor: "Value", exposure: 0.42, tStat: 3.4, significance: "medium" },
    { factor: "Quality", exposure: 0.58, tStat: 4.8, significance: "high" },
    { factor: "Momentum", exposure: 0.18, tStat: 1.5, significance: "low" },
    { factor: "Size", exposure: -0.15, tStat: -1.2, significance: "low" },
    { factor: "Leverage Factor", exposure: 0.38, tStat: 3.0, significance: "medium" },
  ],
  proxyBaskets: [
    { name: "REIT Core Blend", tickers: ["VNQ", "XLRE", "IYR", "SCHH"], weights: [0.35, 0.25, 0.25, 0.15], correlation: 0.978, trackingError: 1.02, annualizedCost: 0.14, rationale: "Pure REIT exposure; near-perfect NAV tracking for US-focused portfolio" },
    { name: "Income REIT Proxy", tickers: ["VNQ", "REM", "KBWY", "XLRE"], weights: [0.30, 0.25, 0.25, 0.20], correlation: 0.962, trackingError: 1.38, annualizedCost: 0.28, rationale: "Higher yield targeting RQI distribution; includes mortgage and small cap REITs" },
    { name: "Quality Growth REITs", tickers: ["VNQ", "XLRE", "PSA", "PLD"], weights: [0.35, 0.25, 0.20, 0.20], correlation: 0.972, trackingError: 1.14, annualizedCost: 0.16, rationale: "Quality tilt matching RQI name selection; overweight industrial and storage" },
  ],
  hedgeSimulation: { notional: 50000000, hedgeRatio: 0.95, dailyPnl: generateHedgePnl(77, -100, 55000), maxDrawdown: -1600000, realizedTrackingError: 1.02, sharpeRatio: -0.08, basisRisk: 0.022, scenarios: [
    { scenario: "Distribution Cut (50%)", pnlImpact: -2400000, probability: "Low (3-5%)", description: "RQI has stable distribution history; impact would be discount widening" },
    { scenario: "REIT Sector -10%", pnlImpact: -800000, probability: "Medium (15-20%)", description: "High beta match means proxy tracks closely even in stress" },
    { scenario: "Rates +100bps Shock", pnlImpact: -1900000, probability: "Medium (20%)", description: "Duration mismatch between leveraged RQI and unlevered proxy" },
  ]},
  costs: [
    { component: "Bid-Ask Spread (ETF leg)", bps: 2, dollarCost: 10000, notes: "VNQ is highly liquid" },
    { component: "Bid-Ask Spread (CEF leg)", bps: 10, dollarCost: 50000, notes: "RQI moderately liquid" },
    { component: "Market Impact (entry)", bps: 6, dollarCost: 30000, notes: "$50M over 2 days" },
    { component: "Short Borrow Cost (annual)", bps: 40, dollarCost: 200000, notes: "Easy to borrow" },
    { component: "Rebalance Cost (quarterly)", bps: 3, dollarCost: 15000, notes: "Stable REIT weights" },
    { component: "Total Year-1 Estimated", bps: 61, dollarCost: 305000, notes: "Low cost; good replicability" },
  ],
  leverageProbe: { leverageDetected: true, estimatedLeverage: 25.1, instruments: [
    { type: "Reverse Repurchase Agreements", notional: 340000000, description: "REIT-collateralized repo at SOFR + 90bps" },
    { type: "Credit Facility", notional: 185000000, description: "Committed revolving line" },
  ], unexplainedReturn: 0.9, confidenceInDetection: 92, notes: "Clean leverage structure with minimal derivative overlay. High replication confidence due to transparent REIT holdings." },
  confidence: 76,
  caveats: ["Leverage amplifies rate sensitivity beyond proxy", "REIT NAV estimates lag actual market values", "Concentration in data center/specialty REITs may diverge from broad REIT indices"],
  correlationRegimes: [
    { basket: "REIT Core Blend", corr90d: 0.978, corr180d: 0.972, delta: -0.006, stressCorr: 0.955, regimeStable: true },
    { basket: "Income REIT Proxy", corr90d: 0.962, corr180d: 0.951, delta: -0.011, stressCorr: 0.928, regimeStable: true },
    { basket: "Quality Growth REITs", corr90d: 0.972, corr180d: 0.964, delta: -0.008, stressCorr: 0.942, regimeStable: true },
  ],
  returnDecomposition: [
    { period: "3 Month", totalReturn: 3.8, navReturn: 3.2, premiumDiscountEffect: 0.2, distributionReturn: 1.73, leverageEffect: -1.35 },
    { period: "6 Month", totalReturn: 7.2, navReturn: 5.8, premiumDiscountEffect: 0.5, distributionReturn: 3.45, leverageEffect: -2.55 },
    { period: "1 Year", totalReturn: 13.8, navReturn: 10.6, premiumDiscountEffect: 1.0, distributionReturn: 6.9, leverageEffect: -4.7 },
    { period: "2 Year", totalReturn: 24.2, navReturn: 18.4, premiumDiscountEffect: 1.8, distributionReturn: 13.8, leverageEffect: -9.8 },
  ],
  slippageTiers: makeSlippageTiers(0.9),
  selectedProxyIndex: 0,
  navHistory: generateNavHistory(13.88, 13.12, 0.009),
}

// Compact builder for remaining 7 funds
function buildCEF(
  overview: CEFOverview,
  sectorWeights: [string, number, string][],
  factorList: [string, number, number, "high" | "medium" | "low"][],
  baskets: [string, string[], number[], number, number, number, string][],
  hedgeOverrides: { hedgeRatio: number; maxDD: number; te: number; sharpe: number; basis: number; seed: number; drift: number; vol: number },
  costBps: number[],
  leverage: { detected: boolean; ratio: number; instruments: { type: string; notional: number; description: string }[]; unexplained: number; detectionConf: number; notes: string },
  conf: number,
  caveats: string[],
): CEFProfile {
  const holdings: Holding[] = []
  // Generate 15 placeholder holdings distributed across sectors
  const sectorNames = sectorWeights.map(s => s[0])
  for (let i = 0; i < 15; i++) {
    const si = i % sectorNames.length
    const w = parseFloat((8 - i * 0.4).toFixed(1))
    if (w <= 0) break
    holdings.push({
      name: `${overview.ticker} Holding ${i + 1}`,
      ticker: `${overview.ticker}-${i + 1}`,
      sector: sectorNames[si],
      weight: w,
      marketValue: Math.round(overview.aum * 1e9 * w / 100),
      country: "US",
    })
  }
  const sectors: SectorExposure[] = sectorWeights.map(([sector, weight, color]) => ({ sector, weight, color }))
  const factors: FactorExposure[] = factorList.map(([factor, exposure, tStat, significance]) => ({ factor, exposure, tStat, significance }))
  const proxyBaskets: ProxyBasket[] = baskets.map(([name, tickers, weights, correlation, trackingError, annualizedCost, rationale]) => ({ name, tickers, weights, correlation, trackingError, annualizedCost, rationale }))
  const corrRegimes: CorrelationRegime[] = baskets.map(([name, , , corr90d]) => ({
    basket: name,
    corr90d,
    corr180d: parseFloat((corr90d - 0.012).toFixed(3)),
    delta: -0.012,
    stressCorr: parseFloat((corr90d - 0.04).toFixed(3)),
    regimeStable: corr90d > 0.94,
  }))
  const retDecomp: ReturnDecomposition[] = [
    { period: "3 Month", totalReturn: overview.distributionRate / 4 * 0.9, navReturn: overview.distributionRate / 4 * 0.55, premiumDiscountEffect: overview.premiumDiscount * 0.05, distributionReturn: overview.distributionRate / 4, leverageEffect: -overview.leverageRatio * 0.04 },
    { period: "6 Month", totalReturn: overview.distributionRate / 2 * 0.9, navReturn: overview.distributionRate / 2 * 0.55, premiumDiscountEffect: overview.premiumDiscount * 0.1, distributionReturn: overview.distributionRate / 2, leverageEffect: -overview.leverageRatio * 0.08 },
    { period: "1 Year", totalReturn: overview.distributionRate * 0.9, navReturn: overview.distributionRate * 0.55, premiumDiscountEffect: overview.premiumDiscount * 0.18, distributionReturn: overview.distributionRate, leverageEffect: -overview.leverageRatio * 0.15 },
    { period: "2 Year", totalReturn: overview.distributionRate * 1.7, navReturn: overview.distributionRate * 1.0, premiumDiscountEffect: overview.premiumDiscount * 0.3, distributionReturn: overview.distributionRate * 2, leverageEffect: -overview.leverageRatio * 0.32 },
  ]
  const costComponents: CostComponent[] = [
    { component: "Bid-Ask Spread (ETF leg)", bps: costBps[0], dollarCost: costBps[0] * 50000000 / 10000, notes: "Weighted avg across proxy ETFs" },
    { component: "Bid-Ask Spread (CEF leg)", bps: costBps[1], dollarCost: costBps[1] * 50000000 / 10000, notes: `${overview.ticker} spread estimate` },
    { component: "Market Impact (entry)", bps: costBps[2], dollarCost: costBps[2] * 50000000 / 10000, notes: "$50M notional" },
    { component: "Short Borrow Cost (annual)", bps: costBps[3], dollarCost: costBps[3] * 50000000 / 10000, notes: "Borrow rate estimate" },
    { component: "Rebalance Cost (quarterly)", bps: costBps[4], dollarCost: costBps[4] * 50000000 / 10000, notes: "Quarterly drift adjustment" },
    { component: "Total Year-1 Estimated", bps: costBps[5], dollarCost: costBps[5] * 50000000 / 10000, notes: "All-in first year" },
  ]
  return {
    overview,
    holdings,
    sectors,
    factors,
    proxyBaskets,
    hedgeSimulation: {
      notional: 50000000,
      hedgeRatio: hedgeOverrides.hedgeRatio,
      dailyPnl: generateHedgePnl(hedgeOverrides.seed, hedgeOverrides.drift, hedgeOverrides.vol),
      maxDrawdown: hedgeOverrides.maxDD,
      realizedTrackingError: hedgeOverrides.te,
      sharpeRatio: hedgeOverrides.sharpe,
      basisRisk: hedgeOverrides.basis,
      scenarios: [
        { scenario: "Distribution Cut (50%)", pnlImpact: Math.round(-overview.aum * 1e6 * 0.8), probability: overview.leverageRatio > 20 ? "Medium (10-15%)" : "Low (3-5%)", description: "Premium/discount shift on distribution policy change" },
        { scenario: "Sector -10% Shock", pnlImpact: Math.round(-overview.aum * 1e6 * 0.35), probability: "Medium (15-20%)", description: "Sector-wide drawdown with tracking divergence" },
        { scenario: "30-Day Liquidity Stress", pnlImpact: Math.round(-overview.aum * 1e6 * 1.2), probability: "Low (5%)", description: "Bid-ask widening and forced rebalance" },
      ],
    },
    costs: costComponents,
    leverageProbe: {
      leverageDetected: leverage.detected,
      estimatedLeverage: leverage.ratio,
      instruments: leverage.instruments,
      unexplainedReturn: leverage.unexplained,
      confidenceInDetection: leverage.detectionConf,
      notes: leverage.notes,
    },
    confidence: conf,
    caveats,
    correlationRegimes: corrRegimes,
    returnDecomposition: retDecomp,
    slippageTiers: makeSlippageTiers(overview.aum > 2 ? 1.0 : 1.2),
    selectedProxyIndex: 0,
    navHistory: generateNavHistory(overview.navPerShare, overview.marketPrice, overview.leverageRatio > 25 ? 0.007 : 0.009),
  }
}

const ptyProfile = buildCEF(
  { ticker: "PTY", name: "PIMCO Corporate & Income Opportunity Fund", sponsor: "PIMCO", strategy: "Investment-grade and high-yield corporate bonds with leverage", aum: 3.2, navPerShare: 13.45, marketPrice: 14.62, premiumDiscount: 8.70, distributionRate: 9.8, leverageRatio: 35.6, expenseRatio: 2.85, inceptionDate: "2002-12-27", benchmark: "Bloomberg US Corporate High Yield Index" },
  [["Investment Grade Corp", 28.2, "#4a9eff"], ["High Yield Corp", 24.6, "#34d399"], ["Bank Loans", 15.4, "#fbbf24"], ["EM Debt", 12.8, "#f87171"], ["Structured Credit", 10.2, "#a78bfa"], ["Other", 8.8, "#64748b"]],
  [["Credit Spread", 0.92, 10.8, "high"], ["Duration", 0.58, 5.2, "high"], ["Leverage Factor", 0.72, 6.4, "high"], ["Dividend Yield", 0.85, 8.8, "high"], ["Value", 0.28, 2.2, "medium"], ["Momentum", -0.18, -1.5, "low"], ["EM Currency", 0.22, 1.8, "low"], ["Quality", -0.35, -2.8, "medium"]],
  [
    ["Corporate Bond Core", ["HYG", "LQD", "BKLN", "EMB", "JNK"], [0.25, 0.25, 0.20, 0.15, 0.15], 0.921, 2.62, 0.28, "Broad corporate bond exposure matching PTY credit tilt"],
    ["High Yield Focus", ["HYG", "JNK", "BKLN", "USHY"], [0.30, 0.25, 0.25, 0.20], 0.938, 2.28, 0.35, "Higher yield blend targeting PTY distribution and credit quality"],
    ["Leveraged Credit Proxy", ["HYG", "LQD", "BKLN", "EMB"], [0.30, 0.25, 0.25, 0.20], 0.932, 2.41, 0.30, "Balanced credit proxy with loan float for rate sensitivity"],
  ],
  { hedgeRatio: 0.80, maxDD: -4200000, te: 2.62, sharpe: -0.28, basis: 0.058, seed: 201, drift: -380, vol: 110000 },
  [4, 5, 8, 52, 5, 74],
  { detected: true, ratio: 35.6, instruments: [{ type: "Reverse Repos", notional: 750000000, description: "SOFR + 80bps" }, { type: "Total Return Swaps", notional: 380000000, description: "Credit index overlay" }], unexplained: 2.8, detectionConf: 74, notes: "Heavy leverage and derivative overlay create significant replication challenges. Premium at +8.7% adds entry risk." },
  52,
  ["35.6% leverage creates 1.5x beta amplification", "Premium at +8.7% is historically elevated", "Active derivative overlay not visible in holdings", "Distribution may include return of capital at current payout"],
)

const gofProfile = buildCEF(
  { ticker: "GOF", name: "Guggenheim Strategic Opportunities Fund", sponsor: "Guggenheim", strategy: "Multi-sector credit with options overlay", aum: 2.8, navPerShare: 14.22, marketPrice: 15.88, premiumDiscount: 11.67, distributionRate: 11.4, leverageRatio: 29.3, expenseRatio: 2.65, inceptionDate: "2007-07-26", benchmark: "Bloomberg US Aggregate Bond Index" },
  [["CLO/ABS", 22.8, "#4a9eff"], ["High Yield Corp", 21.4, "#34d399"], ["Bank Loans", 18.2, "#fbbf24"], ["Investment Grade", 14.6, "#f87171"], ["Agency MBS", 12.4, "#a78bfa"], ["Other", 10.6, "#64748b"]],
  [["Credit Spread", 0.88, 9.4, "high"], ["Leverage Factor", 0.65, 5.8, "high"], ["Dividend Yield", 0.90, 10.2, "high"], ["Duration", 0.42, 3.6, "medium"], ["Momentum", -0.28, -2.2, "medium"], ["Value", 0.18, 1.4, "low"], ["Volatility", 0.35, 2.8, "medium"], ["Quality", -0.42, -3.4, "high"]],
  [
    ["Multi-Credit Blend", ["HYG", "BKLN", "MBB", "LQD", "JNK"], [0.25, 0.25, 0.20, 0.15, 0.15], 0.908, 3.12, 0.32, "Broad credit spectrum; bank loans for CLO proxy"],
    ["Structured Credit Proxy", ["BKLN", "HYG", "MBB", "SRLN"], [0.30, 0.25, 0.25, 0.20], 0.918, 2.88, 0.38, "Overweight loans and structured to match GOF specialty"],
    ["Income Maximizer", ["HYG", "JNK", "BKLN", "EMB", "MBB"], [0.25, 0.20, 0.20, 0.20, 0.15], 0.924, 2.64, 0.34, "Highest yield match; accepts some tracking error for income"],
  ],
  { hedgeRatio: 0.82, maxDD: -5100000, te: 3.12, sharpe: -0.32, basis: 0.072, seed: 303, drift: -450, vol: 130000 },
  [5, 8, 10, 58, 6, 87],
  { detected: true, ratio: 29.3, instruments: [{ type: "Reverse Repos", notional: 520000000, description: "SOFR + 95bps" }, { type: "Credit Default Swaps", notional: 280000000, description: "Synthetic credit exposure" }, { type: "Options Overlay", notional: 180000000, description: "Volatility monetization" }], unexplained: 3.8, detectionConf: 62, notes: "Complex derivative book with CDS, options, and CLO equity makes replication very challenging. 11.7% premium is among highest in CEF universe." },
  48,
  ["11.7% premium creates extreme entry risk", "CLO equity positions are illiquid and opaque", "Options overlay creates non-linear payoffs", "Distribution likely includes significant return of capital", "Active CDS book alters credit exposure dynamically", "Leverage combined with structured credit amplifies tail risk"],
)

const eosProfile = buildCEF(
  { ticker: "EOS", name: "Eaton Vance Enhanced Equity Income Fund II", sponsor: "Eaton Vance (Morgan Stanley)", strategy: "Large cap equity with options overwriting", aum: 1.6, navPerShare: 19.74, marketPrice: 18.42, premiumDiscount: -6.69, distributionRate: 7.2, leverageRatio: 0, expenseRatio: 1.08, inceptionDate: "2004-12-28", benchmark: "S&P 500 Index" },
  [["Technology", 28.4, "#4a9eff"], ["Healthcare", 14.8, "#34d399"], ["Financials", 13.2, "#fbbf24"], ["Consumer Discretionary", 10.6, "#f87171"], ["Industrials", 9.8, "#a78bfa"], ["Other", 23.2, "#64748b"]],
  [["Market Beta", 0.82, 12.4, "high"], ["Dividend Yield", 0.45, 3.8, "medium"], ["Value", 0.22, 1.8, "low"], ["Quality", 0.65, 5.6, "high"], ["Momentum", 0.38, 3.2, "medium"], ["Volatility", -0.42, -3.6, "high"], ["Size", -0.12, -1.0, "low"], ["Options Overlay", -0.55, -4.8, "high"]],
  [
    ["S&P 500 + BuyWrite", ["SPY", "XYLD", "JEPI"], [0.40, 0.35, 0.25], 0.962, 1.28, 0.22, "Core equity exposure with covered call overlay matching EOS strategy"],
    ["Large Cap Income", ["SCHD", "XYLD", "SPY", "VIG"], [0.30, 0.25, 0.25, 0.20], 0.948, 1.52, 0.18, "Dividend growth + options income for yield matching"],
    ["Options Income Pure", ["XYLD", "JEPI", "QYLD", "SPY"], [0.30, 0.25, 0.25, 0.20], 0.955, 1.38, 0.28, "Maximum options income overlay; closest yield match"],
  ],
  { hedgeRatio: 0.96, maxDD: -1200000, te: 1.28, sharpe: -0.05, basis: 0.018, seed: 404, drift: -80, vol: 45000 },
  [2, 8, 4, 35, 3, 52],
  { detected: false, ratio: 0, instruments: [], unexplained: 0.4, detectionConf: 95, notes: "No leverage detected. Returns are well-explained by equity beta and options premium. Clean structure." },
  82,
  ["Options overlay caps upside in strong equity rallies", "Distribution includes options premium (non-dividend income)", "Overwrite ratio varies and is not publicly disclosed", "Discount to NAV may widen in low-volatility environments"],
)

const stkProfile = buildCEF(
  { ticker: "STK", name: "Columbia Seligman Premium Technology Growth Fund", sponsor: "Columbia Threadneedle", strategy: "Technology equity with options overwriting", aum: 0.8, navPerShare: 32.15, marketPrice: 30.88, premiumDiscount: -3.95, distributionRate: 8.5, leverageRatio: 0, expenseRatio: 1.15, inceptionDate: "2009-11-25", benchmark: "S&P North American Technology Sector Index" },
  [["Software", 32.2, "#4a9eff"], ["Semiconductors", 24.8, "#34d399"], ["Internet/Media", 18.4, "#fbbf24"], ["IT Services", 12.6, "#f87171"], ["Hardware", 8.2, "#a78bfa"], ["Other", 3.8, "#64748b"]],
  [["Market Beta", 1.12, 14.8, "high"], ["Momentum", 0.68, 5.8, "high"], ["Growth", 0.82, 7.4, "high"], ["Volatility", -0.38, -3.2, "medium"], ["Options Overlay", -0.48, -4.2, "high"], ["Quality", 0.52, 4.4, "high"], ["Size", -0.28, -2.2, "medium"], ["Value", -0.42, -3.5, "high"]],
  [
    ["Tech + BuyWrite", ["QQQ", "QYLD", "XLK"], [0.40, 0.35, 0.25], 0.958, 1.42, 0.28, "Nasdaq exposure with covered call overlay matching STK strategy"],
    ["Tech Sector Blend", ["XLK", "QYLD", "SMH", "IGV"], [0.30, 0.25, 0.25, 0.20], 0.948, 1.62, 0.24, "Sector ETF blend with semiconductor and software tilt"],
    ["Growth + Options", ["QQQ", "QYLD", "XLK", "SOXX"], [0.30, 0.25, 0.25, 0.20], 0.952, 1.52, 0.30, "Balanced growth and income; includes semis for factor match"],
  ],
  { hedgeRatio: 0.94, maxDD: -1800000, te: 1.42, sharpe: -0.10, basis: 0.024, seed: 505, drift: -120, vol: 65000 },
  [3, 12, 8, 42, 4, 69],
  { detected: false, ratio: 0, instruments: [], unexplained: 0.6, detectionConf: 94, notes: "No leverage. Returns explained by tech beta and options premium. Smaller AUM means wider CEF spreads." },
  78,
  ["Small AUM ($0.8B) means wider bid-ask and higher market impact", "Concentrated tech exposure amplifies sector drawdowns", "Options overlay ratio varies with implied vol levels", "May lag pure tech indices in strong rallies"],
)

const usaProfile = buildCEF(
  { ticker: "USA", name: "Liberty All-Star Equity Fund", sponsor: "ALPS Advisors", strategy: "Diversified equity with multi-manager approach", aum: 1.4, navPerShare: 7.12, marketPrice: 6.68, premiumDiscount: -6.18, distributionRate: 9.1, leverageRatio: 0, expenseRatio: 0.94, inceptionDate: "1986-10-31", benchmark: "S&P 500 Index" },
  [["Technology", 24.8, "#4a9eff"], ["Healthcare", 16.2, "#34d399"], ["Financials", 14.8, "#fbbf24"], ["Consumer Discretionary", 11.4, "#f87171"], ["Industrials", 10.2, "#a78bfa"], ["Other", 22.6, "#64748b"]],
  [["Market Beta", 0.98, 16.2, "high"], ["Value", 0.35, 2.8, "medium"], ["Quality", 0.48, 4.0, "medium"], ["Momentum", 0.28, 2.2, "medium"], ["Size", 0.12, 1.0, "low"], ["Dividend Yield", 0.42, 3.5, "medium"], ["Growth", 0.32, 2.6, "medium"], ["Volatility", -0.08, -0.7, "low"]],
  [
    ["Broad Market Core", ["SPY", "VTI", "SCHB"], [0.40, 0.35, 0.25], 0.982, 0.82, 0.08, "Nearly pure S&P 500 exposure; USA is essentially an actively managed index fund"],
    ["Blended Style", ["VTI", "SCHD", "VUG", "VTV"], [0.30, 0.25, 0.25, 0.20], 0.975, 0.95, 0.12, "Value + growth blend matching USA multi-manager style"],
    ["Active Manager Proxy", ["SPY", "MTUM", "QUAL", "VTI"], [0.30, 0.25, 0.25, 0.20], 0.978, 0.88, 0.14, "Factor exposure targeting USA manager selection alpha"],
  ],
  { hedgeRatio: 0.98, maxDD: -850000, te: 0.82, sharpe: 0.02, basis: 0.012, seed: 606, drift: -40, vol: 32000 },
  [1, 10, 4, 32, 2, 49],
  { detected: false, ratio: 0, instruments: [], unexplained: 0.2, detectionConf: 98, notes: "No leverage or derivatives. Highly transparent diversified equity. Best replication candidate in universe." },
  85,
  ["Distribution policy is fixed 10% of NAV (unique structure)", "Multi-manager approach adds tracking noise vs single benchmark", "Discount may persist due to structural CEF dynamics", "Low expense ratio makes cost comparison to ETFs favorable"],
)

const utgProfile = buildCEF(
  { ticker: "UTG", name: "Reaves Utility Income Fund", sponsor: "Reaves Asset Management", strategy: "Utility and telecom equity with moderate leverage", aum: 2.3, navPerShare: 30.85, marketPrice: 29.42, premiumDiscount: -4.63, distributionRate: 6.5, leverageRatio: 20.8, expenseRatio: 2.02, inceptionDate: "2004-02-24", benchmark: "S&P 500 Utilities Index" },
  [["Electric Utilities", 34.2, "#4a9eff"], ["Multi-Utilities", 18.6, "#34d399"], ["Telecom", 14.8, "#fbbf24"], ["Water Utilities", 8.4, "#f87171"], ["Gas Utilities", 7.2, "#a78bfa"], ["Other", 16.8, "#64748b"]],
  [["Dividend Yield", 0.85, 8.8, "high"], ["Interest Rate Sensitivity", -0.78, -7.2, "high"], ["Utility Beta", 0.92, 12.8, "high"], ["Value", 0.42, 3.4, "medium"], ["Quality", 0.55, 4.6, "high"], ["Momentum", 0.08, 0.7, "low"], ["Leverage Factor", 0.35, 2.8, "medium"], ["Volatility", -0.22, -1.8, "low"]],
  [
    ["Utility Core", ["XLU", "VPU", "IDU"], [0.40, 0.35, 0.25], 0.972, 1.12, 0.14, "Pure utility exposure; near-perfect tracking for UTG core holdings"],
    ["Utility + Telecom", ["XLU", "VPU", "VOX", "IYZ"], [0.30, 0.30, 0.20, 0.20], 0.958, 1.38, 0.22, "Adds telecom component matching UTG sector allocation"],
    ["Income Utility Blend", ["VPU", "FUTY", "XLU", "DVY"], [0.30, 0.25, 0.25, 0.20], 0.965, 1.24, 0.16, "Dividend income tilt; lower tracking error than telecom blend"],
  ],
  { hedgeRatio: 0.94, maxDD: -1400000, te: 1.12, sharpe: -0.06, basis: 0.020, seed: 707, drift: -90, vol: 48000 },
  [2, 8, 5, 38, 3, 56],
  { detected: true, ratio: 20.8, instruments: [{ type: "Reverse Repurchase Agreements", notional: 310000000, description: "Utility-collateralized repo at SOFR + 82bps" }, { type: "Credit Facility", notional: 168000000, description: "Committed bank revolving line" }], unexplained: 0.8, detectionConf: 90, notes: "Clean leverage through standard repo and credit facility. Reaves has consistent approach. Low unexplained return component." },
  74,
  ["Moderate leverage amplifies interest rate impact", "Concentrated utility sector limits diversification", "Water utility holdings are less liquid than electric", "Never cut distribution since inception (strong track record)"],
)

const dnpProfile = buildCEF(
  { ticker: "DNP", name: "DNP Select Income Fund", sponsor: "Duff & Phelps", strategy: "Utility and energy income with leverage", aum: 3.5, navPerShare: 9.18, marketPrice: 9.95, premiumDiscount: 8.39, distributionRate: 7.1, leverageRatio: 28.4, expenseRatio: 2.18, inceptionDate: "1987-01-21", benchmark: "S&P 500 Utilities Index" },
  [["Electric Utilities", 30.8, "#4a9eff"], ["Energy Infrastructure", 22.4, "#34d399"], ["Gas Utilities", 12.6, "#fbbf24"], ["Multi-Utilities", 11.8, "#f87171"], ["Telecom", 8.4, "#a78bfa"], ["Other", 14.0, "#64748b"]],
  [["Dividend Yield", 0.88, 9.2, "high"], ["Interest Rate Sensitivity", -0.72, -6.8, "high"], ["Energy Beta", 0.48, 4.0, "medium"], ["Utility Beta", 0.82, 8.4, "high"], ["Leverage Factor", 0.52, 4.4, "high"], ["Value", 0.38, 3.0, "medium"], ["Momentum", 0.14, 1.2, "low"], ["Quality", 0.32, 2.6, "medium"]],
  [
    ["Utility + Energy Blend", ["XLU", "EMLP", "VPU", "XLE"], [0.30, 0.25, 0.25, 0.20], 0.942, 1.72, 0.22, "Utility core with MLP/energy overlay matching DNP sector mix"],
    ["Income Infrastructure", ["VPU", "MLPA", "XLU", "AMLP"], [0.30, 0.25, 0.25, 0.20], 0.936, 1.88, 0.28, "Higher yield matching via MLP ETFs; accepts more tracking error"],
    ["Conservative Utility", ["XLU", "VPU", "FUTY", "IDU"], [0.35, 0.30, 0.20, 0.15], 0.952, 1.48, 0.14, "Pure utility; omits energy for lower tracking error"],
  ],
  { hedgeRatio: 0.88, maxDD: -2800000, te: 1.72, sharpe: -0.22, basis: 0.042, seed: 808, drift: -280, vol: 85000 },
  [3, 6, 7, 48, 5, 69],
  { detected: true, ratio: 28.4, instruments: [{ type: "Reverse Repurchase Agreements", notional: 640000000, description: "SOFR + 88bps" }, { type: "Credit Facility", notional: 352000000, description: "Multi-bank committed facility" }], unexplained: 1.5, detectionConf: 82, notes: "Standard leverage structure. Premium at +8.4% adds risk. Energy infrastructure allocation varies more actively than disclosed." },
  65,
  ["8.4% premium creates significant entry risk", "Energy MLP exposure subject to tax complications (K-1)", "28.4% leverage amplifies both utility and energy factor risks", "Distribution has been stable for decades but payout ratio elevated", "One of the oldest CEFs (1987); structural premium may persist"],
)

// ─── Universe Collection ─────────────────────────────────────────────────────

export const cefUniverse: CEFProfile[] = [
  utfProfile,
  pdiProfile,
  rqiProfile,
  ptyProfile,
  gofProfile,
  eosProfile,
  stkProfile,
  usaProfile,
  utgProfile,
  dnpProfile,
]

export const cefByTicker: Record<string, CEFProfile> = Object.fromEntries(
  cefUniverse.map(p => [p.overview.ticker, p])
)

export const TOP10_TICKERS = cefUniverse.map(p => p.overview.ticker)

// Alias for page-level consumption
export const allCEFProfiles = cefUniverse

// ─── Synthetic Hedge Fund Aggregation ─────────────────────────────────────────

export function computeWeights(
  profiles: CEFProfile[],
  rule: WeightingRule
): number[] {
  const n = profiles.length
  if (rule === "equal-risk") {
    // Equal 1/n
    return profiles.map(() => 1 / n)
  }
  if (rule === "aum-weighted") {
    const totalAum = profiles.reduce((s, p) => s + p.overview.aum, 0)
    return profiles.map(p => p.overview.aum / totalAum)
  }
  // risk-parity: weight inversely proportional to realized TE
  const teArr = profiles.map(p => {
    const basket = p.proxyBaskets[p.selectedProxyIndex]
    return basket ? basket.trackingError : 2.0
  })
  const invTE = teArr.map(te => 1 / Math.max(te, 0.5))
  const sum = invTE.reduce((a, b) => a + b, 0)
  return invTE.map(v => v / sum)
}

export function buildSyntheticFund(
  profiles: CEFProfile[],
  rule: WeightingRule,
  totalNotional: number = 500000000 // default $500M across 10 funds
): SyntheticHedgeFund {
  const weights = computeWeights(profiles, rule)

  const allocations = profiles.map((p, i) => {
    const basket = p.proxyBaskets[p.selectedProxyIndex]
    const notional = totalNotional * weights[i]
    // Scale slippage based on notional tier
    const tier = p.slippageTiers.find(t => notional >= t.notionalMin && notional < t.notionalMax)
    const slippageBps = tier ? tier.totalSlippage : 30
    return {
      ticker: p.overview.ticker,
      weight: weights[i],
      notional,
      proxyBasket: basket,
      hedgeRatio: p.hedgeSimulation.hedgeRatio,
      correlation: basket.correlation,
      trackingError: basket.trackingError,
      slippage: slippageBps,
      borrowCost: p.costs.find(c => c.component.includes("Borrow"))?.bps ?? 40,
      executionDays: notional > 50e6 ? 5 : notional > 25e6 ? 3 : 2,
    }
  })

  // Portfolio-level metrics
  const wCorr = allocations.reduce((s, a) => s + a.weight * a.correlation, 0)
  const wTE = Math.sqrt(allocations.reduce((s, a) => s + (a.weight * a.trackingError) ** 2, 0)) // simplified
  const avgTE = allocations.reduce((s, a) => s + a.weight * a.trackingError, 0)
  const diversificationRatio = avgTE / Math.max(wTE, 0.01)
  const aggMaxDD = allocations.reduce((s, a) => s + a.weight * (profiles.find(p => p.overview.ticker === a.ticker)?.hedgeSimulation.maxDrawdown ?? 0), 0)
  const totalBorrow = allocations.reduce((s, a) => s + a.borrowCost * a.notional / 10000, 0)
  const totalSlippage = allocations.reduce((s, a) => s + a.slippage * a.notional / 10000, 0)
  const netBeta = allocations.reduce((s, a, i) => s + a.weight * (1 - profiles[i].hedgeSimulation.hedgeRatio), 0)

  // Combined PnL (weighted sum of individual fund PnLs)
  const combinedPnl: { day: number; pnl: number; cumulative: number }[] = []
  const maxDays = 504
  for (let d = 0; d < maxDays; d++) {
    let dayPnl = 0
    profiles.forEach((p, i) => {
      const fundDay = p.hedgeSimulation.dailyPnl[d]
      if (fundDay) {
        dayPnl += fundDay.pnl * weights[i]
      }
    })
    const prev = d > 0 ? combinedPnl[d - 1].cumulative : 0
    combinedPnl.push({
      day: d + 1,
      pnl: parseFloat(dayPnl.toFixed(0)),
      cumulative: parseFloat((prev + dayPnl).toFixed(0)),
    })
  }

  // Cross-correlation matrix (simplified)
  const n = profiles.length
  const crossCorr: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { crossCorr[i][j] = 1.0; continue }
      // Funds in similar sectors have higher cross-correlation
      const si = profiles[i].sectors[0]?.sector ?? ""
      const sj = profiles[j].sectors[0]?.sector ?? ""
      const base = 0.35
      const sectorBonus = si === sj ? 0.3 : 0
      const leverageBonus = (profiles[i].overview.leverageRatio > 20 && profiles[j].overview.leverageRatio > 20) ? 0.1 : 0
      crossCorr[i][j] = parseFloat(Math.min(0.95, base + sectorBonus + leverageBonus + Math.random() * 0.15).toFixed(3))
      crossCorr[j][i] = crossCorr[i][j]
    }
  }

  // Aggregate factor concentration
  const factorMap = new Map<string, number>()
  profiles.forEach((p, i) => {
    p.factors.forEach(f => {
      const curr = factorMap.get(f.factor) ?? 0
      factorMap.set(f.factor, curr + f.exposure * weights[i])
    })
  })
  const factorConcentration = Array.from(factorMap.entries())
    .map(([factor, exposure]) => ({ factor, exposure: parseFloat(exposure.toFixed(3)) }))
    .sort((a, b) => Math.abs(b.exposure) - Math.abs(a.exposure))
    .slice(0, 10)

  return {
    name: `Synthetic CEF Hedge Fund (${rule.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())})`,
    totalNotional,
    weightingRule: rule,
    allocations,
    portfolioMetrics: {
      weightedCorrelation: parseFloat(wCorr.toFixed(4)),
      portfolioTrackingError: parseFloat(wTE.toFixed(2)),
      diversificationRatio: parseFloat(diversificationRatio.toFixed(2)),
      aggregateMaxDrawdown: parseFloat(aggMaxDD.toFixed(0)),
      totalBorrowCost: parseFloat(totalBorrow.toFixed(0)),
      totalSlippage: parseFloat(totalSlippage.toFixed(0)),
      expectedSharpe: -0.15,
      netBeta: parseFloat(netBeta.toFixed(4)),
    },
    combinedPnl,
    crossCorrelationMatrix: crossCorr,
    factorConcentration,
  }
}

// ─── Multi-CEF Hercules Prompt ──────────────────────────────────────────────

export const multiCefHerculesPrompt = `For each ticker in [UTF, PDI, RQI, PTY, GOF, EOS, STK, USA, UTG, DNP]:

1. Ingest holdings CSV (latest), 2-year daily NAV and market price, distribution history.
2. Compute USD-weighted sector/issuer exposures and factor attributions.
3. Decompose returns into NAV-driven vs market-driven components.
4. Search liquid ETF universe and produce top 3 proxy baskets (<=5 tickers each) optimized for NAV-return correlation (90d target) and tracking error <=2%; include 180d stress correlation.
5. Simulate $50M long CEF / short proxy: hedge ratio, daily P&L, max drawdown, realized tracking error, basis risk.
6. Output CSV (reconstructed holdings + proxy weights), JSON (exposures, correlations, hedge stats), and a 1-page advisor explainer.

After all 10 tickers, aggregate chosen proxies into a synthetic hedge fund using [weighting rule], and report:
- Portfolio-level weighted correlation, tracking error, diversification ratio
- Combined P&L simulation and aggregate max drawdown
- Cross-fund correlation matrix
- Net factor concentration across all 10 funds
- Execution plan with per-fund notional allocation, borrow checks, and tiered slippage

Weighting Rules Available:
- AUM-Weighted: Weight proportional to fund AUM
- Risk-Parity: Weight inversely proportional to proxy tracking error
- Equal Risk Contribution: Equal 1/N allocation

Target Total Notional: $500,000,000 ($50M per fund baseline)`
