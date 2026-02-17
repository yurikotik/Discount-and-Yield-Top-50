// ─── 4-Node Pipeline Engine ─────────────────────────────────────────────────
// Ingest -> X-Ray -> Scoring -> Aggregation
// Each node has typed inputs, outputs, status, timing, and errors.

import {
  type UniverseMetricsRow,
  type HoldingsRow,
  type NavPriceRow,
  type DistributionRow,
  parseUniverseMetrics,
  parseHoldings,
  parseNavPrice,
  parseDistributions,
  type ParseError,
} from "./csv-schemas"

// ─── Node Status ────────────────────────────────────────────────────────────

export type NodeStatus = "pending" | "running" | "complete" | "error"

export interface NodeMeta {
  status: NodeStatus
  startedAt: number | null
  completedAt: number | null
  durationMs: number | null
  errors: ParseError[]
}

function emptyMeta(): NodeMeta {
  return { status: "pending", startedAt: null, completedAt: null, durationMs: null, errors: [] }
}

// ─── Node 1: Ingest ─────────────────────────────────────────────────────────

export interface IngestInputs {
  universeMetricsCsv: string
  holdingsCsv: string
  navPriceCsv: string
  distributionsCsv: string
  targetTicker: string
}

export interface IngestOutputs {
  universeMetrics: UniverseMetricsRow[]
  fundMetrics: UniverseMetricsRow | null
  holdings: HoldingsRow[]
  navPriceHistory: NavPriceRow[]
  distributions: DistributionRow[]
  dailyReturns: { date: string; navReturn: number; priceReturn: number }[]
  holdingsNormalized: { ticker: string; issuer: string; weightPct: number; marketValueUsd: number }[]
}

export interface IngestNode {
  meta: NodeMeta
  inputs: IngestInputs | null
  outputs: IngestOutputs | null
}

function runIngest(inputs: IngestInputs): { outputs: IngestOutputs; errors: ParseError[] } {
  const allErrors: ParseError[] = []

  const uResult = parseUniverseMetrics(inputs.universeMetricsCsv)
  allErrors.push(...uResult.errors)

  const hResult = parseHoldings(inputs.holdingsCsv)
  allErrors.push(...hResult.errors)

  const nResult = parseNavPrice(inputs.navPriceCsv)
  allErrors.push(...nResult.errors)

  const dResult = parseDistributions(inputs.distributionsCsv)
  allErrors.push(...dResult.errors)

  const fundMetrics = uResult.data.find(r => r.ticker === inputs.targetTicker) ?? null

  // Compute daily returns from NAV/price history
  const dailyReturns = nResult.data.slice(1).map((row, i) => {
    const prev = nResult.data[i]
    return {
      date: row.date,
      navReturn: prev.nav > 0 ? (row.nav - prev.nav) / prev.nav : 0,
      priceReturn: prev.marketPrice > 0 ? (row.marketPrice - prev.marketPrice) / prev.marketPrice : 0,
    }
  })

  // Normalize holdings to weights
  const totalMv = hResult.data.reduce((s, h) => s + h.marketValueUsd, 0)
  const holdingsNormalized = hResult.data.map(h => ({
    ticker: h.ticker,
    issuer: h.issuer,
    weightPct: totalMv > 0 ? (h.marketValueUsd / totalMv) * 100 : h.weightPct,
    marketValueUsd: h.marketValueUsd,
  }))

  return {
    outputs: {
      universeMetrics: uResult.data,
      fundMetrics,
      holdings: hResult.data,
      navPriceHistory: nResult.data,
      distributions: dResult.data,
      dailyReturns,
      holdingsNormalized,
    },
    errors: allErrors,
  }
}

// ─── Node 2: X-Ray ─────────────────────────────────────────────────────────

export interface XRayFlags {
  holdingsDecomposition: {
    topHoldings: { ticker: string; weight: number }[]
    sectorConcentration: { sector: string; weight: number }[]
    herfindahlIndex: number
  }
  leverageProbe: {
    residualReturn: number
    flagged: boolean
    likelyInstruments: string[]
  }
  distributionSustainability: {
    coverageRatio: number
    uniiTrend: "positive" | "negative" | "stable"
    rocPct: number
    sustainable: boolean
  }
  driftDetection: {
    regime: "stable" | "transitioning" | "volatile"
    changePoints: number
    maxDrift30d: number
  }
  liquidityScore: number
  confidenceScore: number
  warnings: string[]
}

export interface XRayNode {
  meta: NodeMeta
  outputs: XRayFlags | null
}

function runXRay(ingest: IngestOutputs): { outputs: XRayFlags; errors: ParseError[] } {
  const errors: ParseError[] = []
  const h = ingest.holdingsNormalized

  // Holdings decomposition
  const sorted = [...h].sort((a, b) => b.weightPct - a.weightPct)
  const topHoldings = sorted.slice(0, 10).map(x => ({ ticker: x.ticker, weight: x.weightPct }))

  // Sector concentration (derive from issuer names as proxy)
  const sectorMap = new Map<string, number>()
  for (const hld of h) {
    const sector = guessSector(hld.issuer)
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + hld.weightPct)
  }
  const sectorConcentration = Array.from(sectorMap.entries())
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((a, b) => b.weight - a.weight)

  // Herfindahl index
  const hhi = h.reduce((s, x) => s + (x.weightPct / 100) ** 2, 0)

  // Leverage probe: compute residual from NAV returns vs reconstruction
  const navReturns = ingest.dailyReturns.map(r => r.navReturn)
  const priceReturns = ingest.dailyReturns.map(r => r.priceReturn)
  const meanNav = navReturns.reduce((a, b) => a + b, 0) / (navReturns.length || 1)
  const meanPrice = priceReturns.reduce((a, b) => a + b, 0) / (priceReturns.length || 1)
  const residual = Math.abs(meanNav - meanPrice) * 100
  const flagged = residual > 1.0

  // Distribution sustainability
  const fm = ingest.fundMetrics
  const coverageRatio = fm ? fm.distributionCoverage : 1
  const uniiTrend: XRayFlags["distributionSustainability"]["uniiTrend"] =
    fm ? (fm.unii > 0.1 ? "positive" : fm.unii < -0.1 ? "negative" : "stable") : "stable"
  const dists = ingest.distributions
  const rocCount = dists.filter(d => d.type === "roc").length
  const rocPct = dists.length > 0 ? (rocCount / dists.length) * 100 : 0

  // Drift: simple rolling volatility regime detection
  const recent30 = navReturns.slice(-30)
  const recent90 = navReturns.slice(-90)
  const vol30 = stddev(recent30)
  const vol90 = stddev(recent90)
  const driftRatio = vol90 > 0 ? vol30 / vol90 : 1
  const regime: XRayFlags["driftDetection"]["regime"] =
    driftRatio > 1.5 ? "volatile" : driftRatio > 1.15 ? "transitioning" : "stable"

  // Liquidity score: based on holdings concentration
  const liquidityScore = Math.round(Math.max(0, Math.min(100, 100 - hhi * 300)))

  // Confidence: composite of data quality
  const holdingsAge = fm ? daysSince(fm.holdingsDate) : 90
  const confidenceScore = Math.round(
    Math.max(20, 100 - holdingsAge * 0.3 - (flagged ? 20 : 0) - (coverageRatio < 0.8 ? 15 : 0) - errors.length * 2)
  )

  // Warnings
  const warnings: string[] = []
  if (flagged) warnings.push("Leverage residual > 1%: possible undisclosed derivatives")
  if (coverageRatio < 0.8) warnings.push("Distribution coverage below 0.8x: ROC risk")
  if (holdingsAge > 90) warnings.push(`Holdings are ${holdingsAge} days stale`)
  if (regime === "volatile") warnings.push("Regime detection: volatile drift in recent 30d window")
  if (hhi > 0.15) warnings.push("Concentrated portfolio: HHI > 0.15")

  return {
    outputs: {
      holdingsDecomposition: { topHoldings, sectorConcentration, herfindahlIndex: parseFloat(hhi.toFixed(4)) },
      leverageProbe: { residualReturn: parseFloat(residual.toFixed(3)), flagged, likelyInstruments: flagged ? ["Possible TRS/swaps"] : ["None detected"] },
      distributionSustainability: { coverageRatio, uniiTrend, rocPct: parseFloat(rocPct.toFixed(1)), sustainable: coverageRatio >= 0.8 && rocPct < 30 },
      driftDetection: { regime, changePoints: regime === "stable" ? 0 : regime === "transitioning" ? 1 : 2, maxDrift30d: parseFloat((vol30 * 100).toFixed(2)) },
      liquidityScore,
      confidenceScore,
      warnings,
    },
    errors,
  }
}

function guessSector(issuer: string): string {
  const lower = issuer.toLowerCase()
  if (lower.includes("energy") || lower.includes("pipeline") || lower.includes("oil") || lower.includes("gas")) return "Energy"
  if (lower.includes("electric") || lower.includes("utility") || lower.includes("power") || lower.includes("water")) return "Utilities"
  if (lower.includes("telecom") || lower.includes("tower") || lower.includes("comm")) return "Communications"
  if (lower.includes("rail") || lower.includes("transport") || lower.includes("airport")) return "Transportation"
  if (lower.includes("reit") || lower.includes("realty") || lower.includes("real estate")) return "Real Estate"
  if (lower.includes("bank") || lower.includes("financial") || lower.includes("insurance")) return "Financials"
  if (lower.includes("tech") || lower.includes("semiconductor") || lower.includes("software")) return "Technology"
  return "Other"
}

function stddev(vals: number[]): number {
  if (vals.length < 2) return 0
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length)
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// ─── Node 3: Scoring ────────────────────────────────────────────────────────

export interface FundScore {
  ticker: string
  pillars: {
    yieldQuality: number
    discountAttractiveness: number
    xrayStability: number
    riskLiquidity: number
    momentumRegime: number
  }
  compositeScore: number
  zScores: { zYield: number; zPremium: number; zVol: number; zReturn: number; compositeZ: number }
  psi: number
  psiRegime: "stable" | "shifting" | "unstable"
  passesFilter: boolean
  filterReasons: string[]
}

export interface ScoringNode {
  meta: NodeMeta
  outputs: FundScore | null
}

function runScoring(ingest: IngestOutputs, xray: XRayFlags): { outputs: FundScore; errors: ParseError[] } {
  const errors: ParseError[] = []
  const fm = ingest.fundMetrics
  const allMetrics = ingest.universeMetrics

  if (!fm) {
    errors.push({ row: 0, column: "ticker", message: "Fund not found in universe metrics" })
    return { outputs: emptyScore("???"), errors }
  }

  // Z-score the 4 CSV metrics across the universe
  function zscore(arr: number[], val: number): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    const std = Math.sqrt(arr.reduce((a, v) => a + (v - mean) ** 2, 0) / arr.length) || 1
    return (val - mean) / std
  }

  const zYield = zscore(allMetrics.map(m => m.yield), fm.yield)
  const zPremium = zscore(allMetrics.map(m => m.avgPremiumDiscount), fm.avgPremiumDiscount)
  const zVol = zscore(allMetrics.map(m => m.realizedVol), fm.realizedVol)
  const zReturn = zscore(allMetrics.map(m => m.return1Y), fm.return1Y)
  const compositeZ = (zYield + zPremium + zVol + zReturn) / 4

  // PSI from daily returns
  const navReturns = ingest.dailyReturns.map(r => r.navReturn)
  const splitIdx = Math.floor(navReturns.length * 0.75)
  const baseline = navReturns.slice(0, splitIdx)
  const recent = navReturns.slice(splitIdx)
  let psi = computeBinnedPSI(baseline, recent)
  const psiRegime: FundScore["psiRegime"] = psi < 0.1 ? "stable" : psi < 0.25 ? "shifting" : "unstable"

  // 5-pillar scores
  const yieldQuality = clamp01(
    0.40 * clamp01(fm.distributionCoverage / 1.5) +
    0.30 * clamp01((fm.unii + 0.5) / 1.0) +
    0.30 * clamp01(fm.yield / 15)
  )

  const discountAttractiveness = clamp01(
    0.50 * clamp01((-fm.avgPremiumDiscount + 15) / 30) +
    0.50 * clamp01((compositeZ + 2) / 4)
  )

  const xrayStability = clamp01(
    0.30 * (xray.driftDetection.regime === "stable" ? 1 : xray.driftDetection.regime === "transitioning" ? 0.5 : 0) +
    0.25 * clamp01(1 - daysSince(fm.holdingsDate) / 180) +
    0.25 * (xray.leverageProbe.flagged ? 0 : 1) +
    0.20 * (xray.confidenceScore / 100)
  )

  const riskLiquidity = clamp01(
    0.40 * clamp01(1 - fm.realizedVol / 30) +
    0.30 * (xray.liquidityScore / 100) +
    0.30 * clamp01(fm.adv / 20)
  )

  const momentumRegime = clamp01(
    0.60 * clamp01((fm.return90d + 5) / 15) +
    0.40 * (psiRegime === "stable" ? 1 : psiRegime === "shifting" ? 0.5 : 0)
  )

  const pillars = { yieldQuality: round4(yieldQuality), discountAttractiveness: round4(discountAttractiveness), xrayStability: round4(xrayStability), riskLiquidity: round4(riskLiquidity), momentumRegime: round4(momentumRegime) }
  const compositeScore = round4(0.25 * pillars.yieldQuality + 0.25 * pillars.discountAttractiveness + 0.20 * pillars.xrayStability + 0.15 * pillars.riskLiquidity + 0.15 * pillars.momentumRegime)

  // Filters
  const filterReasons: string[] = []
  if (fm.aum < 0.5) filterReasons.push("AUM < $500M")
  if (fm.adv < 0.5) filterReasons.push("ADV < $500K")
  if (fm.yield < 5) filterReasons.push("Yield < 5%")
  if (daysSince(fm.holdingsDate) > 90) filterReasons.push("Holdings > 90d stale")

  return {
    outputs: {
      ticker: fm.ticker,
      pillars,
      compositeScore,
      zScores: { zYield: round4(zYield), zPremium: round4(zPremium), zVol: round4(zVol), zReturn: round4(zReturn), compositeZ: round4(compositeZ) },
      psi: round4(psi),
      psiRegime,
      passesFilter: filterReasons.length === 0,
      filterReasons,
    },
    errors,
  }
}

function computeBinnedPSI(baseline: number[], recent: number[]): number {
  if (baseline.length < 5 || recent.length < 2) return 0
  const all = [...baseline, ...recent]
  const minR = Math.min(...all, -0.05)
  const maxR = Math.max(...all, 0.05)
  const bins = 10
  const w = (maxR - minR) / bins
  const eps = 1e-8
  let psi = 0
  for (let b = 0; b < bins; b++) {
    const lo = minR + b * w
    const hi = lo + w
    const bp = Math.max(eps, baseline.filter(r => r >= lo && r < hi).length / baseline.length)
    const rp = Math.max(eps, recent.filter(r => r >= lo && r < hi).length / recent.length)
    psi += (bp - rp) * Math.log(bp / rp)
  }
  return Math.abs(psi)
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)) }
function round4(v: number): number { return parseFloat(v.toFixed(4)) }

function emptyScore(ticker: string): FundScore {
  return {
    ticker,
    pillars: { yieldQuality: 0, discountAttractiveness: 0, xrayStability: 0, riskLiquidity: 0, momentumRegime: 0 },
    compositeScore: 0,
    zScores: { zYield: 0, zPremium: 0, zVol: 0, zReturn: 0, compositeZ: 0 },
    psi: 0,
    psiRegime: "stable",
    passesFilter: false,
    filterReasons: ["No data"],
  }
}

// ─── Node 4: Aggregation ────────────────────────────────────────────────────

export interface AggregationOutputs {
  rankedFunds: { ticker: string; score: number; rank: number; passesFilter: boolean }[]
  selectionSummary: {
    topPick: string
    topScore: number
    averageScore: number
    filterPassCount: number
    filterFailCount: number
    totalFunds: number
  }
  alerts: MonitoringAlert[]
}

export interface MonitoringAlert {
  severity: "critical" | "warning" | "info"
  ticker: string
  tag: string
  message: string
  action: string
}

export interface AggregationNode {
  meta: NodeMeta
  outputs: AggregationOutputs | null
}

function runAggregation(
  allScores: FundScore[],
  allXRays: Map<string, XRayFlags>
): { outputs: AggregationOutputs; errors: ParseError[] } {
  const errors: ParseError[] = []

  const ranked = [...allScores]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((s, i) => ({ ticker: s.ticker, score: s.compositeScore, rank: i + 1, passesFilter: s.passesFilter }))

  const passCount = ranked.filter(r => r.passesFilter).length
  const avgScore = ranked.reduce((s, r) => s + r.score, 0) / (ranked.length || 1)

  // Generate monitoring alerts from X-ray flags + scores
  const alerts: MonitoringAlert[] = []
  for (const score of allScores) {
    const xray = allXRays.get(score.ticker)
    if (!xray) continue

    if (xray.confidenceScore < 60) {
      alerts.push({ severity: "critical", ticker: score.ticker, tag: "confidence_low", message: `Confidence score ${xray.confidenceScore}/100`, action: "Review data freshness and holdings disclosure" })
    }
    if (xray.leverageProbe.flagged) {
      alerts.push({ severity: "warning", ticker: score.ticker, tag: "leverage_watch", message: `Residual return ${xray.leverageProbe.residualReturn.toFixed(2)}% - possible undisclosed derivatives`, action: "Cross-reference with N-PORT filing, check TRS/swap exposure" })
    }
    if (xray.distributionSustainability.coverageRatio < 0.8) {
      alerts.push({ severity: "warning", ticker: score.ticker, tag: "dist_coverage_low", message: `Distribution coverage ${xray.distributionSustainability.coverageRatio.toFixed(2)}x`, action: "Monitor for distribution cut risk" })
    }
    if (xray.driftDetection.regime === "volatile") {
      alerts.push({ severity: "warning", ticker: score.ticker, tag: "regime_volatile", message: "Volatile drift regime detected in 30d window", action: "Reduce position weight or defer new entry" })
    }
    if (!score.passesFilter) {
      alerts.push({ severity: "info", ticker: score.ticker, tag: "filter_fail", message: score.filterReasons.join("; "), action: "Fund excluded from selection universe" })
    }
  }

  return {
    outputs: {
      rankedFunds: ranked,
      selectionSummary: {
        topPick: ranked[0]?.ticker ?? "N/A",
        topScore: ranked[0]?.score ?? 0,
        averageScore: round4(avgScore),
        filterPassCount: passCount,
        filterFailCount: ranked.length - passCount,
        totalFunds: ranked.length,
      },
      alerts: alerts.sort((a, b) => {
        const sev = { critical: 0, warning: 1, info: 2 }
        return sev[a.severity] - sev[b.severity]
      }),
    },
    errors,
  }
}

// ─── Full Pipeline State ────────────────────────────────────────────────────

export interface PipelineState {
  ingest: IngestNode
  xray: XRayNode
  scoring: ScoringNode
  aggregation: AggregationNode
  overallStatus: NodeStatus
  targetTicker: string
}

export function createEmptyPipeline(ticker: string = "UTF"): PipelineState {
  return {
    ingest: { meta: emptyMeta(), inputs: null, outputs: null },
    xray: { meta: emptyMeta(), outputs: null },
    scoring: { meta: emptyMeta(), outputs: null },
    aggregation: { meta: emptyMeta(), outputs: null },
    overallStatus: "pending",
    targetTicker: ticker,
  }
}

/**
 * Run the full pipeline synchronously (for use inside setTimeout for UI animation).
 * Returns a new PipelineState at each step via the onStep callback.
 */
export async function runPipelineStepped(
  inputs: IngestInputs,
  onStep: (state: PipelineState) => void,
  delayMs: number = 400,
): Promise<PipelineState> {
  let state = createEmptyPipeline(inputs.targetTicker)
  state.overallStatus = "running"

  // Step 1: Ingest
  state = { ...state, ingest: { ...state.ingest, meta: { ...state.ingest.meta, status: "running", startedAt: Date.now() }, inputs } }
  onStep(state)
  await delay(delayMs)

  const ingestResult = runIngest(inputs)
  state = {
    ...state,
    ingest: {
      meta: { status: "complete", startedAt: state.ingest.meta.startedAt, completedAt: Date.now(), durationMs: Date.now() - (state.ingest.meta.startedAt ?? Date.now()), errors: ingestResult.errors },
      inputs,
      outputs: ingestResult.outputs,
    },
  }
  onStep(state)
  await delay(delayMs)

  // Step 2: X-Ray
  state = { ...state, xray: { ...state.xray, meta: { ...state.xray.meta, status: "running", startedAt: Date.now() } } }
  onStep(state)
  await delay(delayMs)

  const xrayResult = runXRay(ingestResult.outputs)
  state = {
    ...state,
    xray: {
      meta: { status: "complete", startedAt: state.xray.meta.startedAt, completedAt: Date.now(), durationMs: Date.now() - (state.xray.meta.startedAt ?? Date.now()), errors: xrayResult.errors },
      outputs: xrayResult.outputs,
    },
  }
  onStep(state)
  await delay(delayMs)

  // Step 3: Scoring
  state = { ...state, scoring: { ...state.scoring, meta: { ...state.scoring.meta, status: "running", startedAt: Date.now() } } }
  onStep(state)
  await delay(delayMs)

  const scoringResult = runScoring(ingestResult.outputs, xrayResult.outputs)
  state = {
    ...state,
    scoring: {
      meta: { status: "complete", startedAt: state.scoring.meta.startedAt, completedAt: Date.now(), durationMs: Date.now() - (state.scoring.meta.startedAt ?? Date.now()), errors: scoringResult.errors },
      outputs: scoringResult.outputs,
    },
  }
  onStep(state)
  await delay(delayMs)

  // Step 4: Aggregation (runs over all universe scores; for demo we use the single fund)
  state = { ...state, aggregation: { ...state.aggregation, meta: { ...state.aggregation.meta, status: "running", startedAt: Date.now() } } }
  onStep(state)
  await delay(delayMs)

  // Build scores for all funds in universe for aggregation
  const allScores: FundScore[] = ingestResult.outputs.universeMetrics.map(fm => {
    if (fm.ticker === inputs.targetTicker) return scoringResult.outputs
    // Quick-score other funds without full X-ray
    const quickScore: FundScore = {
      ticker: fm.ticker,
      pillars: {
        yieldQuality: clamp01(fm.distributionCoverage / 1.5 * 0.4 + (fm.unii + 0.5) * 0.3 + fm.yield / 15 * 0.3),
        discountAttractiveness: clamp01((-fm.avgPremiumDiscount + 15) / 30),
        xrayStability: 0.6,
        riskLiquidity: clamp01(1 - fm.realizedVol / 30),
        momentumRegime: clamp01((fm.return90d + 5) / 15),
      },
      compositeScore: 0,
      zScores: { zYield: 0, zPremium: 0, zVol: 0, zReturn: 0, compositeZ: 0 },
      psi: 0,
      psiRegime: "stable",
      passesFilter: fm.aum >= 0.5 && fm.adv >= 0.5 && fm.yield >= 5,
      filterReasons: [],
    }
    quickScore.compositeScore = round4(
      0.25 * quickScore.pillars.yieldQuality + 0.25 * quickScore.pillars.discountAttractiveness +
      0.20 * quickScore.pillars.xrayStability + 0.15 * quickScore.pillars.riskLiquidity +
      0.15 * quickScore.pillars.momentumRegime
    )
    return quickScore
  })

  const xrayMap = new Map<string, XRayFlags>()
  xrayMap.set(inputs.targetTicker, xrayResult.outputs)

  const aggResult = runAggregation(allScores, xrayMap)
  state = {
    ...state,
    aggregation: {
      meta: { status: "complete", startedAt: state.aggregation.meta.startedAt, completedAt: Date.now(), durationMs: Date.now() - (state.aggregation.meta.startedAt ?? Date.now()), errors: aggResult.errors },
      outputs: aggResult.outputs,
    },
    overallStatus: "complete",
  }
  onStep(state)

  return state
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
