// ─── Sample CSV Data ────────────────────────────────────────────────────────
// Pre-built CSV strings generated from existing CEF profile data.
// Used to demonstrate the pipeline end-to-end without file uploads.

import { cefUniverse, type CEFProfile } from "./cef-universe"

// ─── Universe Metrics CSV ───────────────────────────────────────────────────

function buildUniverseMetricsCsv(): string {
  const header = "Ticker,AUM,ADV,1y_return,90d_return,avg_premium_discount,yield,realized_vol,holdings_date,UNII,distribution_coverage"
  const rows = cefUniverse.map(p => {
    const o = p.overview
    return [
      o.ticker,
      o.aum.toFixed(1),
      o.adv.toFixed(1),
      p.performance.return1Y.toFixed(2),
      o.return90d.toFixed(2),
      o.premiumDiscount.toFixed(2),
      o.distributionRate.toFixed(2),
      p.performance.volatility1Y.toFixed(2),
      o.holdingsDate,
      o.unii.toFixed(2),
      o.distributionCoverage.toFixed(2),
    ].join(",")
  })
  return [header, ...rows].join("\n")
}

// ─── Per-Fund Holdings CSV ──────────────────────────────────────────────────

function buildHoldingsCsv(profile: CEFProfile): string {
  const header = "Date,Ticker,Issuer,Shares,MarketValueUSD,Weight%"
  const date = profile.overview.holdingsDate
  const rows = profile.holdings.map(h => [
    date,
    h.ticker,
    h.name.replace(/,/g, ";"),
    Math.round(h.marketValue / 50).toString(), // approximate shares
    h.marketValue.toFixed(0),
    h.weight.toFixed(2),
  ].join(","))
  return [header, ...rows].join("\n")
}

// ─── Per-Fund NAV/Price CSV ─────────────────────────────────────────────────

function buildNavPriceCsv(profile: CEFProfile): string {
  const header = "Date,NAV,MarketPrice,Volume"
  const rows = profile.navHistory.map((pt, i) => {
    const volume = Math.round(200000 + Math.sin(i * 0.3) * 80000 + Math.random() * 50000)
    return [pt.date, pt.nav.toFixed(2), pt.price.toFixed(2), volume.toString()].join(",")
  })
  return [header, ...rows].join("\n")
}

// ─── Per-Fund Distributions CSV ─────────────────────────────────────────────

function buildDistributionsCsv(profile: CEFProfile): string {
  const header = "ExDate,Amount,Type"
  const rows = profile.distributions.map(d => [
    d.date,
    d.amount.toFixed(4),
    d.type,
  ].join(","))
  return [header, ...rows].join("\n")
}

// ─── Exported Sample Sets ───────────────────────────────────────────────────

export interface SampleCsvSet {
  ticker: string
  universeMetrics: string
  holdings: string
  navPrice: string
  distributions: string
}

export function getSampleCsvs(ticker: string = "UTF"): SampleCsvSet {
  const profile = cefUniverse.find(p => p.overview.ticker === ticker) ?? cefUniverse[0]
  return {
    ticker: profile.overview.ticker,
    universeMetrics: buildUniverseMetricsCsv(),
    holdings: buildHoldingsCsv(profile),
    navPrice: buildNavPriceCsv(profile),
    distributions: buildDistributionsCsv(profile),
  }
}

export function getAllTickers(): string[] {
  return cefUniverse.map(p => p.overview.ticker)
}
