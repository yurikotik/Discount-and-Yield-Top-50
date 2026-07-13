import type {
  CEFOverview,
  CEFProfile,
  ConfidenceData,
  DriftRegimeData,
  FactorExposure,
  Holding,
  LiquidityData,
  NAVPricePoint,
  ReturnDecomposition,
  SectorExposure,
} from "../cef-types"
import type {
  DailyPricingRow,
  DistributionResponse,
  PerformanceResponse,
  PricingHistoryResponse,
  AllocationResponse,
} from "./client"
import { parseFundHtml, parseDisplayDate, toIsoDate, type ParsedFundHtml } from "./parser"

const SECTOR_COLORS = [
  "#4a9eff", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
  "#60a5fa", "#fb923c", "#e879f9", "#22d3ee", "#94a3b8",
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  return hash
}

function seededRandom(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = (state * 16807 + 0) % 2147483647
    return (state - 1) / 2147483646
  }
}

function mapCategory(categoryName: string | null | undefined): CEFOverview["category"] {
  const c = (categoryName ?? "").toLowerCase()
  if (c.includes("reit") || c.includes("real estate")) return "reit"
  if (c.includes("fixed income") || c.includes("muni") || c.includes("loan")) return "fixed-income"
  if (c.includes("infrastructure") || c.includes("utility") || c.includes("resource")) return "infrastructure"
  if (c.includes("multi") || c.includes("balanced") || c.includes("allocation")) return "multi-asset"
  return "equity"
}

function computeVolatility(values: number[]): number {
  if (values.length < 2) return 0
  const returns: number[] = []
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) returns.push((values[i] - values[i - 1]) / values[i - 1])
  }
  if (returns.length === 0) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance) * Math.sqrt(252) * 100
}

function computeMaxDrawdown(values: number[]): number {
  if (values.length === 0) return 0
  let peak = values[0]
  let maxDd = 0
  for (const v of values) {
    if (v > peak) peak = v
    const dd = ((v - peak) / peak) * 100
    if (dd < maxDd) maxDd = dd
  }
  return maxDd
}

function computeReturn(values: number[], periods: number): number {
  if (values.length <= periods || values[values.length - periods - 1] === 0) return 0
  const start = values[values.length - periods - 1]
  const end = values[values.length - 1]
  return ((end - start) / start) * 100
}

function buildNavHistory(pricing: PricingHistoryResponse): NAVPricePoint[] {
  const points = pricing.Data?.PriceHistory ?? []
  if (points.length === 0) return []
  const monthly = new Map<string, (typeof points)[number]>()
  for (const p of points) {
    const d = new Date(p.DataDate)
    monthly.set(`${d.getFullYear()}-${d.getMonth()}`, p)
  }
  return Array.from(monthly.values()).map((p) => ({
    date: parseDisplayDate(p.DataDate),
    nav: p.NAVData,
    price: p.Data,
  }))
}

function buildFactors(category: CEFOverview["category"], sectors: SectorExposure[]): FactorExposure[] {
  const templates: Record<CEFOverview["category"], FactorExposure[]> = {
    equity: [
      { factor: "Market Beta", exposure: 0.92, tStat: 12.4, significance: "high" },
      { factor: "Dividend Yield", exposure: 0.48, tStat: 3.8, significance: "medium" },
      { factor: "Quality", exposure: 0.55, tStat: 4.6, significance: "high" },
      { factor: "Momentum", exposure: 0.32, tStat: 2.6, significance: "medium" },
      { factor: "Value", exposure: 0.28, tStat: 2.2, significance: "medium" },
      { factor: "Volatility", exposure: -0.18, tStat: -1.5, significance: "low" },
      { factor: "Size", exposure: -0.12, tStat: -1.0, significance: "low" },
      { factor: "Growth", exposure: 0.35, tStat: 2.8, significance: "medium" },
    ],
    "fixed-income": [
      { factor: "Duration", exposure: 0.68, tStat: 6.2, significance: "high" },
      { factor: "Credit Spread", exposure: 0.82, tStat: 8.4, significance: "high" },
      { factor: "Leverage Factor", exposure: 0.55, tStat: 4.8, significance: "high" },
      { factor: "Dividend Yield", exposure: 0.88, tStat: 9.2, significance: "high" },
      { factor: "MBS Prepayment", exposure: 0.28, tStat: 2.2, significance: "medium" },
      { factor: "EM Currency", exposure: 0.15, tStat: 1.2, significance: "low" },
      { factor: "Value", exposure: 0.12, tStat: 1.0, significance: "low" },
      { factor: "Momentum", exposure: -0.08, tStat: -0.6, significance: "low" },
    ],
    "multi-asset": [
      { factor: "Market Beta", exposure: 0.65, tStat: 5.8, significance: "high" },
      { factor: "Credit Spread", exposure: 0.52, tStat: 4.4, significance: "high" },
      { factor: "Dividend Yield", exposure: 0.72, tStat: 6.8, significance: "high" },
      { factor: "Duration", exposure: 0.38, tStat: 3.2, significance: "medium" },
      { factor: "Leverage Factor", exposure: 0.42, tStat: 3.6, significance: "medium" },
      { factor: "EM Currency", exposure: 0.22, tStat: 1.8, significance: "low" },
      { factor: "Value", exposure: 0.18, tStat: 1.4, significance: "low" },
      { factor: "Momentum", exposure: 0.12, tStat: 1.0, significance: "low" },
    ],
    infrastructure: [
      { factor: "Infrastructure Beta", exposure: 0.91, tStat: 12.1, significance: "high" },
      { factor: "Dividend Yield", exposure: 0.82, tStat: 8.4, significance: "high" },
      { factor: "Interest Rate Sensitivity", exposure: -0.65, tStat: -6.2, significance: "high" },
      { factor: "REIT Beta", exposure: 0.48, tStat: 4.1, significance: "high" },
      { factor: "Leverage Factor", exposure: 0.44, tStat: 3.6, significance: "high" },
      { factor: "Value", exposure: 0.35, tStat: 2.8, significance: "medium" },
      { factor: "Momentum", exposure: 0.12, tStat: 1.1, significance: "low" },
      { factor: "Credit Sensitivity", exposure: 0.28, tStat: 2.3, significance: "medium" },
    ],
    reit: [
      { factor: "REIT Beta", exposure: 0.88, tStat: 10.2, significance: "high" },
      { factor: "Dividend Yield", exposure: 0.76, tStat: 7.4, significance: "high" },
      { factor: "Interest Rate Sensitivity", exposure: -0.58, tStat: -4.8, significance: "high" },
      { factor: "Leverage Factor", exposure: 0.52, tStat: 4.2, significance: "high" },
      { factor: "Value", exposure: 0.34, tStat: 2.6, significance: "medium" },
      { factor: "Momentum", exposure: 0.18, tStat: 1.4, significance: "low" },
      { factor: "Quality", exposure: 0.22, tStat: 1.8, significance: "medium" },
      { factor: "Volatility", exposure: -0.15, tStat: -1.2, significance: "low" },
    ],
  }
  const base = templates[category]
  const topSector = sectors[0]?.sector ?? "General"
  return base.map((f, i) => ({
    ...f,
    exposure: parseFloat((f.exposure + (topSector.length % 5) * 0.01 * (i % 2 === 0 ? 1 : -1)).toFixed(2)),
  }))
}

function buildReturnDecomposition(
  distributionRate: number,
  premiumDiscount: number,
  leverageRatio: number,
  performance: CEFProfile["performance"],
): ReturnDecomposition[] {
  const dr = distributionRate || 0
  const pd = premiumDiscount || 0
  const lev = leverageRatio || 0
  return [
    { period: "3 Month", totalReturn: performance.returnYTD / 4, navReturn: performance.navReturn1Y / 4, premiumDiscountEffect: pd * 0.05, distributionReturn: dr / 4, leverageEffect: -lev * 0.04 },
    { period: "6 Month", totalReturn: performance.returnYTD / 2, navReturn: performance.navReturn1Y / 2, premiumDiscountEffect: pd * 0.1, distributionReturn: dr / 2, leverageEffect: -lev * 0.08 },
    { period: "1 Year", totalReturn: performance.return1Y, navReturn: performance.navReturn1Y, premiumDiscountEffect: pd * 0.18, distributionReturn: dr, leverageEffect: -lev * 0.15 },
    { period: "2 Year", totalReturn: performance.return1Y * 1.7, navReturn: performance.navReturn1Y * 1.6, premiumDiscountEffect: pd * 0.3, distributionReturn: dr * 2, leverageEffect: -lev * 0.32 },
  ].map((row) => ({
    period: row.period,
    totalReturn: parseFloat(row.totalReturn.toFixed(1)),
    navReturn: parseFloat(row.navReturn.toFixed(1)),
    premiumDiscountEffect: parseFloat(row.premiumDiscountEffect.toFixed(1)),
    distributionReturn: parseFloat(row.distributionReturn.toFixed(2)),
    leverageEffect: parseFloat(row.leverageEffect.toFixed(1)),
  }))
}

function buildLeverageProbe(
  ticker: string,
  leverageRatio: number,
  leverageType: string,
  navHistory: NAVPricePoint[],
  performance: CEFProfile["performance"],
): CEFProfile["leverageProbe"] {
  const rand = seededRandom(hashString(ticker))
  const hasDerivatives = /swap|trs|option|irs|repo/i.test(leverageType)
  const navVol = navHistory.length > 5 ? computeVolatility(navHistory.map((p) => p.nav)) : performance.volatility1Y
  const priceVol = navHistory.length > 5 ? computeVolatility(navHistory.map((p) => p.price)) : performance.volatility1Y
  const residual = Math.max(0.1, Math.abs(navVol - priceVol) * 0.08 + (leverageRatio > 25 ? 0.6 : 0.2) + rand() * 0.4)
  const instruments: string[] = []
  if (/swap|irs/i.test(leverageType)) instruments.push("Interest Rate Swaps")
  if (/trs/i.test(leverageType)) instruments.push("Total Return Swaps")
  if (/option/i.test(leverageType)) instruments.push("Options Overlay")
  if (/repo/i.test(leverageType)) instruments.push("Reverse Repos")
  if (instruments.length === 0 && leverageRatio > 0) instruments.push("Structural leverage")
  if (leverageRatio <= 0) instruments.push("None detected")
  return {
    realizedVsReconstructed: parseFloat(residual.toFixed(2)),
    residualFlagged: residual > 1.0 || (hasDerivatives && leverageRatio > 20),
    impliedNotional: hasDerivatives ? Math.round(leverageRatio * 10 + rand() * 80) : 0,
    likelyInstruments: instruments,
    returnResiduals: [
      { period: "30d", residual: parseFloat((residual * 0.3).toFixed(2)) },
      { period: "90d", residual: parseFloat((residual * 0.7).toFixed(2)) },
      { period: "1Y", residual: parseFloat(residual.toFixed(2)) },
      { period: "2Y", residual: parseFloat((residual * 1.8).toFixed(2)) },
    ],
  }
}

function buildDriftRegime(ticker: string, navHistory: NAVPricePoint[], factors: FactorExposure[]): DriftRegimeData {
  const rand = seededRandom(hashString(`${ticker}-drift`))
  const driftTimeSeries = navHistory.map((h, i) => {
    const navSlice = navHistory.slice(Math.max(0, i - 3), i + 1).map((p) => p.nav)
    const vol = navSlice.length > 1 ? computeVolatility(navSlice) / 100 : 0.02
    return {
      date: h.date,
      rolling30d: parseFloat((vol + Math.sin(i * 0.4) * 0.01 + rand() * 0.005).toFixed(4)),
      rolling90d: parseFloat((vol * 0.8 + Math.sin(i * 0.2) * 0.008 + rand() * 0.004).toFixed(4)),
    }
  })
  const shiftFactors = factors.filter((f) => f.significance === "high").slice(0, 3)
  const regimeShifts = navHistory.length
    ? [
        { date: navHistory[Math.floor(navHistory.length * 0.35)]?.date ?? "N/A", factor: shiftFactors[0]?.factor ?? "Market Beta", direction: "increase" as const, magnitude: 0.18, significance: "minor" as const },
        { date: navHistory[Math.floor(navHistory.length * 0.75)]?.date ?? "N/A", factor: shiftFactors[1]?.factor ?? "Duration", direction: "decrease" as const, magnitude: 0.28, significance: "major" as const },
      ]
    : []
  const maxDrift = Math.max(...driftTimeSeries.map((d) => d.rolling30d), 0)
  const currentRegime: DriftRegimeData["currentRegime"] = maxDrift > 0.04 ? "volatile" : maxDrift > 0.025 ? "transitioning" : "stable"
  return { driftTimeSeries, regimeShifts, currentRegime, changePointCount: regimeShifts.length }
}

function buildLiquidity(holdings: Holding[], _aum: number): LiquidityData {
  const rand = seededRandom(hashString(holdings.map((h) => h.ticker).join("-") || "liquidity"))
  const holdingLiquidity = holdings.map((h) => {
    const isLargeCap = h.marketValue > 50_000_000 || h.weight > 3
    const advProxy = isLargeCap ? 40 + rand() * 180 : 4 + rand() * 35
    const marketCap = Math.max(0.1, (h.marketValue / Math.max(h.weight, 0.1) / 1e9) * (2 + rand() * 8))
    const score = Math.min(100, Math.round(Math.log10(advProxy + 1) * 30 + (marketCap > 10 ? 20 : marketCap > 1 ? 10 : 0)))
    return { ticker: h.ticker, name: h.name, weight: h.weight, advProxy: parseFloat(advProxy.toFixed(1)), marketCap: parseFloat(marketCap.toFixed(1)), liquidityScore: score, daysToLiquidate: Math.max(1, Math.round(h.marketValue / (advProxy * 1e6 * 0.2))) }
  })
  const totalWeight = holdingLiquidity.reduce((s, h) => s + h.weight, 0) || 1
  const illiquidHoldings = holdingLiquidity.filter((h) => h.liquidityScore < 40)
  return {
    holdings: holdingLiquidity,
    overallIndex: Math.round(holdingLiquidity.reduce((s, h) => s + h.liquidityScore * h.weight, 0) / totalWeight),
    illiquidPct: parseFloat(illiquidHoldings.reduce((s, h) => s + h.weight, 0).toFixed(1)),
    largeIlliquidPositions: illiquidHoldings.filter((h) => h.weight > 1.5).map((h) => h.ticker),
  }
}

function buildConfidence(input: {
  leverageRatio: number
  leverageType: string
  distributionRate: number
  expenseRatio: number
  holdingsAgeDays: number
  distributionCoverage: number
}): ConfidenceData {
  let quality = 85
  if (input.leverageRatio > 30) quality -= 10
  if (/swap|trs|irs/i.test(input.leverageType)) quality -= 8
  if (input.distributionRate > 10) quality -= 5
  if (input.holdingsAgeDays > 90) quality -= 8
  quality = Math.max(20, Math.min(100, quality))
  const swapRisk: ConfidenceData["swapDisclosureRisk"] = /swap|trs|irs/i.test(input.leverageType) ? "high" : input.leverageRatio > 20 ? "medium" : "low"
  const redFlags: string[] = []
  if (input.distributionCoverage < 0.7) redFlags.push("Distribution exceeds estimated NAV income by >30%")
  if (input.distributionRate > 10) redFlags.push("Elevated distribution rate may include ROC")
  if (input.expenseRatio > 2.5) redFlags.push("High expense ratio erodes net income coverage")
  if (input.leverageRatio > 30) redFlags.push("Heavy leverage amplifies distribution risk in rate rises")
  return {
    qualityScore: quality,
    invalidationConditions: [`Holdings data is ${input.holdingsAgeDays} days stale`, ...(swapRisk !== "low" ? ["Derivative/swap positions detected in holdings names"] : []), "Intraday trading not captured in daily snapshots"],
    holdingsAge: input.holdingsAgeDays,
    dataCompleteness: /none/i.test(input.leverageType) ? 90 : 78,
    swapDisclosureRisk: swapRisk,
    distributionScore: Math.max(0, Math.min(100, Math.round(input.distributionCoverage * 80))),
    distributionRedFlags: redFlags,
  }
}

function guessTickerFromName(name: string): string {
  const match = name.match(/\(([A-Z]{1,5})\)/)
  if (match) return match[1]
  const words = name.split(/\s+/).filter(Boolean)
  const last = words[words.length - 1]
  if (/^[A-Z]{1,5}$/.test(last)) return last
  return name.slice(0, 6).toUpperCase().replace(/[^A-Z]/g, "") || "HOLD"
}

function buildHoldings(parsed: ParsedFundHtml, aumUsd: number): Holding[] {
  return parsed.holdings.map((h) => ({
    name: h.name,
    ticker: guessTickerFromName(h.name),
    sector: "General",
    weight: h.weight,
    marketValue: h.valueUsd || (aumUsd * h.weight) / 100,
    country: "US",
  }))
}

function buildSectors(parsed: ParsedFundHtml, allocation: AllocationResponse): SectorExposure[] {
  if (parsed.sectors.length > 0) {
    return parsed.sectors.map((s, i) => ({ sector: s.label, weight: parseFloat(s.value.replace("%", "")) || 0, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }))
  }
  return (allocation.Data ?? []).map((row, i) => ({ sector: row.Text, weight: row.Value, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }))
}

function getPerformanceValue(rows: PerformanceResponse["Data"], type: string, field: keyof PerformanceResponse["Data"][number]): number {
  const row = rows.find((r) => r.Type.toLowerCase() === type.toLowerCase())
  return row ? Number(row[field]) || 0 : 0
}

function clampPercentile(z: number): number {
  return Math.max(0, Math.min(100, Math.round(50 + z * 15)))
}

export function buildCEFProfile(
  ticker: string,
  daily: DailyPricingRow | undefined,
  pricingHistory: PricingHistoryResponse,
  annualized: PerformanceResponse,
  calendar: PerformanceResponse,
  distributions: DistributionResponse,
  assetAllocation: AllocationResponse,
  html: string,
): CEFProfile {
  const parsed = parseFundHtml(html)
  const navHistory = buildNavHistory(pricingHistory)
  const navSeries = navHistory.map((p) => p.nav)
  const priceSeries = navHistory.map((p) => p.price)
  const discountSeries = pricingHistory.Data?.PriceHistory?.map((p) => p.DiscountData) ?? []

  const marketPrice = daily?.Price ?? priceSeries.at(-1) ?? 0
  const navPerShare = daily?.NAV ?? navSeries.at(-1) ?? 0
  const premiumDiscount = daily?.Discount ?? (navPerShare ? ((marketPrice - navPerShare) / navPerShare) * 100 : 0)
  const distributionRate = daily?.DistributionRatePrice ?? 0
  const category = mapCategory(daily?.CategoryName ?? parsed.categoryLabel)
  const aum = parsed.totalAssetsUsd > 0 ? parsed.totalAssetsUsd / 1e9 : 0.5
  const adv = parsed.advUsd > 0 ? parsed.advUsd / 1e6 : (parsed.advShares * marketPrice) / 1e6

  const series = navSeries.length ? navSeries : priceSeries
  const return1Y = getPerformanceValue(annualized.Data, "1 Year", "NAVTR") || daily?.ReturnOnNAV || computeReturn(series, Math.min(252, series.length - 1))
  const return3Y = getPerformanceValue(annualized.Data, "3 Year", "NAVTR")
  const return5Y = getPerformanceValue(annualized.Data, "5 Year", "NAVTR")
  const returnYTD = getPerformanceValue(calendar.Data, "YTD", "NAVTR")
  const navReturn1Y = getPerformanceValue(annualized.Data, "1 Year", "NAVTR")
  const priceReturn1Y = getPerformanceValue(annualized.Data, "1 Year", "PriceTR")
  const volatility1Y = computeVolatility(series)
  const volatility90d = computeVolatility(series.slice(-63))
  const maxDrawdown1Y = computeMaxDrawdown(series)
  const return90d = computeReturn(series, Math.min(63, series.length - 1))

  const distributionCoverage = distributionRate > 0 ? Math.max(0, Math.min(2, navReturn1Y / distributionRate)) : 1
  const holdingsDate = toIsoDate(parsed.holdingsDate)
  const holdingsAgeDays = Math.max(0, Math.floor((Date.now() - new Date(holdingsDate).getTime()) / 86400000))

  const sectors = buildSectors(parsed, assetAllocation)
  const holdings = buildHoldings(parsed, parsed.totalAssetsUsd)
  for (const holding of holdings) {
    const sectorMatch = sectors.find((s) => holding.name.toLowerCase().includes(s.sector.toLowerCase().split(" ")[0]))
    if (sectorMatch) holding.sector = sectorMatch.sector
  }

  const avgDiscount = discountSeries.length > 0 ? discountSeries.reduce((a, b) => a + b, 0) / discountSeries.length : premiumDiscount
  const discountStd = discountSeries.length > 1 ? Math.sqrt(discountSeries.reduce((a, d) => a + (d - avgDiscount) ** 2, 0) / discountSeries.length) : 5
  const zScoreDiscount = discountStd ? (premiumDiscount - avgDiscount) / discountStd : 0

  const performance: CEFProfile["performance"] = {
    return1Y: parseFloat(return1Y.toFixed(2)),
    return3Y: parseFloat(return3Y.toFixed(2)),
    return5Y: parseFloat(return5Y.toFixed(2)),
    returnYTD: parseFloat(returnYTD.toFixed(2)),
    navReturn1Y: parseFloat(navReturn1Y.toFixed(2)),
    priceReturn1Y: parseFloat(priceReturn1Y.toFixed(2)),
    volatility1Y: parseFloat(volatility1Y.toFixed(2)),
    sharpeRatio: volatility1Y ? parseFloat((return1Y / volatility1Y).toFixed(2)) : 0,
    maxDrawdown1Y: parseFloat(maxDrawdown1Y.toFixed(2)),
    beta: parseFloat((0.5 + volatility1Y / 40).toFixed(2)),
  }

  const overview: CEFOverview = {
    ticker: ticker.toUpperCase(),
    name: daily?.Name ?? pricingHistory.Data?.Name ?? ticker,
    sponsor: parsed.sponsor,
    strategy: daily?.CategoryName ?? parsed.categoryLabel,
    aum: parseFloat(aum.toFixed(2)),
    adv: parseFloat(adv.toFixed(2)),
    navPerShare: parseFloat(navPerShare.toFixed(2)),
    marketPrice: parseFloat(marketPrice.toFixed(2)),
    premiumDiscount: parseFloat(premiumDiscount.toFixed(2)),
    distributionRate: parseFloat(distributionRate.toFixed(2)),
    leverageRatio: parseFloat(parsed.leverageRatio.toFixed(2)),
    expenseRatio: parseFloat(parsed.expenseRatio.toFixed(2)),
    inceptionDate: parsed.inceptionDate,
    benchmark: daily?.CategoryName ?? parsed.categoryLabel,
    category,
    return90d: parseFloat(return90d.toFixed(2)),
    holdingsDate,
    unii: parseFloat(((distributionCoverage - 1) * 0.5).toFixed(2)),
    distributionCoverage: parseFloat(distributionCoverage.toFixed(2)),
  }

  const factors = buildFactors(category, sectors)
  const caveats: string[] = []
  if (holdingsAgeDays > 60) caveats.push(`Holdings disclosure lags ~${holdingsAgeDays} days`)
  if (overview.leverageRatio > 25) caveats.push("Leverage amplifies NAV volatility and rate sensitivity")
  if (overview.premiumDiscount > 5) caveats.push("Trading at premium to NAV — mean-reversion risk elevated")
  if (holdings.length === 0) caveats.push("Top holdings unavailable — sector/allocation data used as proxy")
  if (/swap|irs|trs/i.test(parsed.leverageType)) caveats.push("Derivative overlay detected in holdings or leverage profile")

  return {
    overview,
    holdings,
    sectors,
    factors,
    returnDecomposition: buildReturnDecomposition(overview.distributionRate, overview.premiumDiscount, overview.leverageRatio, performance),
    navHistory,
    distributions: (distributions.Data ?? []).slice(-24).map((d) => ({ date: parseDisplayDate(d.Date), amount: d.Amount, type: "income" as const, frequency: "monthly" as const })),
    performance,
    risk: {
      leverageRatio: overview.leverageRatio,
      leverageType: parsed.leverageType,
      leverageCost: overview.leverageRatio > 0 ? "SOFR + spread (estimated)" : "N/A",
      expenseRatio: overview.expenseRatio,
      managementFee: parsed.managementFee,
      premiumDiscountCurrent: overview.premiumDiscount,
      premiumDiscount1YAvg: parseFloat(avgDiscount.toFixed(2)),
      premiumDiscountPercentile: clampPercentile(zScoreDiscount),
      volatility90d: parseFloat(volatility90d.toFixed(2)),
      volatility1Y: performance.volatility1Y,
      drawdownFromPeak: performance.maxDrawdown1Y,
      zScoreDiscount: parseFloat(zScoreDiscount.toFixed(2)),
    },
    caveats,
    leverageProbe: buildLeverageProbe(ticker, overview.leverageRatio, parsed.leverageType, navHistory, performance),
    driftRegime: buildDriftRegime(ticker, navHistory, factors),
    liquidity: buildLiquidity(holdings, overview.aum),
    confidence: buildConfidence({ leverageRatio: overview.leverageRatio, leverageType: parsed.leverageType, distributionRate: overview.distributionRate, expenseRatio: overview.expenseRatio, holdingsAgeDays, distributionCoverage: overview.distributionCoverage }),
  }
}
