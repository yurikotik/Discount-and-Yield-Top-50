import type {
  CEFProfile,
  FundMetricVector,
  FundRanking,
  NAVPricePoint,
  PillarScores,
  PSIResult,
  ZScoreVector,
} from "./cef-types"
import { PILLAR_WEIGHTS } from "./cef-types"

function zscoreArray(vals: number[]): number[] {
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 1
  return vals.map((v) => (v - mean) / std)
}

function minmax(vals: number[]): number[] {
  const mn = Math.min(...vals)
  const mx = Math.max(...vals)
  const range = mx - mn || 1
  return vals.map((v) => (v - mn) / range)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function applyFilters(p: CEFProfile): { passes: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (p.overview.aum < 0.5) reasons.push(`AUM $${p.overview.aum}B < $0.5B threshold`)
  if (p.overview.adv < 0.5) reasons.push(`ADV $${p.overview.adv}M < $0.5M threshold`)
  if (p.overview.distributionRate > 0 && p.overview.distributionRate < 5) {
    reasons.push(`Yield ${p.overview.distributionRate}% < 5% threshold`)
  }
  const holdDate = new Date(p.overview.holdingsDate)
  if (!Number.isNaN(holdDate.getTime())) {
    const daysSince = Math.floor((Date.now() - holdDate.getTime()) / 86400000)
    if (daysSince > 90) reasons.push(`Holdings ${daysSince}d stale (>90d)`)
  }
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
  const zYields = zscoreArray(metrics.map((m) => m.yield))
  const zPremiums = zscoreArray(metrics.map((m) => m.avgPremiumDiscount))
  const zVols = zscoreArray(metrics.map((m) => m.realizedVol))
  const zReturns = zscoreArray(metrics.map((m) => m.return1Y))

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
    const basePct = Math.max(eps, baseReturns.filter((r) => r >= lo && r < hi).length / baseReturns.length)
    const recentPct = Math.max(eps, recentReturns.filter((r) => r >= lo && r < hi).length / recentReturns.length)
    const binPsi = (basePct - recentPct) * Math.log(basePct / recentPct)
    psi += binPsi
    if (Math.abs(binPsi) > 0.02) significantBins++
  }
  psi = Math.abs(psi)
  const regime: PSIResult["regime"] = psi < 0.1 ? "stable" : psi < 0.25 ? "shifting" : "unstable"
  return { psi: parseFloat(psi.toFixed(4)), significantBins, totalBins: numBins, regime }
}

function computePillarScores(
  profiles: CEFProfile[],
  psiResults: PSIResult[],
): PillarScores[] {
  const distCovs = profiles.map((p) => p.overview.distributionCoverage)
  const uniis = profiles.map((p) => p.overview.unii)
  const levAdjYields = profiles.map((p) => p.overview.distributionRate / (1 + p.overview.leverageRatio / 100))
  const nDistCov = minmax(distCovs)
  const nUnii = minmax(uniis)
  const nLevAdjYield = minmax(levAdjYields)

  const negPDs = profiles.map((p) => -p.overview.premiumDiscount)
  const pdVols = profiles.map((p) => (p.risk.volatility90d > 0 ? 1 / p.risk.volatility90d : 0.5))
  const meanRevProbs = profiles.map((p) => {
    const zDisc = p.risk.zScoreDiscount
    return clamp01((zDisc + 3) / 6)
  })
  const nNegPD = minmax(negPDs)
  const nPDVol = minmax(pdVols)
  const nMeanRev = minmax(meanRevProbs)

  const freshness = profiles.map((p) => {
    const days = Math.floor((Date.now() - new Date(p.overview.holdingsDate).getTime()) / 86400000)
    return clamp01(1 - days / 180)
  })
  const driftStab = profiles.map((p) =>
    p.driftRegime.currentRegime === "stable" ? 1 : p.driftRegime.currentRegime === "transitioning" ? 0.5 : 0,
  )
  const levStab = profiles.map((p) => clamp01(1 - Math.abs(p.leverageProbe.realizedVsReconstructed) / 5))
  const residStab = profiles.map((p) => (p.leverageProbe.residualFlagged ? 0 : 1))
  const nFresh = minmax(freshness)
  const nDrift = minmax(driftStab)
  const nLevStab = minmax(levStab)

  const invVols = profiles.map((p) => 1 / (p.performance.volatility1Y || 1))
  const invDD = profiles.map((p) => 1 / (Math.abs(p.performance.maxDrawdown1Y) || 1))
  const advs = profiles.map((p) => p.overview.adv)
  const nInvVol = minmax(invVols)
  const nInvDD = minmax(invDD)
  const nAdv = minmax(advs)

  const mom90 = profiles.map((p) => p.overview.return90d)
  const regimeFit = psiResults.map((r) => (r.regime === "stable" ? 1 : r.regime === "shifting" ? 0.5 : 0))
  const nMom90 = minmax(mom90)
  const nRegime = minmax(regimeFit)

  return profiles.map((_, i) => ({
    yieldQuality: parseFloat((0.4 * nDistCov[i] + 0.3 * nUnii[i] + 0.3 * nLevAdjYield[i]).toFixed(4)),
    discountAttractiveness: parseFloat((0.45 * nNegPD[i] + 0.25 * nPDVol[i] + 0.3 * nMeanRev[i]).toFixed(4)),
    xrayStability: parseFloat((0.25 * nFresh[i] + 0.3 * nDrift[i] + 0.25 * nLevStab[i] + 0.2 * residStab[i]).toFixed(4)),
    riskLiquidity: parseFloat((0.4 * nInvVol[i] + 0.3 * nInvDD[i] + 0.3 * nAdv[i]).toFixed(4)),
    momentumRegime: parseFloat((0.6 * nMom90[i] + 0.4 * nRegime[i]).toFixed(4)),
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
  if (profiles.length === 0) return []

  const { zScores, metrics } = computeZScores(profiles)
  const psiResults = profiles.map(computePSI)
  const filters = profiles.map(applyFilters)
  const pillarScores = computePillarScores(profiles, psiResults)

  const composites = zScores.map((z) => z.compositeZ)
  const psis = psiResults.map((p) => p.psi)
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
  rankings.forEach((r, i) => {
    r.rank = i + 1
  })
  return rankings
}
