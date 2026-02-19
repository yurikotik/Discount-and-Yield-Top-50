// ─── CEF Universe Data Layer ────────────────────────────────────────────────
// 50 closed-end funds from Barchart watchlist (2026-02-19 intraday).
// All tickers treated equally -- scoring engine determines rankings dynamically.
// No circular dependencies: all seeds defined inline.

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
  type PillarScores,
  PILLAR_WEIGHTS,
  PILLAR_LABELS,
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

export { formatCurrency, formatPercent, formatBps, PILLAR_WEIGHTS, PILLAR_LABELS }
export type { FundRanking, PillarScores, PerformanceMetrics, RiskMetrics }

// ─── CEF Profile Types ──────────────────────────────────────────────────────

export interface CEFOverview {
  ticker: string
  name: string
  sponsor: string
  strategy: string
  aum: number           // in billions
  adv: number           // avg daily volume in $ millions
  navPerShare: number
  marketPrice: number
  premiumDiscount: number
  distributionRate: number
  leverageRatio: number
  expenseRatio: number
  inceptionDate: string
  benchmark: string
  category: "infrastructure" | "fixed-income" | "reit" | "equity" | "multi-asset"
  return90d: number
  holdingsDate: string
  unii: number
  distributionCoverage: number
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

// ─── Data Generators ────────────────────────────────────────────────────────

function generateNavHistory(navNow: number, priceNow: number, vol: number): NAVPricePoint[] {
  const pts: NAVPricePoint[] = []
  const months = 24
  const start = new Date()
  start.setMonth(start.getMonth() - months)
  for (let i = 0; i <= months; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    const t = i / months
    const navDrift = 1 + (t - 0.5) * 0.1
    const navV = navNow * navDrift + Math.sin(i * 0.6) * navNow * vol
    const priceV = navV * (priceNow / navNow) + Math.sin(i * 0.4 + 1) * navNow * vol * 0.5
    pts.push({
      date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      nav: parseFloat(navV.toFixed(2)),
      marketPrice: parseFloat(priceV.toFixed(2)),
      premium: parseFloat(((priceV / navV - 1) * 100).toFixed(2)),
      volume: Math.round(500000 + Math.sin(i) * 200000),
    })
  }
  return pts
}

function generateDistributions(rate: number, price: number): DistributionRecord[] {
  const monthly = (rate / 100) * price / 12
  const records: DistributionRecord[] = []
  const start = new Date()
  start.setMonth(start.getMonth() - 24)
  const months = 24
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

// ─── Seeded PRNG ────────────────────────────────────────────────────────────
let _seed = 42
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647
  return (_seed - 1) / 2147483646
}

// ─── X-Ray Data Generators ─────────────────────────────────────────────────

function generateLeverageProbe(leverageRatio: number, leverageType: string): LeverageProbe {
  const hasDerivatives = leverageType.includes("TRS") || leverageType.includes("swap") || leverageType.includes("CDS") || leverageType.includes("option")
  const baseResidual = leverageRatio > 25 ? 0.8 + seededRandom() * 1.2 : 0.2 + seededRandom() * 0.6
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
  const impliedNotional = hasDerivatives ? Math.round(leverageRatio * 8 + seededRandom() * 100) : 0
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
    const base30 = 0.02 + Math.sin(i * 0.4) * 0.015 + seededRandom() * 0.01
    const base90 = 0.015 + Math.sin(i * 0.2) * 0.01 + seededRandom() * 0.008
    return { date: h.date, rolling30d: parseFloat(base30.toFixed(4)), rolling90d: parseFloat(base90.toFixed(4)) }
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
    const advProxy = isLargeCap ? 50 + seededRandom() * 200 : 5 + seededRandom() * 40
    const marketCap = h.marketValue / (h.weight / 100) / 1e9 * (3 + seededRandom() * 10)
    const score = Math.min(100, Math.round(Math.log10(advProxy + 1) * 30 + (marketCap > 10 ? 20 : marketCap > 1 ? 10 : 0)))
    const daysToLiq = Math.max(1, Math.round(h.marketValue / (advProxy * 1e6 * 0.2)))
    return { ticker: h.ticker, name: h.name, weight: h.weight, advProxy: parseFloat(advProxy.toFixed(1)), marketCap: parseFloat(marketCap.toFixed(1)), liquidityScore: score, daysToLiquidate: daysToLiq }
  })
  const weightedScore = holdingLiquidity.reduce((s, h) => s + h.liquidityScore * h.weight, 0) / Math.max(1, holdingLiquidity.reduce((s, h) => s + h.weight, 0))
  const illiquidHoldings = holdingLiquidity.filter(h => h.liquidityScore < 40)
  const illiquidPct = illiquidHoldings.reduce((s, h) => s + h.weight, 0)
  return { holdings: holdingLiquidity, overallIndex: Math.round(weightedScore), illiquidPct: parseFloat(illiquidPct.toFixed(1)), largeIlliquidPositions: illiquidHoldings.filter(h => h.weight > 1.5).map(h => h.ticker) }
}

function generateConfidence(profile: { leverageRatio: number; leverageType: string; distributionRate: number; navReturn1Y: number; expenseRatio: number; caveats: string[] }): ConfidenceData {
  const { leverageRatio, leverageType, distributionRate, navReturn1Y, expenseRatio, caveats } = profile
  let quality = 85
  if (leverageRatio > 30) quality -= 10
  if (leverageType.includes("TRS") || leverageType.includes("swap")) quality -= 8
  if (distributionRate > 10) quality -= 5
  if (caveats.length > 3) quality -= 3
  quality = Math.max(20, Math.min(100, quality + Math.round(seededRandom() * 6 - 3)))
  const holdingsAge = 45 + Math.round(seededRandom() * 30)
  const dataCompleteness = leverageType.includes("None") ? 92 : 75 + Math.round(seededRandom() * 15)
  const swapRisk: ConfidenceData["swapDisclosureRisk"] = leverageType.includes("TRS") || leverageType.includes("swap") ? "high" : leverageRatio > 20 ? "medium" : "low"
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
    invalidationConditions: [`Holdings data is ${holdingsAge} days stale`, ...(swapRisk !== "low" ? ["Undisclosed swap/derivative positions possible"] : []), "Rapid intraday trading not captured in monthly snapshots", "FX hedging positions not visible in equity holdings"],
    holdingsAge, dataCompleteness, swapDisclosureRisk: swapRisk, distributionScore: distScore, distributionRedFlags: redFlags,
  }
}

// ─── Fund Seed & Builder ────────────────────────────────────────────────────

interface FundSeed {
  overview: CEFOverview
  sectorWeights: [string, number, string][]
  factorList: [string, number, number, "high" | "medium" | "low"][]
  perf: PerformanceMetrics
  riskData: RiskMetrics
  caveats: string[]
}

function buildCEF(seed: FundSeed): CEFProfile {
  const { overview } = seed
  const holdings: Holding[] = seed.sectorWeights.flatMap(([sector], si) =>
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
  return {
    overview, holdings, sectors, factors,
    returnDecomposition: retDecomp,
    navHistory: navHist,
    distributions: generateDistributions(dr, overview.marketPrice),
    performance: seed.perf,
    risk: seed.riskData,
    caveats: seed.caveats,
    leverageProbe: generateLeverageProbe(lev, seed.riskData.leverageType),
    driftRegime: generateDriftRegime(navHist, factors),
    liquidity: generateLiquidityData(holdings, overview.aum),
    confidence: generateConfidence({ leverageRatio: lev, leverageType: seed.riskData.leverageType, distributionRate: dr, navReturn1Y: seed.perf.navReturn1Y, expenseRatio: overview.expenseRatio, caveats: seed.caveats }),
  }
}

// ─── Shorthand seed builder ─────────────────────────────────────────────────
// Keeps each seed compact: bc(ticker, name, price, vol, category, overrides)

type Cat = CEFOverview["category"]
interface SeedOpts {
  aum: number; dist: number; lev: number; pd: number
  ret1y: number; ret90d: number; vol1y: number
  unii: number; distCov: number
  strategy: string
  levType?: string
  sw?: [string, number, string][]
  fl?: [string, number, number, "high" | "medium" | "low"][]
}

// Factor templates by category
const eqFactors: FundSeed["factorList"] = [
  ["Market Beta", 0.92, 12.4, "high"], ["Dividend Yield", 0.48, 3.8, "medium"], ["Quality", 0.55, 4.6, "high"],
  ["Momentum", 0.32, 2.6, "medium"], ["Value", 0.28, 2.2, "medium"], ["Volatility", -0.18, -1.5, "low"],
  ["Size", -0.12, -1.0, "low"], ["Growth", 0.35, 2.8, "medium"],
]
const fiFactors: FundSeed["factorList"] = [
  ["Duration", 0.72, 7.8, "high"], ["Credit Spread", 0.88, 9.2, "high"], ["MBS Prepayment", 0.61, 5.4, "high"],
  ["EM Currency", 0.35, 3.1, "medium"], ["Carry", 0.68, 6.0, "high"], ["Volatility", -0.22, -1.8, "low"],
  ["Liquidity", -0.15, -1.2, "low"], ["Roll Down", 0.42, 3.5, "medium"],
]
const infraFactors: FundSeed["factorList"] = [
  ["Dividend Yield", 0.82, 8.4, "high"], ["Interest Rate Sensitivity", -0.65, -6.2, "high"],
  ["Infrastructure Beta", 0.91, 12.1, "high"], ["REIT Beta", 0.48, 4.1, "high"],
  ["Value", 0.35, 2.8, "medium"], ["Momentum", 0.12, 1.1, "low"],
  ["Credit Sensitivity", 0.28, 2.3, "medium"], ["Leverage Factor", 0.44, 3.6, "high"],
]
const reitFactors: FundSeed["factorList"] = [
  ["REIT Beta", 0.95, 14.2, "high"], ["Dividend Yield", 0.78, 7.6, "high"],
  ["Interest Rate Sensitivity", -0.72, -6.8, "high"], ["Value", 0.42, 3.4, "medium"],
  ["Quality", 0.58, 4.8, "high"], ["Momentum", 0.18, 1.5, "low"],
  ["Size", -0.15, -1.2, "low"], ["Leverage Factor", 0.38, 3.0, "medium"],
]
const maFactors: FundSeed["factorList"] = [
  ["Market Beta", 0.65, 6.2, "high"], ["Duration", 0.42, 3.8, "medium"], ["Credit Spread", 0.55, 4.6, "high"],
  ["Dividend Yield", 0.58, 5.0, "high"], ["Carry", 0.38, 3.1, "medium"], ["Momentum", 0.22, 1.8, "low"],
  ["Volatility", -0.25, -2.0, "medium"], ["Value", 0.30, 2.4, "medium"],
]

// Sector templates
const eqSectors: FundSeed["sectorWeights"] = [["Technology", 22, "#4a9eff"], ["Healthcare", 16, "#34d399"], ["Financials", 14, "#fbbf24"], ["Consumer Disc.", 12, "#f87171"], ["Industrials", 10, "#a78bfa"], ["Other", 26, "#64748b"]]
const fiSectors: FundSeed["sectorWeights"] = [["Investment Grade", 28, "#4a9eff"], ["High Yield", 18, "#34d399"], ["Agency MBS", 16, "#fbbf24"], ["EM Sovereign", 12, "#f87171"], ["Structured Credit", 10, "#a78bfa"], ["Other", 16, "#64748b"]]
const infraSectors: FundSeed["sectorWeights"] = [["Utilities", 32, "#4a9eff"], ["REITs", 18, "#34d399"], ["Energy Infra", 16, "#fbbf24"], ["Transport", 11, "#f87171"], ["Telecom Infra", 9, "#a78bfa"], ["Other", 14, "#64748b"]]
const reitSectors: FundSeed["sectorWeights"] = [["Specialty REITs", 25, "#4a9eff"], ["Data Center", 16, "#34d399"], ["Industrial", 15, "#fbbf24"], ["Healthcare", 11, "#f87171"], ["Residential", 10, "#a78bfa"], ["Other", 23, "#64748b"]]
const maSectors: FundSeed["sectorWeights"] = [["Equities", 35, "#4a9eff"], ["Fixed Income", 25, "#34d399"], ["Alternatives", 15, "#fbbf24"], ["Convertibles", 10, "#f87171"], ["Cash", 5, "#a78bfa"], ["Other", 10, "#64748b"]]
const muniSectors: FundSeed["sectorWeights"] = [["Revenue Bonds", 35, "#4a9eff"], ["GO Bonds", 25, "#34d399"], ["Healthcare Muni", 15, "#fbbf24"], ["Education", 10, "#f87171"], ["Transportation", 8, "#a78bfa"], ["Other", 7, "#64748b"]]

const catFactors: Record<Cat, FundSeed["factorList"]> = { equity: eqFactors, "fixed-income": fiFactors, infrastructure: infraFactors, reit: reitFactors, "multi-asset": maFactors }
const catSectors: Record<Cat, FundSeed["sectorWeights"]> = { equity: eqSectors, "fixed-income": fiSectors, infrastructure: infraSectors, reit: reitSectors, "multi-asset": maSectors }

function bc(ticker: string, name: string, price: number, vol: number, cat: Cat, o: SeedOpts): FundSeed {
  const sponsor = name.split(" ")[0]
  const navPs = parseFloat((price / (1 + o.pd / 100)).toFixed(2))
  const advM = parseFloat((vol * price / 1e6).toFixed(1)) || 0.5
  return {
    overview: {
      ticker, name, sponsor, strategy: o.strategy, aum: o.aum, adv: advM,
      navPerShare: navPs, marketPrice: price, premiumDiscount: o.pd,
      distributionRate: o.dist, leverageRatio: o.lev, expenseRatio: o.lev > 20 ? 2.1 + o.lev * 0.03 : 1.1 + o.dist * 0.05,
      inceptionDate: "Various", benchmark: cat === "equity" ? "S&P 500" : cat === "fixed-income" ? "Bloomberg Agg" : "Blended",
      category: cat, return90d: o.ret90d, holdingsDate: "2026-02-19", unii: o.unii, distributionCoverage: o.distCov,
    },
    sectorWeights: o.sw ?? catSectors[cat],
    factorList: o.fl ?? catFactors[cat],
    perf: { return1Y: o.ret1y, return3Y: o.ret1y * 0.7, return5Y: o.ret1y * 0.6, returnYTD: o.ret90d * 0.8, navReturn1Y: o.ret1y * 0.65, priceReturn1Y: o.ret1y, volatility1Y: o.vol1y, sharpeRatio: parseFloat((o.ret1y / o.vol1y).toFixed(2)), maxDrawdown1Y: parseFloat((-o.vol1y * 0.6).toFixed(1)), beta: parseFloat((0.5 + o.vol1y / 40).toFixed(2)) },
    riskData: { leverageRatio: o.lev, leverageType: o.levType ?? (o.lev > 25 ? "Reverse repos + credit facility" : o.lev > 0 ? "Credit facility" : "None"), leverageCost: o.lev > 0 ? "SOFR + 85bps" : "N/A", expenseRatio: o.lev > 20 ? 2.1 + o.lev * 0.03 : 1.1 + o.dist * 0.05, managementFee: 1.0, premiumDiscountCurrent: o.pd, premiumDiscount1YAvg: o.pd * 0.8, premiumDiscountPercentile: Math.round(50 + o.pd * 2), volatility90d: o.vol1y * 0.85, volatility1Y: o.vol1y, drawdownFromPeak: parseFloat((-o.vol1y * 0.4).toFixed(1)), zScoreDiscount: parseFloat((o.pd / (o.vol1y * 0.3 || 1)).toFixed(2)) },
    caveats: [
      `Holdings disclosure may lag ~60 days`,
      ...(o.lev > 30 ? ["Heavy leverage amplifies drawdown risk"] : []),
      ...(o.dist > 10 ? ["Elevated distribution may include return of capital"] : []),
      "Static analysis; intraday positions not captured",
    ],
  }
}

// ─── All 50 Fund Seeds (Barchart 2026-02-19 intraday prices) ────────────────
_seed = 42

export const cefUniverse: CEFProfile[] = [
  // Equity
  bc("USA", "Liberty All-Star Equity Fund", 6.05, 391569, "equity", { aum: 3.4, dist: 9.2, lev: 0, pd: -4.6, ret1y: 16.4, ret90d: 4.2, vol1y: 14.2, unii: 0.18, distCov: 1.10, strategy: "Multi-manager large-cap equity with value/growth blend" }),
  bc("ASG", "Liberty All-Star Growth Fund", 5.18, 102433, "equity", { aum: 1.2, dist: 6.4, lev: 0, pd: -8.2, ret1y: 18.2, ret90d: 5.4, vol1y: 16.8, unii: 0.08, distCov: 1.02, strategy: "Multi-manager growth equity" }),
  bc("GAM", "General American Investors", 61.49, 6913, "equity", { aum: 1.8, dist: 4.8, lev: 0, pd: -14.2, ret1y: 12.8, ret90d: 3.2, vol1y: 15.4, unii: 0.32, distCov: 1.28, strategy: "Large-cap equity, long-term value orientation" }),
  bc("GDV", "Gabelli Dividend & Income Trust", 29.045, 38025, "equity", { aum: 2.4, dist: 5.8, lev: 18, pd: -10.6, ret1y: 14.2, ret90d: 3.8, vol1y: 13.6, unii: 0.18, distCov: 1.15, strategy: "Equity income with covered calls and selective leverage" }),
  bc("EOS", "Eaton Vance Enhanced Equity Income Fund II", 19.22, 380000, "equity", { aum: 1.8, dist: 7.5, lev: 0, pd: -6.4, ret1y: 18.2, ret90d: 4.8, vol1y: 15.6, unii: 0.12, distCov: 1.04, strategy: "Large-cap equity with buy-write options overlay" }),
  bc("STK", "Columbia Seligman Premium Technology Growth Fund", 30.44, 220000, "equity", { aum: 0.9, dist: 8.8, lev: 0, pd: -2.8, ret1y: 24.8, ret90d: 6.8, vol1y: 20.4, unii: 0.06, distCov: 0.92, strategy: "Technology equity with covered call overlay" }),
  bc("EVT", "Eaton Vance Tax-Advantaged Dividend Income Fund", 26.12, 13868, "equity", { aum: 2.2, dist: 6.2, lev: 20, pd: -5.2, ret1y: 13.8, ret90d: 3.4, vol1y: 12.8, unii: 0.14, distCov: 1.08, strategy: "Tax-efficient equity dividend income" }),
  bc("ETJ", "Eaton Vance Risk-Managed Diversified Equity Income", 8.69, 32112, "equity", { aum: 1.2, dist: 8.4, lev: 0, pd: -7.6, ret1y: 11.2, ret90d: 2.8, vol1y: 10.8, unii: 0.06, distCov: 0.96, strategy: "Risk-managed equity with hedging overlay" }),
  bc("FFA", "First Trust Enhanced Equity Income Fund", 21.78, 2571, "equity", { aum: 0.6, dist: 7.2, lev: 0, pd: -8.4, ret1y: 14.6, ret90d: 3.6, vol1y: 14.2, unii: 0.10, distCov: 1.02, strategy: "Equity income with covered call writing" }),
  bc("DIAX", "Nuveen Dow 30 Dynamic Overwrite Fund", 15.62, 25092, "equity", { aum: 0.8, dist: 6.8, lev: 0, pd: -5.6, ret1y: 11.8, ret90d: 2.8, vol1y: 12.4, unii: 0.14, distCov: 1.10, strategy: "DJIA buy-write strategy" }),
  bc("BXMX", "Nuveen S&P 500 Buy-Write Income Fund", 14.63, 19058, "equity", { aum: 1.0, dist: 7.0, lev: 0, pd: -4.8, ret1y: 12.4, ret90d: 3.0, vol1y: 11.8, unii: 0.10, distCov: 1.05, strategy: "S&P 500 covered call strategy" }),
  bc("QQQX", "Nuveen Nasdaq 100 Dynamic Overwrite Fund", 27.425, 49763, "equity", { aum: 1.4, dist: 7.6, lev: 0, pd: -3.2, ret1y: 20.4, ret90d: 5.8, vol1y: 18.2, unii: 0.04, distCov: 0.94, strategy: "Nasdaq 100 with dynamic options overlay" }),
  bc("PEO", "Adams Natural Resources Fund Inc", 26.13, 25794, "equity", { aum: 0.9, dist: 5.8, lev: 0, pd: -3.0, ret1y: 6.0, ret90d: 1.0, vol1y: 17.0, unii: 0.22, distCov: 1.35, strategy: "Natural resources equity long-only" }),
  bc("GNT", "GAMCO Natural Resources Gold & Income Trust", 8.64, 12601, "equity", { aum: 0.5, dist: 5.4, lev: 0, pd: -8.8, ret1y: 8.2, ret90d: 2.6, vol1y: 19.8, unii: 0.16, distCov: 1.12, strategy: "Natural resources and gold equity with options" }),
  bc("TY", "Tri-Continental Corporation", 33.24, 6620, "equity", { aum: 1.6, dist: 4.4, lev: 0, pd: -12.6, ret1y: 11.4, ret90d: 2.8, vol1y: 13.2, unii: 0.28, distCov: 1.32, strategy: "Diversified large-cap equity, 90+ year history" }),
  bc("HQH", "abrdn Healthcare Investors Fund", 20.225, 112285, "equity", { aum: 1.2, dist: 8.6, lev: 0, pd: -10.2, ret1y: 14.8, ret90d: 4.2, vol1y: 18.4, unii: 0.02, distCov: 0.86, strategy: "Healthcare and biotech equity" }),
  bc("HQL", "abrdn Life Sciences Investors Fund", 17.425, 78825, "equity", { aum: 0.8, dist: 8.2, lev: 0, pd: -11.4, ret1y: 15.8, ret90d: 4.4, vol1y: 19.2, unii: 0.04, distCov: 0.88, strategy: "Life sciences and pharma equity" }),
  bc("CAF", "Morgan Stanley China A Share Fund", 18.05, 1390, "equity", { aum: 0.3, dist: 0, lev: 0, pd: -18.2, ret1y: 8.2, ret90d: 4.8, vol1y: 22.8, unii: 0, distCov: 0, strategy: "China A-share equity" }),
  bc("TDF", "Templeton Dragon Fund", 11.69, 10259, "equity", { aum: 0.4, dist: 2.8, lev: 0, pd: -16.4, ret1y: 6.8, ret90d: 3.2, vol1y: 21.4, unii: 0.08, distCov: 0.82, strategy: "Greater China equity" }),

  // Fixed Income
  bc("PDI", "PIMCO Dynamic Income Fund", 19.84, 1540000, "fixed-income", { aum: 4.8, dist: 12.1, lev: 38.2, pd: 4.9, ret1y: 11.8, ret90d: 2.1, vol1y: 11.2, unii: -0.18, distCov: 0.85, levType: "Reverse repos + TRS + interest rate swaps", strategy: "Multi-sector fixed income with aggressive leverage" }),
  bc("PTY", "PIMCO Corporate & Income Opportunity Fund", 14.22, 880000, "fixed-income", { aum: 3.4, dist: 9.4, lev: 42.8, pd: 8.3, ret1y: 10.2, ret90d: 1.8, vol1y: 10.8, unii: -0.24, distCov: 0.78, levType: "Reverse repos + TRS", strategy: "Investment-grade and high-yield corporate with aggressive leverage" }),
  bc("GOF", "Guggenheim Strategic Opportunities Fund", 15.88, 640000, "fixed-income", { aum: 2.8, dist: 13.2, lev: 35.4, pd: 12.5, ret1y: 9.8, ret90d: 1.5, vol1y: 12.4, unii: -0.32, distCov: 0.72, strategy: "Multi-strategy fixed income with CLO and structured credit" }),
  bc("DSL", "DoubleLine Income Solutions Fund", 11.50, 191493, "fixed-income", { aum: 2.8, dist: 8.4, lev: 30, pd: -2.8, ret1y: 8.6, ret90d: 1.8, vol1y: 10.4, unii: -0.04, distCov: 0.94, strategy: "Multi-sector fixed income with EM and structured credit" }),
  bc("EFR", "Eaton Vance Senior Floating-Rate Fund", 10.95, 17871, "fixed-income", { aum: 1.4, dist: 7.8, lev: 28, pd: -4.2, ret1y: 8.2, ret90d: 1.6, vol1y: 8.4, unii: 0.06, distCov: 1.04, strategy: "Senior secured floating rate loans" }),
  bc("ETW", "Eaton Vance Tax-Managed Global Buy-Write", 9.425, 68063, "fixed-income", { aum: 1.6, dist: 8.2, lev: 0, pd: -6.8, ret1y: 10.4, ret90d: 2.2, vol1y: 11.6, unii: 0.04, distCov: 0.98, strategy: "Tax-managed global buy-write with income focus" }),
  bc("ETV", "Eaton Vance Tax-Managed Buy-Write Opportunities", 14.52, 57203, "fixed-income", { aum: 1.8, dist: 8.0, lev: 0, pd: -5.4, ret1y: 12.2, ret90d: 2.8, vol1y: 12.0, unii: 0.06, distCov: 1.00, strategy: "Tax-managed equity buy-write opportunities" }),
  bc("DHF", "Dreyfus High Yield Strategies Fund", 2.535, 56822, "fixed-income", { aum: 0.4, dist: 9.8, lev: 28, pd: -6.4, ret1y: 7.4, ret90d: 1.6, vol1y: 11.2, unii: -0.10, distCov: 0.84, strategy: "High yield corporate bonds" }),
  bc("JGH", "Nuveen Global High Income Fund", 12.82, 26167, "fixed-income", { aum: 1.2, dist: 8.8, lev: 26, pd: -5.8, ret1y: 9.4, ret90d: 2.0, vol1y: 10.2, unii: 0.02, distCov: 0.96, strategy: "Global high income fixed income" }),
  bc("HYI", "Western Asset High Yield Defined Opportunity Fund", 11.24, 26719, "fixed-income", { aum: 0.8, dist: 7.6, lev: 22, pd: -4.8, ret1y: 7.8, ret90d: 1.4, vol1y: 9.2, unii: 0.04, distCov: 1.02, strategy: "High yield with defined maturity" }),
  bc("HIO", "Western Asset High Income Opportunity Fund", 3.83, 150245, "fixed-income", { aum: 1.8, dist: 7.8, lev: 24, pd: -7.2, ret1y: 7.8, ret90d: 1.8, vol1y: 9.8, unii: 0.02, distCov: 0.98, strategy: "High income opportunity fixed income" }),
  bc("PDX", "PIMCO Dynamic Income Strategy Fund", 20.21, 6451, "fixed-income", { aum: 0.8, dist: 10.2, lev: 36, pd: 2.4, ret1y: 9.6, ret90d: 1.6, vol1y: 11.8, unii: -0.14, distCov: 0.82, levType: "Reverse repos + TRS", strategy: "Dynamic income strategy with leverage" }),
  bc("BWG", "BrandywineGLOBAL Global Income Opportunities", 8.52, 46520, "fixed-income", { aum: 0.6, dist: 9.4, lev: 26, pd: -8.2, ret1y: 7.2, ret90d: 1.4, vol1y: 12.8, unii: -0.06, distCov: 0.88, strategy: "Global income with emerging market focus" }),
  bc("EDD", "Morgan Stanley Emerging Markets Domestic Debt", 6.075, 151758, "fixed-income", { aum: 1.0, dist: 8.6, lev: 0, pd: -12.4, ret1y: 5.8, ret90d: 1.2, vol1y: 14.8, unii: -0.08, distCov: 0.82, strategy: "EM local currency sovereign debt" }),
  bc("WIW", "Western Asset Inflation-Linked Income Fund", 8.75, 133692, "fixed-income", { aum: 1.2, dist: 6.2, lev: 24, pd: -8.6, ret1y: 4.2, ret90d: 0.8, vol1y: 8.6, unii: 0.08, distCov: 1.06, strategy: "US TIPS and inflation-linked bonds" }),
  bc("PCQ", "PIMCO California Municipal Income Fund", 9.095, 43560, "fixed-income", { aum: 0.6, dist: 5.4, lev: 34, pd: -6.2, ret1y: 5.2, ret90d: 1.0, vol1y: 9.4, unii: 0.06, distCov: 1.04, sw: muniSectors, strategy: "California municipal bonds with leverage" }),
  bc("BFZ", "BlackRock California Municipal Income Trust", 11.11, 50000, "fixed-income", { aum: 0.4, dist: 5.2, lev: 32, pd: -8.8, ret1y: 4.8, ret90d: 1.0, vol1y: 8.2, unii: 0.04, distCov: 1.08, sw: muniSectors, strategy: "California municipal bonds" }),

  // Infrastructure
  bc("UTF", "Cohen & Steers Infrastructure Fund", 24.89, 820000, "infrastructure", { aum: 3.0, dist: 7.8, lev: 22.4, pd: -5.8, ret1y: 15.6, ret90d: 3.8, vol1y: 14.8, unii: 0.42, distCov: 1.12, strategy: "Global listed infrastructure with leverage" }),
  bc("UTG", "Reaves Utility Income Fund", 32.18, 280000, "infrastructure", { aum: 2.4, dist: 6.4, lev: 18.6, pd: -3.2, ret1y: 14.2, ret90d: 3.5, vol1y: 12.8, unii: 0.35, distCov: 1.18, strategy: "Utility and infrastructure equity income" }),
  bc("DNP", "DNP Select Income Fund", 9.12, 520000, "infrastructure", { aum: 3.8, dist: 7.2, lev: 24.2, pd: 2.2, ret1y: 11.4, ret90d: 2.8, vol1y: 10.6, unii: 0.22, distCov: 1.08, strategy: "Utility, telecom, and energy income with leverage" }),
  bc("IDE", "Voya Infrastructure, Industrials and Materials Fund", 14.02, 18379, "infrastructure", { aum: 0.6, dist: 7.8, lev: 20, pd: -8.4, ret1y: 12.6, ret90d: 3.2, vol1y: 14.2, unii: 0.12, distCov: 1.02, strategy: "Infrastructure and industrials equity" }),

  // REITs
  bc("RQI", "Cohen & Steers Quality Income Realty Fund", 13.12, 460000, "reit", { aum: 2.1, dist: 6.9, lev: 25.1, pd: -5.5, ret1y: 13.8, ret90d: 4.2, vol1y: 16.2, unii: 0.28, distCov: 1.05, strategy: "US REIT income with moderate leverage" }),
  bc("JRS", "Nuveen Real Estate Income Fund", 8.07, 24239, "reit", { aum: 0.8, dist: 7.4, lev: 22, pd: -6.8, ret1y: 11.2, ret90d: 3.4, vol1y: 15.8, unii: 0.10, distCov: 0.98, strategy: "Diversified REIT income" }),
  bc("RA", "Brookfield Real Assets Income Fund", 13.57, 99970, "reit", { aum: 1.4, dist: 9.2, lev: 28, pd: -4.2, ret1y: 10.8, ret90d: 2.8, vol1y: 13.6, unii: 0.02, distCov: 0.92, strategy: "Real assets including REITs, infrastructure, and real estate debt" }),

  // Multi-Asset
  bc("BOE", "BlackRock Enhanced Global Dividend Trust", 11.91, 40625, "multi-asset", { aum: 1.2, dist: 6.5, lev: 22, pd: -5.0, ret1y: 8.0, ret90d: 2.0, vol1y: 18.0, unii: 0.08, distCov: 0.95, strategy: "Global multi-asset income with leverage" }),
  bc("EOD", "Allspring Global Dividend Opportunity Fund", 6.14, 88016, "multi-asset", { aum: 0.8, dist: 8.8, lev: 18, pd: -9.4, ret1y: 9.4, ret90d: 2.4, vol1y: 14.6, unii: 0.06, distCov: 0.92, strategy: "Global dividend opportunities across asset classes" }),
  bc("CHW", "Calamos Global Dynamic Income Fund", 8.08, 65252, "multi-asset", { aum: 0.9, dist: 9.2, lev: 24, pd: -7.8, ret1y: 10.6, ret90d: 2.6, vol1y: 15.2, unii: -0.04, distCov: 0.88, strategy: "Global dynamic income with convertibles and equity" }),
  bc("NMAI", "Nuveen Multi-Asset Income Fund", 13.64, 9010, "multi-asset", { aum: 0.6, dist: 8.4, lev: 22, pd: -5.2, ret1y: 9.8, ret90d: 2.2, vol1y: 11.4, unii: 0.04, distCov: 0.96, strategy: "Multi-asset income across equity, credit, and real assets" }),
  bc("BCV", "Bancroft Fund Ltd", 23.27, 5290, "multi-asset", { aum: 0.2, dist: 4.8, lev: 0, pd: -10.4, ret1y: 12.8, ret90d: 3.2, vol1y: 14.2, unii: 0.18, distCov: 1.25, strategy: "Convertible securities focused" }),
  bc("HGLB", "Highland Global Allocation Fund", 8.945, 11548, "multi-asset", { aum: 0.2, dist: 9.2, lev: 0, pd: -18.4, ret1y: 6.8, ret90d: 1.8, vol1y: 16.2, unii: -0.12, distCov: 0.78, strategy: "Global allocation with alternative assets" }),
  bc("SABA", "Saba Capital Income & Opportunities Fund II", 8.01, 17796, "multi-asset", { aum: 0.4, dist: 7.6, lev: 0, pd: -4.2, ret1y: 8.4, ret90d: 2.0, vol1y: 10.4, unii: 0.08, distCov: 1.04, strategy: "Activist-driven closed-end fund arbitrage" }),
  bc("NCZ", "Virtus Convertible & Income Fund II", 14.845, 15662, "multi-asset", { aum: 0.6, dist: 9.6, lev: 26, pd: -6.2, ret1y: 10.2, ret90d: 2.6, vol1y: 13.8, unii: -0.02, distCov: 0.90, strategy: "Convertible securities and high yield income" }),
  bc("NIE", "Virtus Equity & Convertible Income Fund", 25.434, 32155, "multi-asset", { aum: 0.8, dist: 7.8, lev: 0, pd: -4.6, ret1y: 12.4, ret90d: 3.4, vol1y: 14.4, unii: 0.10, distCov: 1.02, strategy: "Equity and convertible securities income" }),
  bc("ZTR", "Virtus Total Return Fund Inc", 6.86, 46541, "multi-asset", { aum: 0.4, dist: 10.4, lev: 22, pd: -8.8, ret1y: 8.6, ret90d: 2.2, vol1y: 13.2, unii: -0.06, distCov: 0.84, strategy: "Multi-asset total return with leverage" }),
  bc("BGX", "Blackstone Long-Short Credit Income Fund", 11.24, 24857, "multi-asset", { aum: 0.6, dist: 8.6, lev: 20, pd: -5.4, ret1y: 9.2, ret90d: 2.0, vol1y: 10.8, unii: 0.04, distCov: 0.96, strategy: "Long-short credit with income focus" }),
  bc("BSTZ", "BlackRock Science & Technology Trust II", 23.01, 12418, "multi-asset", { aum: 0.8, dist: 7.4, lev: 0, pd: -6.8, ret1y: 16.4, ret90d: 4.6, vol1y: 19.8, unii: 0.02, distCov: 0.88, strategy: "Science and technology equity with options overlay" }),
  bc("RMT", "Royce Micro-Cap Trust", 12.09, 60804, "multi-asset", { aum: 0.5, dist: 5.6, lev: 0, pd: -12.2, ret1y: 10.4, ret90d: 2.8, vol1y: 18.6, unii: 0.14, distCov: 1.08, strategy: "Micro-cap equity value" }),
  bc("RVT", "Royce Value Trust", 18.52, 92097, "multi-asset", { aum: 1.2, dist: 5.8, lev: 0, pd: -10.8, ret1y: 11.8, ret90d: 3.2, vol1y: 17.4, unii: 0.16, distCov: 1.12, strategy: "Small-cap equity value" }),
  bc("NBXG", "Neuberger Berman Next Gen Connectivity Fund", 13.37, 59713, "multi-asset", { aum: 0.6, dist: 8.2, lev: 0, pd: -8.4, ret1y: 14.2, ret90d: 4.0, vol1y: 18.8, unii: 0.02, distCov: 0.86, strategy: "Next generation connectivity and 5G technology" }),
  bc("PDT", "John Hancock Premium Dividend Fund", 13.28, 31591, "multi-asset", { aum: 1.0, dist: 7.4, lev: 24, pd: -6.2, ret1y: 10.8, ret90d: 2.6, vol1y: 12.4, unii: 0.08, distCov: 0.98, strategy: "Premium dividend equity and preferred income" }),
].map(buildCEF)

export const cefByTicker: Record<string, CEFProfile> = Object.fromEntries(
  cefUniverse.map(p => [p.overview.ticker, p])
)

export const ALL_TICKERS = cefUniverse.map(p => p.overview.ticker)

// ─── 5-Pillar Scoring Engine ────────────────────────────────────────────────

function zscoreArray(vals: number[]): number[] {
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 1
  return vals.map(v => (v - mean) / std)
}

function minmax(vals: number[]): number[] {
  const mn = Math.min(...vals)
  const mx = Math.max(...vals)
  const range = (mx - mn) || 1
  return vals.map(v => (v - mn) / range)
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)) }

function applyFilters(p: CEFProfile): { passes: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (p.overview.aum < 0.5) reasons.push(`AUM $${p.overview.aum}B < $0.5B threshold`)
  if (p.overview.adv < 0.5) reasons.push(`ADV $${p.overview.adv}M < $0.5M threshold`)
  if (p.overview.distributionRate < 5) reasons.push(`Yield ${p.overview.distributionRate}% < 5% threshold`)
  const holdDate = new Date(p.overview.holdingsDate)
  const daysSince = Math.floor((Date.now() - holdDate.getTime()) / 86400000)
  if (daysSince > 90) reasons.push(`Holdings ${daysSince}d stale (>90d)`)
  return { passes: reasons.length === 0, reasons }
}

function extractMetrics(p: CEFProfile): FundMetricVector {
  return {
    yield: p.overview.distributionRate / 100,
    avgPremiumDiscount: p.overview.premiumDiscount / 100,
    realizedVol: p.performance.volatility1Y / 100,
    return1Y: p.performance.return1Y / 100,
  }
}

function computeZScores(profiles: CEFProfile[]): { zScores: ZScoreVector[]; metrics: FundMetricVector[] } {
  const metrics = profiles.map(extractMetrics)
  const zYields = zscoreArray(metrics.map(m => m.yield))
  const zPremiums = zscoreArray(metrics.map(m => m.avgPremiumDiscount))
  const zVols = zscoreArray(metrics.map(m => m.realizedVol))
  const zReturns = zscoreArray(metrics.map(m => m.return1Y))
  const zScores: ZScoreVector[] = metrics.map((_, i) => ({
    zYield: parseFloat(zYields[i].toFixed(4)),
    zPremium: parseFloat(zPremiums[i].toFixed(4)),
    zVol: parseFloat(zVols[i].toFixed(4)),
    zReturn: parseFloat(zReturns[i].toFixed(4)),
    compositeZ: parseFloat(((zYields[i] + zPremiums[i] + zVols[i] + zReturns[i]) / 4).toFixed(4)),
  }))
  return { zScores, metrics }
}

function computePSI(profile: CEFProfile): PSIResult {
  const navHist = profile.navHistory
  if (navHist.length < 6) return { psi: 0, significantBins: 0, totalBins: 10, regime: "stable" }
  const splitIdx = Math.floor(navHist.length * 0.75)
  const baseline = navHist.slice(0, splitIdx)
  const recent = navHist.slice(splitIdx)
  const navReturns = (arr: NAVPricePoint[]) => arr.slice(1).map((v, i) => (v.nav - arr[i].nav) / arr[i].nav)
  const baseReturns = navReturns(baseline)
  const recentReturns = navReturns(recent)
  const numBins = 10
  const allReturns = [...baseReturns, ...recentReturns]
  const minR = Math.min(...allReturns, -0.05)
  const maxR = Math.max(...allReturns, 0.05)
  const binWidth = (maxR - minR) / numBins
  const eps = 1e-8
  let psi = 0
  let significantBins = 0
  for (let b = 0; b < numBins; b++) {
    const lo = minR + b * binWidth
    const hi = lo + binWidth
    const basePct = Math.max(eps, baseReturns.filter(r => r >= lo && r < hi).length / baseReturns.length)
    const recentPct = Math.max(eps, recentReturns.filter(r => r >= lo && r < hi).length / recentReturns.length)
    const binPsi = (basePct - recentPct) * Math.log(basePct / recentPct)
    psi += binPsi
    if (Math.abs(binPsi) > 0.02) significantBins++
  }
  psi = Math.abs(psi)
  const regime: PSIResult["regime"] = psi < 0.1 ? "stable" : psi < 0.25 ? "shifting" : "unstable"
  return { psi: parseFloat(psi.toFixed(4)), significantBins, totalBins: numBins, regime }
}

function computePillarScores(profiles: CEFProfile[], zScores: ZScoreVector[], psiResults: PSIResult[]): PillarScores[] {
  const distCovs = profiles.map(p => p.overview.distributionCoverage)
  const uniis = profiles.map(p => p.overview.unii)
  const levAdjYields = profiles.map(p => p.overview.distributionRate / (1 + p.overview.leverageRatio / 100))
  const nDistCov = minmax(distCovs)
  const nUnii = minmax(uniis)
  const nLevAdjYield = minmax(levAdjYields)

  const negPDs = profiles.map(p => -p.overview.premiumDiscount)
  const pdVols = profiles.map(p => p.risk.volatility90d > 0 ? 1 / p.risk.volatility90d : 0.5)
  const meanRevProbs = profiles.map(p => clamp01((p.risk.zScoreDiscount + 3) / 6))
  const nNegPD = minmax(negPDs)
  const nPDVol = minmax(pdVols)
  const nMeanRev = minmax(meanRevProbs)

  const freshness = profiles.map(p => {
    const days = Math.floor((Date.now() - new Date(p.overview.holdingsDate).getTime()) / 86400000)
    return clamp01(1 - days / 180)
  })
  const driftStab = profiles.map(p =>
    p.driftRegime.currentRegime === "stable" ? 1 : p.driftRegime.currentRegime === "transitioning" ? 0.5 : 0
  )
  const levStab = profiles.map(p => clamp01(1 - Math.abs(p.leverageProbe.realizedVsReconstructed) / 5))
  const residStab = profiles.map(p => p.leverageProbe.residualFlagged ? 0 : 1)
  const nFresh = minmax(freshness)
  const nDrift = minmax(driftStab)
  const nLevStab = minmax(levStab)

  const invVols = profiles.map(p => 1 / (p.performance.volatility1Y || 1))
  const invDD = profiles.map(p => 1 / (Math.abs(p.performance.maxDrawdown1Y) || 1))
  const advs = profiles.map(p => p.overview.adv)
  const nInvVol = minmax(invVols)
  const nInvDD = minmax(invDD)
  const nAdv = minmax(advs)

  const mom90 = profiles.map(p => p.overview.return90d)
  const regimeFit = psiResults.map(r => r.regime === "stable" ? 1 : r.regime === "shifting" ? 0.5 : 0)
  const nMom90 = minmax(mom90)
  const nRegime = minmax(regimeFit)

  return profiles.map((_, i) => ({
    yieldQuality: parseFloat((0.40 * nDistCov[i] + 0.30 * nUnii[i] + 0.30 * nLevAdjYield[i]).toFixed(4)),
    discountAttractiveness: parseFloat((0.45 * nNegPD[i] + 0.25 * nPDVol[i] + 0.30 * nMeanRev[i]).toFixed(4)),
    xrayStability: parseFloat((0.25 * nFresh[i] + 0.30 * nDrift[i] + 0.25 * nLevStab[i] + 0.20 * residStab[i]).toFixed(4)),
    riskLiquidity: parseFloat((0.40 * nInvVol[i] + 0.30 * nInvDD[i] + 0.30 * nAdv[i]).toFixed(4)),
    momentumRegime: parseFloat((0.60 * nMom90[i] + 0.40 * nRegime[i]).toFixed(4)),
  }))
}

function computeWeightedScore(pillars: PillarScores): number {
  let score = 0
  for (const key of Object.keys(PILLAR_WEIGHTS) as (keyof PillarScores)[]) {
    score += pillars[key] * PILLAR_WEIGHTS[key]
  }
  return parseFloat(score.toFixed(4))
}

export function computeRankings(profiles: CEFProfile[]): FundRanking[] {
  const { zScores, metrics } = computeZScores(profiles)
  const psiResults = profiles.map(computePSI)
  const filters = profiles.map(applyFilters)
  const pillarScores = computePillarScores(profiles, zScores, psiResults)
  const composites = zScores.map(z => z.compositeZ)
  const psis = psiResults.map(p => p.psi)
  const nComposites = minmax(composites)
  const nPsis = minmax(psis)
  const rankings: FundRanking[] = profiles.map((p, i) => ({
    ticker: p.overview.ticker,
    metrics: metrics[i],
    zScores: zScores[i],
    compositeZ: composites[i],
    zNorm: parseFloat(nComposites[i].toFixed(4)),
    psiResult: psiResults[i],
    psiNorm: parseFloat(nPsis[i].toFixed(4)),
    pillars: pillarScores[i],
    score: computeWeightedScore(pillarScores[i]),
    rank: 0,
    passesFilter: filters[i].passes,
    filterReasons: filters[i].reasons,
  }))
  rankings.sort((a, b) => b.score - a.score)
  rankings.forEach((r, i) => { r.rank = i + 1 })
  return rankings
}

export const fundRankings = computeRankings(cefUniverse)
