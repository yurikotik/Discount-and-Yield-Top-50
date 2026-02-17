// ─── Top 10 CEF Universe Data Layer ─────────────────────────────────────────
// Clean analytics-only data for 10 closed-end funds.
// Includes Z-score/PSI ranking engine per user spec.

import {
  type Holding,
  type SectorExposure,
  type FactorExposure,
  type ReturnDecomposition,
  type NAVPricePoint,
  type DistributionRecord,
  type PerformanceMetrics,
  type RiskMetrics,
  type FundMetricVector,
  type ZScoreVector,
  type PSIResult,
  type FundRanking,
  type LeverageProbe,
  type DriftRegimeData,
  type DriftMetric,
  type RegimeShift,
  type LiquidityData,
  type HoldingLiquidity,
  type ConfidenceData,
  formatCurrency,
  formatPercent,
  formatBps,
} from "./utf-data"

export { formatCurrency, formatPercent, formatBps }
export type { FundRanking }

// ─── CEF Profile Types ──────────────────────────────────────────────────────

export interface CEFOverview {
  ticker: string
  name: string
  sponsor: string
  strategy: string
  aum: number           // in billions
  navPerShare: number
  marketPrice: number
  premiumDiscount: number
  distributionRate: number
  leverageRatio: number
  expenseRatio: number
  inceptionDate: string
  benchmark: string
  category: "infrastructure" | "fixed-income" | "reit" | "equity" | "multi-asset"
}

export interface CEFProfile {
  overview: CEFOverview
  holdings: Holding[]
  sectors: SectorExposure[]
  factors: FactorExposure[]
  returnDecomposition: ReturnDecomposition[]
  navHistory: NAVPricePoint[]
  distributions: DistributionRecord[]
  performance: PerformanceMetrics
  risk: RiskMetrics
  caveats: string[]
  leverageProbe: LeverageProbe
  driftRegime: DriftRegimeData
  liquidity: LiquidityData
  confidence: ConfidenceData
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function generateNavHistory(
  baseNav: number,
  basePrice: number,
  volatility: number,
  months: number = 24
): NAVPricePoint[] {
  const history: NAVPricePoint[] = []
  let nav = baseNav * 0.85
  let price = basePrice * 0.84
  const startDate = new Date(2024, 1, 1)
  for (let i = 0; i < months; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i)
    const drift = 0.008
    nav *= 1 + drift + (Math.sin(i * 0.5) * volatility) + (i % 3 === 0 ? volatility * 0.5 : 0)
    price *= 1 + drift + (Math.sin(i * 0.5 + 0.3) * volatility * 1.2) + (i % 4 === 0 ? -volatility * 0.3 : 0)
    history.push({
      date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      nav: parseFloat(nav.toFixed(2)),
      price: parseFloat(price.toFixed(2)),
    })
  }
  return history
}

function generateDistributions(rate: number, price: number, months: number = 24): DistributionRecord[] {
  const monthly = (rate / 100 * price) / 12
  const records: DistributionRecord[] = []
  const start = new Date(2024, 1, 1)
  for (let i = 0; i < months; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    const variation = 1 + (Math.sin(i * 0.3) * 0.05)
    records.push({
      date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      amount: parseFloat((monthly * variation).toFixed(4)),
      type: i % 6 === 0 ? "roc" : i % 12 === 0 ? "capital-gain" : "income",
      frequency: "monthly",
    })
  }
  return records
}

// ─── X-Ray Data Generators ─────────────────────────────────────────────────

function generateLeverageProbe(leverageRatio: number, leverageType: string): LeverageProbe {
  const hasDerivatives = leverageType.includes("TRS") || leverageType.includes("swap") || leverageType.includes("CDS") || leverageType.includes("option")
  const baseResidual = leverageRatio > 25 ? 0.8 + Math.random() * 1.2 : 0.2 + Math.random() * 0.6
  const residual = hasDerivatives ? baseResidual * 1.4 : baseResidual
  const flagged = residual > 1.0

  const instruments: string[] = []
  if (leverageType.includes("TRS")) instruments.push("Total Return Swaps")
  if (leverageType.includes("swap")) instruments.push("Interest Rate Swaps")
  if (leverageType.includes("CDS")) instruments.push("Credit Default Swaps")
  if (leverageType.includes("option")) instruments.push("Options Overlay")
  if (leverageType.includes("repos") || leverageType.includes("Reverse")) instruments.push("Reverse Repos")
  if (leverageType.includes("facility")) instruments.push("Credit Facility")
  if (instruments.length === 0) instruments.push("None detected")

  const impliedNotional = hasDerivatives ? Math.round(leverageRatio * 8 + Math.random() * 100) : 0

  return {
    realizedVsReconstructed: parseFloat(residual.toFixed(2)),
    residualFlagged: flagged,
    impliedNotional,
    likelyInstruments: instruments,
    returnResiduals: [
      { period: "30d", residual: parseFloat((residual * 0.3).toFixed(2)) },
      { period: "90d", residual: parseFloat((residual * 0.7).toFixed(2)) },
      { period: "1Y", residual: parseFloat(residual.toFixed(2)) },
      { period: "2Y", residual: parseFloat((residual * 1.8).toFixed(2)) },
    ],
  }
}

function generateDriftRegime(navHistory: NAVPricePoint[], factors: FactorExposure[]): DriftRegimeData {
  const driftTimeSeries: DriftMetric[] = navHistory.map((h, i) => {
    const base30 = 0.02 + Math.sin(i * 0.4) * 0.015 + Math.random() * 0.01
    const base90 = 0.015 + Math.sin(i * 0.2) * 0.01 + Math.random() * 0.008
    return {
      date: h.date,
      rolling30d: parseFloat(base30.toFixed(4)),
      rolling90d: parseFloat(base90.toFixed(4)),
    }
  })

  const shiftFactors = factors.filter(f => f.significance === "high").slice(0, 3)
  const regimeShifts: RegimeShift[] = [
    { date: navHistory[Math.floor(navHistory.length * 0.3)]?.date || "Jun 24", factor: shiftFactors[0]?.factor || "Market Beta", direction: "increase", magnitude: 0.18, significance: "minor" },
    { date: navHistory[Math.floor(navHistory.length * 0.7)]?.date || "Sep 25", factor: shiftFactors[1]?.factor || "Duration", direction: "decrease", magnitude: 0.32, significance: "major" },
  ]

  const maxDrift = Math.max(...driftTimeSeries.map(d => d.rolling30d))
  const currentRegime: DriftRegimeData["currentRegime"] = maxDrift > 0.04 ? "volatile" : maxDrift > 0.025 ? "transitioning" : "stable"

  return { driftTimeSeries, regimeShifts, currentRegime, changePointCount: regimeShifts.length }
}

function generateLiquidityData(holdings: Holding[], aum: number): LiquidityData {
  const holdingLiquidity: HoldingLiquidity[] = holdings.map(h => {
    const isLargeCap = h.marketValue > 100000000
    const advProxy = isLargeCap ? 50 + Math.random() * 200 : 5 + Math.random() * 40
    const marketCap = h.marketValue / (h.weight / 100) / 1e9 * (3 + Math.random() * 10)
    const score = Math.min(100, Math.round(Math.log10(advProxy + 1) * 30 + (marketCap > 10 ? 20 : marketCap > 1 ? 10 : 0)))
    const daysToLiq = Math.max(1, Math.round(h.marketValue / (advProxy * 1e6 * 0.2)))
    return {
      ticker: h.ticker,
      name: h.name,
      weight: h.weight,
      advProxy: parseFloat(advProxy.toFixed(1)),
      marketCap: parseFloat(marketCap.toFixed(1)),
      liquidityScore: score,
      daysToLiquidate: daysToLiq,
    }
  })

  const weightedScore = holdingLiquidity.reduce((s, h) => s + h.liquidityScore * h.weight, 0) / Math.max(1, holdingLiquidity.reduce((s, h) => s + h.weight, 0))
  const illiquidHoldings = holdingLiquidity.filter(h => h.liquidityScore < 40)
  const illiquidPct = illiquidHoldings.reduce((s, h) => s + h.weight, 0)

  return {
    holdings: holdingLiquidity,
    overallIndex: Math.round(weightedScore),
    illiquidPct: parseFloat(illiquidPct.toFixed(1)),
    largeIlliquidPositions: illiquidHoldings.filter(h => h.weight > 1.5).map(h => h.ticker),
  }
}

function generateConfidence(profile: {
  leverageRatio: number
  leverageType: string
  distributionRate: number
  navReturn1Y: number
  expenseRatio: number
  caveats: string[]
}): ConfidenceData {
  const { leverageRatio, leverageType, distributionRate, navReturn1Y, expenseRatio, caveats } = profile

  // Quality deductions
  let quality = 85
  if (leverageRatio > 30) quality -= 10
  if (leverageType.includes("TRS") || leverageType.includes("swap")) quality -= 8
  if (distributionRate > 10) quality -= 5
  if (caveats.length > 3) quality -= 3
  quality = Math.max(20, Math.min(100, quality + Math.round(Math.random() * 6 - 3)))

  const holdingsAge = 45 + Math.round(Math.random() * 30) // 45-75 days
  const dataCompleteness = leverageType.includes("None") ? 92 : 75 + Math.round(Math.random() * 15)
  const swapRisk: ConfidenceData["swapDisclosureRisk"] = leverageType.includes("TRS") || leverageType.includes("swap") ? "high" : leverageRatio > 20 ? "medium" : "low"

  // Distribution sustainability
  const coverageRatio = navReturn1Y > 0 ? navReturn1Y / distributionRate : 0
  let distScore = Math.round(coverageRatio * 80)
  if (distScore > 100) distScore = 100
  if (distScore < 0) distScore = 0
  if (distributionRate > navReturn1Y * 1.5) distScore = Math.min(distScore, 35)

  const redFlags: string[] = []
  if (coverageRatio < 0.7) redFlags.push("Distribution exceeds NAV income by >30%")
  if (distributionRate > 10) redFlags.push("Elevated distribution rate may include ROC")
  if (expenseRatio > 2.5) redFlags.push("High expense ratio erodes net income coverage")
  if (leverageRatio > 30) redFlags.push("Heavy leverage amplifies distribution risk in rate rises")

  return {
    qualityScore: quality,
    invalidationConditions: [
      `Holdings data is ${holdingsAge} days stale`,
      ...(swapRisk !== "low" ? ["Undisclosed swap/derivative positions possible"] : []),
      "Rapid intraday trading not captured in monthly snapshots",
      "FX hedging positions not visible in equity holdings",
    ],
    holdingsAge,
    dataCompleteness,
    swapDisclosureRisk: swapRisk,
    distributionScore: distScore,
    distributionRedFlags: redFlags,
  }
}

// ─── Fund Profiles ──────────────────────────────────────────────────────────

const utfProfile: CEFProfile = {
  overview: { ticker: "UTF", name: "Cohen & Steers Infrastructure Fund", sponsor: "Cohen & Steers", strategy: "Global listed infrastructure with leverage", aum: 3.0, navPerShare: 26.42, marketPrice: 24.89, premiumDiscount: -5.79, distributionRate: 7.8, leverageRatio: 22.4, expenseRatio: 2.16, inceptionDate: "Mar 2004", benchmark: "S&P Global Infrastructure Index", category: "infrastructure" },
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
  returnDecomposition: [
    { period: "3 Month", totalReturn: 4.2, navReturn: 3.1, premiumDiscountEffect: 0.4, distributionReturn: 1.95, leverageEffect: -1.25 },
    { period: "6 Month", totalReturn: 8.8, navReturn: 6.5, premiumDiscountEffect: 0.8, distributionReturn: 3.9, leverageEffect: -2.4 },
    { period: "1 Year", totalReturn: 15.6, navReturn: 11.2, premiumDiscountEffect: 1.2, distributionReturn: 7.8, leverageEffect: -4.6 },
    { period: "2 Year", totalReturn: 28.4, navReturn: 20.8, premiumDiscountEffect: 2.1, distributionReturn: 15.6, leverageEffect: -10.1 },
  ],
  navHistory: generateNavHistory(26.42, 24.89, 0.02),
  distributions: generateDistributions(7.8, 24.89),
  performance: { return1Y: 15.6, return3Y: 8.2, return5Y: 7.8, returnYTD: 4.2, navReturn1Y: 11.2, priceReturn1Y: 15.6, volatility1Y: 14.8, sharpeRatio: 0.72, maxDrawdown1Y: -8.4, beta: 0.78 },
  risk: { leverageRatio: 22.4, leverageType: "Reverse repos + credit facility", leverageCost: "SOFR + 85bps", expenseRatio: 2.16, managementFee: 1.0, premiumDiscountCurrent: -5.79, premiumDiscount1YAvg: -3.8, premiumDiscountPercentile: 22, volatility90d: 12.6, volatility1Y: 14.8, drawdownFromPeak: -5.2, zScoreDiscount: -1.24 },
  caveats: ["Holdings disclosure lags ~60 days", "Reverse repo financing rates may shift with SOFR", "Active management alpha not captured by static analysis", "International holdings subject to undisclosed FX hedging"],
  leverageProbe: null as unknown as LeverageProbe,
  driftRegime: null as unknown as DriftRegimeData,
  liquidity: null as unknown as LiquidityData,
  confidence: null as unknown as ConfidenceData,
}

const pdiProfile: CEFProfile = {
  overview: { ticker: "PDI", name: "PIMCO Dynamic Income Fund", sponsor: "PIMCO", strategy: "Multi-sector fixed income with aggressive leverage", aum: 4.8, navPerShare: 18.92, marketPrice: 19.84, premiumDiscount: 4.86, distributionRate: 12.1, leverageRatio: 38.2, expenseRatio: 3.42, inceptionDate: "May 2012", benchmark: "Bloomberg US Aggregate Bond Index", category: "fixed-income" },
  holdings: [
    { name: "US Treasury 2.875% 2032", ticker: "UST", sector: "Government", weight: 8.2, marketValue: 393600000, country: "US" },
    { name: "FNMA 30Y 4.0%", ticker: "FNMA", sector: "Agency MBS", weight: 7.1, marketValue: 340800000, country: "US" },
    { name: "GNMA 30Y 3.5%", ticker: "GNMA", sector: "Agency MBS", weight: 5.8, marketValue: 278400000, country: "US" },
    { name: "JPMorgan Chase 5.25% 2030", ticker: "JPM", sector: "Investment Grade", weight: 3.4, marketValue: 163200000, country: "US" },
    { name: "Brazil 6.0% 2033", ticker: "BRAZIL", sector: "EM Sovereign", weight: 3.1, marketValue: 148800000, country: "BR" },
    { name: "FHLMC 15Y 3.0%", ticker: "FHLMC", sector: "Agency MBS", weight: 2.9, marketValue: 139200000, country: "US" },
    { name: "Mexico 5.75% 2034", ticker: "MEXICO", sector: "EM Sovereign", weight: 2.7, marketValue: 129600000, country: "MX" },
    { name: "Goldman Sachs 4.75% 2029", ticker: "GS", sector: "Investment Grade", weight: 2.5, marketValue: 120000000, country: "US" },
    { name: "Ford Motor Credit 6.5% 2028", ticker: "F", sector: "High Yield", weight: 2.3, marketValue: 110400000, country: "US" },
    { name: "CLO Equity Tranche", ticker: "CLO-EQ", sector: "Structured Credit", weight: 2.1, marketValue: 100800000, country: "US" },
    { name: "T-Mobile 4.375% 2030", ticker: "TMUS", sector: "Investment Grade", weight: 1.9, marketValue: 91200000, country: "US" },
    { name: "Turkey 7.25% 2032", ticker: "TURKEY", sector: "EM Sovereign", weight: 1.8, marketValue: 86400000, country: "TR" },
    { name: "Carnival Corp 7.0% 2029", ticker: "CCL", sector: "High Yield", weight: 1.7, marketValue: 81600000, country: "US" },
    { name: "CMBS 2024-1 A1", ticker: "CMBS", sector: "CMBS", weight: 1.6, marketValue: 76800000, country: "US" },
    { name: "Indonesia 5.5% 2035", ticker: "INDO", sector: "EM Sovereign", weight: 1.5, marketValue: 72000000, country: "ID" },
  ],
  sectors: [
    { sector: "Agency MBS", weight: 28.4, color: "#4a9eff" },
    { sector: "EM Sovereign", weight: 18.2, color: "#34d399" },
    { sector: "Investment Grade", weight: 14.8, color: "#fbbf24" },
    { sector: "High Yield", weight: 12.6, color: "#f87171" },
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
  returnDecomposition: [
    { period: "3 Month", totalReturn: 3.8, navReturn: 2.4, premiumDiscountEffect: 0.8, distributionReturn: 3.0, leverageEffect: -2.4 },
    { period: "6 Month", totalReturn: 6.9, navReturn: 4.2, premiumDiscountEffect: 1.4, distributionReturn: 6.1, leverageEffect: -4.8 },
    { period: "1 Year", totalReturn: 11.8, navReturn: 7.6, premiumDiscountEffect: 2.2, distributionReturn: 12.1, leverageEffect: -10.1 },
    { period: "2 Year", totalReturn: 19.4, navReturn: 12.8, premiumDiscountEffect: 3.8, distributionReturn: 24.2, leverageEffect: -21.4 },
  ],
  navHistory: generateNavHistory(18.92, 19.84, 0.015),
  distributions: generateDistributions(12.1, 19.84),
  performance: { return1Y: 11.8, return3Y: 5.4, return5Y: 4.2, returnYTD: 3.8, navReturn1Y: 7.6, priceReturn1Y: 11.8, volatility1Y: 11.2, sharpeRatio: 0.48, maxDrawdown1Y: -6.8, beta: 0.52 },
  risk: { leverageRatio: 38.2, leverageType: "Reverse repos + TRS + interest rate swaps", leverageCost: "SOFR + 75bps", expenseRatio: 3.42, managementFee: 1.70, premiumDiscountCurrent: 4.86, premiumDiscount1YAvg: 3.2, premiumDiscountPercentile: 72, volatility90d: 9.8, volatility1Y: 11.2, drawdownFromPeak: -3.8, zScoreDiscount: 0.88 },
  caveats: ["38% leverage amplifies all risks ~1.6x", "CLO equity positions are illiquid and mark-to-model", "Premium (+4.9%) creates entry risk", "EM sovereign exposure subject to gap risk", "Distribution may include return of capital"],
  leverageProbe: null as unknown as LeverageProbe,
  driftRegime: null as unknown as DriftRegimeData,
  liquidity: null as unknown as LiquidityData,
  confidence: null as unknown as ConfidenceData,
}

const rqiProfile: CEFProfile = {
  overview: { ticker: "RQI", name: "Cohen & Steers Quality Income Realty Fund", sponsor: "Cohen & Steers", strategy: "US REIT income with moderate leverage", aum: 2.1, navPerShare: 13.88, marketPrice: 13.12, premiumDiscount: -5.47, distributionRate: 6.9, leverageRatio: 25.1, expenseRatio: 1.92, inceptionDate: "Feb 2002", benchmark: "FTSE Nareit All Equity REITs Index", category: "reit" },
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
  returnDecomposition: [
    { period: "3 Month", totalReturn: 3.8, navReturn: 3.2, premiumDiscountEffect: 0.2, distributionReturn: 1.73, leverageEffect: -1.35 },
    { period: "6 Month", totalReturn: 7.2, navReturn: 5.8, premiumDiscountEffect: 0.5, distributionReturn: 3.45, leverageEffect: -2.55 },
    { period: "1 Year", totalReturn: 13.8, navReturn: 10.6, premiumDiscountEffect: 1.0, distributionReturn: 6.9, leverageEffect: -4.7 },
    { period: "2 Year", totalReturn: 24.2, navReturn: 18.4, premiumDiscountEffect: 1.8, distributionReturn: 13.8, leverageEffect: -9.8 },
  ],
  navHistory: generateNavHistory(13.88, 13.12, 0.022),
  distributions: generateDistributions(6.9, 13.12),
  performance: { return1Y: 13.8, return3Y: 7.1, return5Y: 6.4, returnYTD: 3.8, navReturn1Y: 10.6, priceReturn1Y: 13.8, volatility1Y: 16.2, sharpeRatio: 0.62, maxDrawdown1Y: -9.2, beta: 0.85 },
  risk: { leverageRatio: 25.1, leverageType: "Reverse repos + credit facility", leverageCost: "SOFR + 90bps", expenseRatio: 1.92, managementFee: 0.90, premiumDiscountCurrent: -5.47, premiumDiscount1YAvg: -4.2, premiumDiscountPercentile: 28, volatility90d: 14.8, volatility1Y: 16.2, drawdownFromPeak: -6.8, zScoreDiscount: -0.92 },
  caveats: ["Leverage amplifies rate sensitivity", "REIT NAV estimates lag actual values", "Concentration in data center/specialty REITs"],
  leverageProbe: null as unknown as LeverageProbe,
  driftRegime: null as unknown as DriftRegimeData,
  liquidity: null as unknown as LiquidityData,
  confidence: null as unknown as ConfidenceData,
}

// ─── Builder for remaining 7 funds ──────────────────────────────────────────

interface FundSeed {
  overview: CEFOverview
  sectorWeights: [string, number, string][]
  factorList: [string, number, number, "high" | "medium" | "low"][]
  perf: PerformanceMetrics
  riskData: RiskMetrics
  caveats: string[]
  holdingNames?: [string, string, string, number, number, string][] // name, ticker, sector, weight, mv, country
}

function buildCEF(seed: FundSeed): CEFProfile {
  const { overview } = seed
  const holdings: Holding[] = seed.holdingNames
    ? seed.holdingNames.map(([name, ticker, sector, weight, mv, country]) => ({ name, ticker, sector, weight, marketValue: mv, country }))
    : seed.sectorWeights.flatMap(([sector], si) =>
        Array.from({ length: 2 }, (_, i) => ({
          name: `${overview.ticker} ${sector} Holding ${i + 1}`,
          ticker: `${overview.ticker}-${si * 2 + i + 1}`,
          sector,
          weight: parseFloat((7.5 - si * 1.2 - i * 0.5).toFixed(1)),
          marketValue: Math.round(overview.aum * 1e9 * (7.5 - si * 1.2 - i * 0.5) / 100),
          country: "US",
        }))
      ).filter(h => h.weight > 0).slice(0, 15)

  const sectors = seed.sectorWeights.map(([sector, weight, color]) => ({ sector, weight, color }))
  const factors = seed.factorList.map(([factor, exposure, tStat, significance]) => ({ factor, exposure, tStat, significance }))
  const dr = overview.distributionRate
  const lev = overview.leverageRatio
  const pd = overview.premiumDiscount
  const retDecomp: ReturnDecomposition[] = [
    { period: "3 Month", totalReturn: parseFloat((dr / 4 * 0.9).toFixed(1)), navReturn: parseFloat((dr / 4 * 0.55).toFixed(1)), premiumDiscountEffect: parseFloat((pd * 0.05).toFixed(1)), distributionReturn: parseFloat((dr / 4).toFixed(2)), leverageEffect: parseFloat((-lev * 0.04).toFixed(1)) },
    { period: "6 Month", totalReturn: parseFloat((dr / 2 * 0.9).toFixed(1)), navReturn: parseFloat((dr / 2 * 0.55).toFixed(1)), premiumDiscountEffect: parseFloat((pd * 0.1).toFixed(1)), distributionReturn: parseFloat((dr / 2).toFixed(2)), leverageEffect: parseFloat((-lev * 0.08).toFixed(1)) },
    { period: "1 Year", totalReturn: parseFloat((dr * 0.9).toFixed(1)), navReturn: parseFloat((dr * 0.55).toFixed(1)), premiumDiscountEffect: parseFloat((pd * 0.18).toFixed(1)), distributionReturn: parseFloat(dr.toFixed(2)), leverageEffect: parseFloat((-lev * 0.15).toFixed(1)) },
    { period: "2 Year", totalReturn: parseFloat((dr * 1.7).toFixed(1)), navReturn: parseFloat((dr * 1.0).toFixed(1)), premiumDiscountEffect: parseFloat((pd * 0.3).toFixed(1)), distributionReturn: parseFloat((dr * 2).toFixed(2)), leverageEffect: parseFloat((-lev * 0.32).toFixed(1)) },
  ]
  const navHist = generateNavHistory(overview.navPerShare, overview.marketPrice, lev > 25 ? 0.015 : 0.022)
  const result: CEFProfile = {
    overview,
    holdings,
    sectors,
    factors,
    returnDecomposition: retDecomp,
    navHistory: navHist,
    distributions: generateDistributions(dr, overview.marketPrice),
    performance: seed.perf,
    risk: seed.riskData,
    caveats: seed.caveats,
    leverageProbe: generateLeverageProbe(lev, seed.riskData.leverageType),
    driftRegime: generateDriftRegime(navHist, factors),
    liquidity: generateLiquidityData(holdings, overview.aum),
    confidence: generateConfidence({
      leverageRatio: lev,
      leverageType: seed.riskData.leverageType,
      distributionRate: dr,
      navReturn1Y: seed.perf.navReturn1Y,
      expenseRatio: overview.expenseRatio,
      caveats: seed.caveats,
    }),
  }
  return result
}

const ptyProfile = buildCEF({
  overview: { ticker: "PTY", name: "PIMCO Corporate & Income Opportunity Fund", sponsor: "PIMCO", strategy: "Investment-grade and high-yield corporate bonds with leverage", aum: 3.2, navPerShare: 13.45, marketPrice: 14.62, premiumDiscount: 8.70, distributionRate: 9.8, leverageRatio: 35.6, expenseRatio: 2.85, inceptionDate: "Dec 2002", benchmark: "Bloomberg US Corporate High Yield Index", category: "fixed-income" },
  sectorWeights: [["Investment Grade", 28.2, "#4a9eff"], ["High Yield", 24.6, "#34d399"], ["Bank Loans", 15.4, "#fbbf24"], ["EM Debt", 12.8, "#f87171"], ["Structured Credit", 10.2, "#a78bfa"], ["Other", 8.8, "#64748b"]],
  factorList: [["Credit Spread", 0.92, 10.8, "high"], ["Duration", 0.58, 5.2, "high"], ["Leverage Factor", 0.72, 6.4, "high"], ["Dividend Yield", 0.85, 8.8, "high"], ["Value", 0.28, 2.2, "medium"], ["Momentum", -0.18, -1.5, "low"], ["EM Currency", 0.22, 1.8, "low"], ["Quality", -0.35, -2.8, "medium"]],
  perf: { return1Y: 10.2, return3Y: 4.8, return5Y: 3.6, returnYTD: 2.8, navReturn1Y: 6.4, priceReturn1Y: 10.2, volatility1Y: 10.8, sharpeRatio: 0.42, maxDrawdown1Y: -7.2, beta: 0.45 },
  riskData: { leverageRatio: 35.6, leverageType: "Reverse repos + TRS + credit index swaps", leverageCost: "SOFR + 80bps", expenseRatio: 2.85, managementFee: 1.55, premiumDiscountCurrent: 8.70, premiumDiscount1YAvg: 6.5, premiumDiscountPercentile: 82, volatility90d: 9.2, volatility1Y: 10.8, drawdownFromPeak: -4.1, zScoreDiscount: 1.42 },
  caveats: ["35.6% leverage creates 1.5x beta amplification", "Premium at +8.7% is historically elevated", "Active derivative overlay not visible in holdings", "Distribution may include return of capital"],
})

const gofProfile = buildCEF({
  overview: { ticker: "GOF", name: "Guggenheim Strategic Opportunities Fund", sponsor: "Guggenheim", strategy: "Multi-sector credit with options overlay", aum: 2.8, navPerShare: 14.22, marketPrice: 15.88, premiumDiscount: 11.67, distributionRate: 11.4, leverageRatio: 29.3, expenseRatio: 2.65, inceptionDate: "Jul 2007", benchmark: "Bloomberg US Aggregate Bond Index", category: "multi-asset" },
  sectorWeights: [["CLO/ABS", 22.8, "#4a9eff"], ["High Yield", 21.4, "#34d399"], ["Bank Loans", 18.2, "#fbbf24"], ["Investment Grade", 14.6, "#f87171"], ["Agency MBS", 12.4, "#a78bfa"], ["Other", 10.6, "#64748b"]],
  factorList: [["Credit Spread", 0.88, 9.4, "high"], ["Leverage Factor", 0.65, 5.8, "high"], ["Dividend Yield", 0.90, 10.2, "high"], ["Duration", 0.42, 3.6, "medium"], ["Momentum", -0.28, -2.2, "medium"], ["Value", 0.18, 1.4, "low"], ["Volatility", 0.35, 2.8, "medium"], ["Quality", -0.42, -3.4, "high"]],
  perf: { return1Y: 9.8, return3Y: 4.2, return5Y: 3.8, returnYTD: 2.4, navReturn1Y: 5.8, priceReturn1Y: 9.8, volatility1Y: 12.4, sharpeRatio: 0.35, maxDrawdown1Y: -8.8, beta: 0.48 },
  riskData: { leverageRatio: 29.3, leverageType: "Reverse repos + CDS + options overlay", leverageCost: "SOFR + 95bps", expenseRatio: 2.65, managementFee: 1.40, premiumDiscountCurrent: 11.67, premiumDiscount1YAvg: 9.8, premiumDiscountPercentile: 88, volatility90d: 11.2, volatility1Y: 12.4, drawdownFromPeak: -5.4, zScoreDiscount: 1.85 },
  caveats: ["11.7% premium creates extreme entry risk", "CLO equity positions are illiquid and opaque", "Options overlay creates non-linear payoffs", "Distribution likely includes significant ROC"],
})

const eosProfile = buildCEF({
  overview: { ticker: "EOS", name: "Eaton Vance Enhanced Equity Income Fund II", sponsor: "Eaton Vance (Morgan Stanley)", strategy: "Large cap equity with options overwriting", aum: 1.6, navPerShare: 19.74, marketPrice: 18.42, premiumDiscount: -6.69, distributionRate: 7.2, leverageRatio: 0, expenseRatio: 1.08, inceptionDate: "Dec 2004", benchmark: "S&P 500 Index", category: "equity" },
  sectorWeights: [["Technology", 28.4, "#4a9eff"], ["Healthcare", 14.8, "#34d399"], ["Financials", 13.2, "#fbbf24"], ["Consumer Discretionary", 10.6, "#f87171"], ["Industrials", 9.8, "#a78bfa"], ["Other", 23.2, "#64748b"]],
  factorList: [["Market Beta", 0.82, 12.4, "high"], ["Dividend Yield", 0.45, 3.8, "medium"], ["Quality", 0.65, 5.6, "high"], ["Momentum", 0.38, 3.2, "medium"], ["Volatility", -0.42, -3.6, "high"], ["Options Overlay", -0.55, -4.8, "high"], ["Value", 0.22, 1.8, "low"], ["Size", -0.12, -1.0, "low"]],
  perf: { return1Y: 18.4, return3Y: 10.2, return5Y: 9.8, returnYTD: 5.2, navReturn1Y: 16.8, priceReturn1Y: 18.4, volatility1Y: 13.2, sharpeRatio: 0.98, maxDrawdown1Y: -7.2, beta: 0.82 },
  riskData: { leverageRatio: 0, leverageType: "None", leverageCost: "N/A", expenseRatio: 1.08, managementFee: 0.75, premiumDiscountCurrent: -6.69, premiumDiscount1YAvg: -5.8, premiumDiscountPercentile: 18, volatility90d: 12.4, volatility1Y: 13.2, drawdownFromPeak: -4.8, zScoreDiscount: -0.68 },
  caveats: ["Options overlay caps upside in strong rallies", "Distribution includes options premium (non-dividend)", "Overwrite ratio varies and is not publicly disclosed", "Discount may widen in low-volatility environments"],
})

const stkProfile = buildCEF({
  overview: { ticker: "STK", name: "Columbia Seligman Premium Technology Growth Fund", sponsor: "Columbia Threadneedle", strategy: "Technology equity with options overwriting", aum: 0.8, navPerShare: 32.15, marketPrice: 30.88, premiumDiscount: -3.95, distributionRate: 8.5, leverageRatio: 0, expenseRatio: 1.15, inceptionDate: "Nov 2009", benchmark: "S&P North American Technology Sector Index", category: "equity" },
  sectorWeights: [["Software", 32.2, "#4a9eff"], ["Semiconductors", 24.8, "#34d399"], ["Internet/Media", 18.4, "#fbbf24"], ["IT Services", 12.6, "#f87171"], ["Hardware", 8.2, "#a78bfa"], ["Other", 3.8, "#64748b"]],
  factorList: [["Market Beta", 1.12, 14.8, "high"], ["Momentum", 0.68, 5.8, "high"], ["Growth", 0.82, 7.4, "high"], ["Volatility", -0.38, -3.2, "medium"], ["Options Overlay", -0.48, -4.2, "high"], ["Quality", 0.52, 4.4, "high"], ["Size", -0.28, -2.2, "medium"], ["Value", -0.42, -3.5, "high"]],
  perf: { return1Y: 22.8, return3Y: 14.6, return5Y: 15.2, returnYTD: 6.8, navReturn1Y: 21.2, priceReturn1Y: 22.8, volatility1Y: 18.4, sharpeRatio: 0.92, maxDrawdown1Y: -12.4, beta: 1.12 },
  riskData: { leverageRatio: 0, leverageType: "None", leverageCost: "N/A", expenseRatio: 1.15, managementFee: 0.80, premiumDiscountCurrent: -3.95, premiumDiscount1YAvg: -2.8, premiumDiscountPercentile: 35, volatility90d: 16.8, volatility1Y: 18.4, drawdownFromPeak: -8.2, zScoreDiscount: -0.52 },
  caveats: ["Small AUM ($0.8B) means wider bid-ask", "Concentrated tech exposure amplifies sector drawdowns", "Options overlay ratio varies with implied vol", "May lag pure tech indices in strong rallies"],
})

const usaProfile = buildCEF({
  overview: { ticker: "USA", name: "Liberty All-Star Equity Fund", sponsor: "ALPS Advisors", strategy: "Diversified equity with multi-manager approach", aum: 1.4, navPerShare: 7.12, marketPrice: 6.68, premiumDiscount: -6.18, distributionRate: 9.1, leverageRatio: 0, expenseRatio: 0.94, inceptionDate: "Oct 1986", benchmark: "S&P 500 Index", category: "equity" },
  sectorWeights: [["Technology", 24.8, "#4a9eff"], ["Healthcare", 16.2, "#34d399"], ["Financials", 14.8, "#fbbf24"], ["Consumer Discretionary", 11.4, "#f87171"], ["Industrials", 10.2, "#a78bfa"], ["Other", 22.6, "#64748b"]],
  factorList: [["Market Beta", 0.98, 16.2, "high"], ["Value", 0.35, 2.8, "medium"], ["Quality", 0.48, 4.0, "medium"], ["Momentum", 0.28, 2.2, "medium"], ["Size", 0.12, 1.0, "low"], ["Dividend Yield", 0.42, 3.5, "medium"], ["Growth", 0.32, 2.6, "medium"], ["Volatility", -0.08, -0.7, "low"]],
  perf: { return1Y: 16.2, return3Y: 9.8, return5Y: 10.4, returnYTD: 4.8, navReturn1Y: 15.4, priceReturn1Y: 16.2, volatility1Y: 14.2, sharpeRatio: 0.82, maxDrawdown1Y: -8.8, beta: 0.98 },
  riskData: { leverageRatio: 0, leverageType: "None", leverageCost: "N/A", expenseRatio: 0.94, managementFee: 0.62, premiumDiscountCurrent: -6.18, premiumDiscount1YAvg: -5.2, premiumDiscountPercentile: 24, volatility90d: 13.2, volatility1Y: 14.2, drawdownFromPeak: -5.8, zScoreDiscount: -0.78 },
  caveats: ["Fixed 10% of NAV distribution policy (unique)", "Multi-manager approach adds tracking noise", "Discount may persist due to structural CEF dynamics", "Low expense ratio favorable vs ETF alternatives"],
})

const utgProfile = buildCEF({
  overview: { ticker: "UTG", name: "Reaves Utility Income Fund", sponsor: "Reaves Asset Management", strategy: "Utility and telecom equity with moderate leverage", aum: 2.3, navPerShare: 30.85, marketPrice: 29.42, premiumDiscount: -4.63, distributionRate: 6.5, leverageRatio: 20.8, expenseRatio: 2.02, inceptionDate: "Feb 2004", benchmark: "S&P 500 Utilities Index", category: "infrastructure" },
  sectorWeights: [["Electric Utilities", 34.2, "#4a9eff"], ["Multi-Utilities", 18.6, "#34d399"], ["Telecom", 14.8, "#fbbf24"], ["Water Utilities", 8.4, "#f87171"], ["Gas Utilities", 7.2, "#a78bfa"], ["Other", 16.8, "#64748b"]],
  factorList: [["Dividend Yield", 0.85, 8.8, "high"], ["Interest Rate Sensitivity", -0.78, -7.2, "high"], ["Utility Beta", 0.92, 12.8, "high"], ["Value", 0.42, 3.4, "medium"], ["Quality", 0.55, 4.6, "high"], ["Momentum", 0.08, 0.7, "low"], ["Leverage Factor", 0.35, 2.8, "medium"], ["Volatility", -0.22, -1.8, "low"]],
  perf: { return1Y: 12.4, return3Y: 6.8, return5Y: 7.2, returnYTD: 3.4, navReturn1Y: 9.6, priceReturn1Y: 12.4, volatility1Y: 13.8, sharpeRatio: 0.64, maxDrawdown1Y: -7.8, beta: 0.72 },
  riskData: { leverageRatio: 20.8, leverageType: "Reverse repos + credit facility", leverageCost: "SOFR + 82bps", expenseRatio: 2.02, managementFee: 0.85, premiumDiscountCurrent: -4.63, premiumDiscount1YAvg: -3.4, premiumDiscountPercentile: 30, volatility90d: 12.2, volatility1Y: 13.8, drawdownFromPeak: -5.4, zScoreDiscount: -0.82 },
  caveats: ["Moderate leverage amplifies rate sensitivity", "Concentrated utility sector limits diversification", "Water utility holdings are less liquid", "Never cut distribution since inception (strong track record)"],
})

const dnpProfile = buildCEF({
  overview: { ticker: "DNP", name: "DNP Select Income Fund", sponsor: "Duff & Phelps", strategy: "Utility and energy income with leverage", aum: 3.5, navPerShare: 9.18, marketPrice: 9.95, premiumDiscount: 8.39, distributionRate: 7.1, leverageRatio: 28.4, expenseRatio: 2.18, inceptionDate: "Jan 1987", benchmark: "S&P 500 Utilities Index", category: "infrastructure" },
  sectorWeights: [["Electric Utilities", 30.8, "#4a9eff"], ["Energy Infrastructure", 22.4, "#34d399"], ["Gas Utilities", 12.6, "#fbbf24"], ["Multi-Utilities", 11.8, "#f87171"], ["Telecom", 8.4, "#a78bfa"], ["Other", 14.0, "#64748b"]],
  factorList: [["Dividend Yield", 0.88, 9.2, "high"], ["Interest Rate Sensitivity", -0.72, -6.8, "high"], ["Energy Beta", 0.48, 4.0, "medium"], ["Utility Beta", 0.82, 8.4, "high"], ["Leverage Factor", 0.52, 4.4, "high"], ["Value", 0.38, 3.0, "medium"], ["Momentum", 0.14, 1.2, "low"], ["Quality", 0.32, 2.6, "medium"]],
  perf: { return1Y: 11.2, return3Y: 5.8, return5Y: 5.4, returnYTD: 3.1, navReturn1Y: 7.8, priceReturn1Y: 11.2, volatility1Y: 13.2, sharpeRatio: 0.52, maxDrawdown1Y: -8.2, beta: 0.68 },
  riskData: { leverageRatio: 28.4, leverageType: "Reverse repos + multi-bank facility", leverageCost: "SOFR + 88bps", expenseRatio: 2.18, managementFee: 0.95, premiumDiscountCurrent: 8.39, premiumDiscount1YAvg: 7.2, premiumDiscountPercentile: 78, volatility90d: 11.8, volatility1Y: 13.2, drawdownFromPeak: -4.8, zScoreDiscount: 1.18 },
  caveats: ["8.4% premium creates entry risk", "Energy MLP exposure has K-1 tax complications", "28.4% leverage amplifies utility and energy risks", "Distribution stable for decades but payout ratio elevated"],
})

// ─── Universe ───────────────────────────────────────────────────────────────

// Hydrate X-ray fields for manually built profiles (UTF, PDI, RQI)
for (const p of [utfProfile, pdiProfile, rqiProfile]) {
  if (!p.leverageProbe || (p.leverageProbe as unknown) === null) {
    p.leverageProbe = generateLeverageProbe(p.risk.leverageRatio, p.risk.leverageType)
  }
  if (!p.driftRegime || (p.driftRegime as unknown) === null) {
    p.driftRegime = generateDriftRegime(p.navHistory, p.factors)
  }
  if (!p.liquidity || (p.liquidity as unknown) === null) {
    p.liquidity = generateLiquidityData(p.holdings, p.overview.aum)
  }
  if (!p.confidence || (p.confidence as unknown) === null) {
    p.confidence = generateConfidence({
      leverageRatio: p.risk.leverageRatio,
      leverageType: p.risk.leverageType,
      distributionRate: p.overview.distributionRate,
      navReturn1Y: p.performance.navReturn1Y,
      expenseRatio: p.overview.expenseRatio,
      caveats: p.caveats,
    })
  }
}

export const cefUniverse: CEFProfile[] = [
  utfProfile, pdiProfile, rqiProfile, ptyProfile, gofProfile,
  eosProfile, stkProfile, usaProfile, utgProfile, dnpProfile,
]

export const cefByTicker: Record<string, CEFProfile> = Object.fromEntries(
  cefUniverse.map(p => [p.overview.ticker, p])
)

export const TOP10_TICKERS = cefUniverse.map(p => p.overview.ticker)

// ─── Z-Score / PSI Ranking Engine ───────────────────────────────────────────

function extractMetrics(p: CEFProfile): FundMetricVector {
  return {
    yield: p.overview.distributionRate,
    discount: -p.overview.premiumDiscount, // negative P/D is good (buying at discount)
    volatility: -p.performance.volatility1Y, // lower vol is better
    leverage: -p.overview.leverageRatio, // lower leverage is better
    navReturn1Y: p.performance.navReturn1Y,
    expenseRatio: -p.overview.expenseRatio, // lower cost is better
    drawdown: p.performance.maxDrawdown1Y, // less negative is better (already negative)
    aumLiquidity: Math.log10(p.overview.aum * 1e9), // log-scale AUM as liquidity proxy
  }
}

function computeZScores(profiles: CEFProfile[]): { zScores: ZScoreVector[]; metrics: FundMetricVector[] } {
  const metrics = profiles.map(extractMetrics)
  const keys = Object.keys(metrics[0]) as (keyof FundMetricVector)[]
  const means: Record<string, number> = {}
  const stds: Record<string, number> = {}

  for (const k of keys) {
    const vals = metrics.map(m => m[k])
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length
    means[k] = mean
    stds[k] = Math.sqrt(variance) || 1
  }

  // Weights for composite Z: yield and navReturn weighted higher
  const weights: Record<string, number> = {
    yield: 1.5,
    discount: 1.3,
    volatility: 0.8,
    leverage: 0.7,
    navReturn1Y: 1.4,
    expenseRatio: 0.6,
    drawdown: 0.9,
    aumLiquidity: 0.5,
  }

  const zScores: ZScoreVector[] = metrics.map(m => {
    const z: Record<string, number> = {}
    let weightedSum = 0
    let totalWeight = 0
    for (const k of keys) {
      z[k] = (m[k] - means[k]) / stds[k]
      weightedSum += z[k] * (weights[k] ?? 1)
      totalWeight += (weights[k] ?? 1)
    }
    return { ...z, composite: weightedSum / totalWeight } as ZScoreVector
  })

  return { zScores, metrics }
}

/**
 * Population Stability Index (PSI) - compare 90-day recent window vs prior 365-day baseline.
 * PSI < 0.1 = stable, 0.1-0.25 = shifting, > 0.25 = unstable
 * We approximate using NAV return volatility and premium/discount regime shift.
 */
function computePSI(profile: CEFProfile): PSIResult {
  const navHist = profile.navHistory
  if (navHist.length < 6) return { psi: 0, significantBins: 0, totalBins: 10, regime: "stable" }

  // Split into "baseline" (first 75%) and "recent" (last 25%)
  const splitIdx = Math.floor(navHist.length * 0.75)
  const baseline = navHist.slice(0, splitIdx)
  const recent = navHist.slice(splitIdx)

  // Compute NAV returns for each window
  const baseReturns = baseline.slice(1).map((v, i) => (v.nav - baseline[i].nav) / baseline[i].nav)
  const recentReturns = recent.slice(1).map((v, i) => (v.nav - recent[i].nav) / recent[i].nav)

  // Simple binned PSI: divide return range into bins, compare distributions
  const numBins = 10
  const allReturns = [...baseReturns, ...recentReturns]
  const minR = Math.min(...allReturns, -0.05)
  const maxR = Math.max(...allReturns, 0.05)
  const binWidth = (maxR - minR) / numBins

  let psi = 0
  let significantBins = 0
  for (let b = 0; b < numBins; b++) {
    const lo = minR + b * binWidth
    const hi = lo + binWidth
    const pBase = (baseReturns.filter(r => r >= lo && r < hi).length + 0.001) / baseReturns.length
    const pRecent = (recentReturns.filter(r => r >= lo && r < hi).length + 0.001) / recentReturns.length
    const binPsi = (pRecent - pBase) * Math.log(pRecent / pBase)
    psi += binPsi
    if (Math.abs(binPsi) > 0.02) significantBins++
  }

  psi = Math.abs(psi)
  const regime: PSIResult["regime"] = psi < 0.1 ? "stable" : psi < 0.25 ? "shifting" : "unstable"
  return { psi: parseFloat(psi.toFixed(4)), significantBins, totalBins: numBins, regime }
}

/**
 * Final ranking: Score_i = compositeZ_rank - lambda * PSI_rank
 * Higher score = better. Lambda controls penalty for regime instability.
 */
export function computeRankings(profiles: CEFProfile[], lambda: number = 0.3): FundRanking[] {
  const { zScores } = computeZScores(profiles)
  const psiResults = profiles.map(computePSI)

  // Rank by composite Z (higher is better)
  const zRanked = zScores
    .map((z, i) => ({ i, z: z.composite }))
    .sort((a, b) => b.z - a.z)
    .map((item, rank) => ({ ...item, zRank: rank + 1 }))

  // Rank by PSI (lower is better = more stable)
  const psiRanked = psiResults
    .map((p, i) => ({ i, psi: p.psi }))
    .sort((a, b) => a.psi - b.psi)
    .map((item, rank) => ({ ...item, psiRank: rank + 1 }))

  // Combine: Score = (N+1 - zRank) - lambda * psiRank
  const N = profiles.length
  const rankings: FundRanking[] = profiles.map((p, i) => {
    const zEntry = zRanked.find(e => e.i === i)!
    const psiEntry = psiRanked.find(e => e.i === i)!
    const finalScore = (N + 1 - zEntry.zRank) - lambda * psiEntry.psiRank
    return {
      ticker: p.overview.ticker,
      compositeZ: parseFloat(zScores[i].composite.toFixed(3)),
      psiScore: psiResults[i].psi,
      finalScore: parseFloat(finalScore.toFixed(2)),
      rank: 0, // will be set after sort
      zScores: zScores[i],
      psiResult: psiResults[i],
    }
  })

  rankings.sort((a, b) => b.finalScore - a.finalScore)
  rankings.forEach((r, i) => { r.rank = i + 1 })
  return rankings
}

// Pre-computed rankings for use in components
export const fundRankings = computeRankings(cefUniverse)
