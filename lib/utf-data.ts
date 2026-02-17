// ─── Core Types for CEF Analytics Dashboard ────────────────────────────────

export interface Holding {
  name: string
  ticker: string
  sector: string
  weight: number
  marketValue: number
  country: string
}

export interface SectorExposure {
  sector: string
  weight: number
  color: string
}

export interface FactorExposure {
  factor: string
  exposure: number
  tStat: number
  significance: "high" | "medium" | "low"
}

export interface ReturnDecomposition {
  period: string
  totalReturn: number
  navReturn: number
  premiumDiscountEffect: number
  distributionReturn: number
  leverageEffect: number
}

export interface NAVPricePoint {
  date: string
  nav: number
  price: number
}

export interface DistributionRecord {
  date: string
  amount: number
  type: "income" | "roc" | "capital-gain" | "mixed"
  frequency: "monthly" | "quarterly"
}

export interface PerformanceMetrics {
  return1Y: number
  return3Y: number
  return5Y: number
  returnYTD: number
  navReturn1Y: number
  priceReturn1Y: number
  volatility1Y: number
  sharpeRatio: number
  maxDrawdown1Y: number
  beta: number
}

export interface RiskMetrics {
  leverageRatio: number
  leverageType: string
  leverageCost: string
  expenseRatio: number
  managementFee: number
  premiumDiscountCurrent: number
  premiumDiscount1YAvg: number
  premiumDiscountPercentile: number // 0-100, where fund sits vs 2y range
  volatility90d: number
  volatility1Y: number
  drawdownFromPeak: number
  zScoreDiscount: number // z-score of current P/D vs 2y mean
}

// ─── Z-Score / PSI Ranking Types ────────────────────────────────────────────
// 5-pillar weighted scoring model from Top-50 -> Top-10 spec

// Raw metrics extracted per fund for Z-scoring
export interface FundMetricVector {
  yield: number               // distribution yield (decimal)
  avgPremiumDiscount: number  // avg_premium_discount (decimal)
  realizedVol: number         // realized_vol 1Y (decimal)
  return1Y: number            // 1y_return (decimal)
}

// Per-fund Z-scores on the 4 CSV metrics
export interface ZScoreVector {
  zYield: number
  zPremium: number
  zVol: number
  zReturn: number
  compositeZ: number          // mean([zYield, zPremium, zVol, zReturn])
}

export interface PSIResult {
  psi: number
  significantBins: number
  totalBins: number
  regime: "stable" | "shifting" | "unstable"
}

// 5-pillar scores, each normalized to [0,1] where 1 = best
export interface PillarScores {
  yieldQuality: number       // 25% — dist coverage, UNII trend, lev-adj yield
  discountAttractiveness: number // 25% — current discount Z, vol, mean-reversion
  xrayStability: number      // 20% — holdings freshness, factor drift, leverage stability
  riskLiquidity: number      // 15% — realized vol, drawdown, ADV
  momentumRegime: number     // 15% — 90d NAV momentum, sector regime alignment
}

export const PILLAR_WEIGHTS: Record<keyof PillarScores, number> = {
  yieldQuality: 0.25,
  discountAttractiveness: 0.25,
  xrayStability: 0.20,
  riskLiquidity: 0.15,
  momentumRegime: 0.15,
}

export const PILLAR_LABELS: Record<keyof PillarScores, string> = {
  yieldQuality: "Yield Quality",
  discountAttractiveness: "Discount Attractiveness",
  xrayStability: "X-Ray Stability",
  riskLiquidity: "Risk & Liquidity",
  momentumRegime: "Momentum & Regime",
}

export interface FundRanking {
  ticker: string
  metrics: FundMetricVector
  zScores: ZScoreVector
  compositeZ: number     // raw composite z (mean of 4 CSV z-scores)
  zNorm: number          // min-max normalized composite z [0,1]
  psiResult: PSIResult
  psiNorm: number        // min-max normalized PSI [0,1]
  pillars: PillarScores  // 5-pillar breakdown
  score: number          // weighted sum: sum(pillar_i * weight_i)
  rank: number
  passesFilter: boolean
  filterReasons: string[]
}

// ─── Leverage & Derivatives Probe Types ─────────────────────────────────────

export interface LeverageProbe {
  realizedVsReconstructed: number // residual monthly %
  residualFlagged: boolean
  impliedNotional: number // estimated notional from derivatives in $M
  likelyInstruments: string[]
  returnResiduals: { period: string; residual: number }[]
}

// ─── Drift & Regime Detection Types ─────────────────────────────────────────

export interface DriftMetric {
  date: string
  rolling30d: number // factor drift magnitude
  rolling90d: number
}

export interface RegimeShift {
  date: string
  factor: string
  direction: "increase" | "decrease"
  magnitude: number
  significance: "major" | "minor"
}

export interface DriftRegimeData {
  driftTimeSeries: DriftMetric[]
  regimeShifts: RegimeShift[]
  currentRegime: "stable" | "transitioning" | "volatile"
  changePointCount: number
}

// ─── Liquidity & Execution Types ────────────────────────────────────────────

export interface HoldingLiquidity {
  ticker: string
  name: string
  weight: number
  advProxy: number // avg daily volume in $M
  marketCap: number // in $B
  liquidityScore: number // 0-100
  daysToLiquidate: number
}

export interface LiquidityData {
  holdings: HoldingLiquidity[]
  overallIndex: number // 0-100
  illiquidPct: number // % of portfolio in illiquid positions
  largeIlliquidPositions: string[]
}

// ─── Confidence & Quality Types ─────────────────────────────────────────────

export interface ConfidenceData {
  qualityScore: number // 0-100
  invalidationConditions: string[]
  holdingsAge: number // days since last disclosure
  dataCompleteness: number // 0-100
  swapDisclosureRisk: "low" | "medium" | "high"
  distributionScore: number // 0-100 sustainability
  distributionRedFlags: string[]
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(2)}`
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

export function formatBps(value: number): string {
  return `${value.toFixed(0)} bps`
}
