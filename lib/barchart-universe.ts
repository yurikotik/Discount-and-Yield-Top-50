// ─── 40 Additional CEF Profiles from Barchart CSV (2026-02-13) ──────────────
// Real: ticker, name, last price, volume. Generated: strategy/category, holdings, factors.

import type { CEFOverview, PerformanceMetrics, RiskMetrics } from "./cef-universe"

export interface BarchartFundSeed {
  overview: CEFOverview
  sectorWeights: [string, number, string][]
  factorList: [string, number, number, "high" | "medium" | "low"][]
  perf: PerformanceMetrics
  riskData: RiskMetrics
  caveats: string[]
}

// Category-based factor templates
const equityFactors: BarchartFundSeed["factorList"] = [
  ["Market Beta", 0.92, 12.4, "high"], ["Dividend Yield", 0.48, 3.8, "medium"], ["Quality", 0.55, 4.6, "high"],
  ["Momentum", 0.32, 2.6, "medium"], ["Value", 0.28, 2.2, "medium"], ["Volatility", -0.18, -1.5, "low"],
  ["Size", -0.12, -1.0, "low"], ["Growth", 0.35, 2.8, "medium"],
]
const fixedIncomeFactors: BarchartFundSeed["factorList"] = [
  ["Duration", 0.68, 6.2, "high"], ["Credit Spread", 0.82, 8.4, "high"], ["Leverage Factor", 0.55, 4.8, "high"],
  ["Dividend Yield", 0.88, 9.2, "high"], ["MBS Prepayment", 0.28, 2.2, "medium"], ["EM Currency", 0.15, 1.2, "low"],
  ["Value", 0.12, 1.0, "low"], ["Momentum", -0.08, -0.6, "low"],
]
const multiAssetFactors: BarchartFundSeed["factorList"] = [
  ["Market Beta", 0.65, 5.8, "high"], ["Credit Spread", 0.52, 4.4, "high"], ["Dividend Yield", 0.72, 6.8, "high"],
  ["Duration", 0.38, 3.2, "medium"], ["Leverage Factor", 0.42, 3.6, "medium"], ["EM Currency", 0.22, 1.8, "low"],
  ["Value", 0.18, 1.4, "low"], ["Momentum", 0.12, 1.0, "low"],
]

const equitySectors: BarchartFundSeed["sectorWeights"] = [
  ["Technology", 24.2, "#4a9eff"], ["Healthcare", 15.8, "#34d399"], ["Financials", 14.2, "#fbbf24"],
  ["Consumer Discretionary", 11.6, "#f87171"], ["Industrials", 10.4, "#a78bfa"], ["Other", 23.8, "#64748b"],
]
const fixedIncomeSectors: BarchartFundSeed["sectorWeights"] = [
  ["Investment Grade", 28.4, "#4a9eff"], ["High Yield", 22.8, "#34d399"], ["Agency MBS", 16.2, "#fbbf24"],
  ["EM Debt", 12.4, "#f87171"], ["Bank Loans", 10.8, "#a78bfa"], ["Other", 9.4, "#64748b"],
]
const muniSectors: BarchartFundSeed["sectorWeights"] = [
  ["General Obligation", 32.4, "#4a9eff"], ["Revenue Bonds", 24.6, "#34d399"], ["Healthcare", 14.2, "#fbbf24"],
  ["Education", 10.8, "#f87171"], ["Transportation", 9.2, "#a78bfa"], ["Other", 8.8, "#64748b"],
]
const resourcesSectors: BarchartFundSeed["sectorWeights"] = [
  ["Energy", 34.2, "#4a9eff"], ["Materials", 22.4, "#34d399"], ["Mining", 14.8, "#fbbf24"],
  ["Agriculture", 10.6, "#f87171"], ["Gold", 8.8, "#a78bfa"], ["Other", 9.2, "#64748b"],
]
const globalSectors: BarchartFundSeed["sectorWeights"] = [
  ["Developed Markets", 38.2, "#4a9eff"], ["Emerging Markets", 22.4, "#34d399"], ["Frontier Markets", 8.8, "#fbbf24"],
  ["Sovereign Debt", 12.4, "#f87171"], ["FX", 8.6, "#a78bfa"], ["Other", 9.6, "#64748b"],
]
const convertibleSectors: BarchartFundSeed["sectorWeights"] = [
  ["Technology Converts", 28.4, "#4a9eff"], ["Healthcare Converts", 18.2, "#34d399"], ["Financials Converts", 14.6, "#fbbf24"],
  ["Energy Converts", 12.8, "#f87171"], ["Industrials Converts", 10.4, "#a78bfa"], ["Other", 15.6, "#64748b"],
]

// Helper to build seeds from Barchart data
function bc(
  ticker: string, name: string, price: number, volume: number,
  category: CEFOverview["category"],
  opts: Partial<{
    aum: number, dist: number, lev: number, pd: number, er: number,
    ret1y: number, ret90d: number, vol1y: number, unii: number, distCov: number,
    levType: string, benchmark: string, strategy: string, inception: string,
    sectorWeights: BarchartFundSeed["sectorWeights"],
    factorList: BarchartFundSeed["factorList"],
    caveats: string[],
  }> = {}
): BarchartFundSeed {
  const {
    aum = 1.2, dist = 7.5, lev = 18, pd = -4.0, er = 1.8,
    ret1y = 10.0, ret90d = 2.5, vol1y = 14.0, unii = 0.1, distCov = 1.0,
    levType = lev > 0 ? "Reverse repos + credit facility" : "None",
    benchmark = "Blended Index",
    strategy = `${name.split(" ").slice(0, 3).join(" ")} strategy`,
    inception = "2010",
    sectorWeights = category === "equity" ? equitySectors : category === "fixed-income" ? fixedIncomeSectors : globalSectors,
    factorList = category === "equity" ? equityFactors : category === "fixed-income" ? fixedIncomeFactors : multiAssetFactors,
    caveats = [
      lev > 25 ? `${lev}% leverage amplifies risks` : "Moderate leverage profile",
      pd > 5 ? `Premium of ${pd.toFixed(1)}% creates entry risk` : pd < -8 ? `Deep discount of ${pd.toFixed(1)}% may be persistent` : "Discount/premium within normal range",
      dist > 10 ? "Elevated distribution may include ROC" : "Distribution appears sustainable",
    ],
  } = opts

  const adv = parseFloat((volume / 1e6).toFixed(1)) || 0.1
  const navPerShare = parseFloat((price / (1 + pd / 100)).toFixed(2))
  const navReturn = parseFloat((ret1y * 0.7).toFixed(1))

  return {
    overview: {
      ticker, name,
      sponsor: name.split(" ")[0],
      strategy,
      aum, adv,
      navPerShare,
      marketPrice: price,
      premiumDiscount: pd,
      distributionRate: dist,
      leverageRatio: lev,
      expenseRatio: er,
      inceptionDate: inception,
      benchmark,
      category,
      return90d: ret90d,
      holdingsDate: "2025-12-31",
      unii, distributionCoverage: distCov,
    },
    sectorWeights,
    factorList,
    perf: {
      return1Y: ret1y, return3Y: parseFloat((ret1y * 0.55).toFixed(1)), return5Y: parseFloat((ret1y * 0.5).toFixed(1)),
      returnYTD: parseFloat((ret90d * 0.8).toFixed(1)), navReturn1Y: navReturn, priceReturn1Y: ret1y,
      volatility1Y: vol1y, sharpeRatio: parseFloat((ret1y / vol1y * 0.7).toFixed(2)),
      maxDrawdown1Y: parseFloat((-vol1y * 0.6).toFixed(1)), beta: category === "equity" ? 0.88 : 0.52,
    },
    riskData: {
      leverageRatio: lev,
      leverageType: levType,
      leverageCost: lev > 0 ? "SOFR + 85bps" : "N/A",
      expenseRatio: er,
      managementFee: parseFloat((er * 0.55).toFixed(2)),
      premiumDiscountCurrent: pd,
      premiumDiscount1YAvg: parseFloat((pd * 0.8).toFixed(1)),
      premiumDiscountPercentile: pd > 0 ? 65 : 30,
      volatility90d: parseFloat((vol1y * 0.85).toFixed(1)),
      volatility1Y: vol1y,
      drawdownFromPeak: parseFloat((-vol1y * 0.4).toFixed(1)),
      zScoreDiscount: parseFloat((pd / 5).toFixed(2)),
    },
    caveats,
  }
}

// ─── All 40 additional tickers from Barchart CSV ────────────────────────────
// Organized by category, using real prices & volumes from 2026-02-13

export const barchartSeeds: BarchartFundSeed[] = [
  // Global / Multi-Asset
  bc("BOE", "Blackrock Global", 11.95, 145000, "multi-asset", { aum: 0.8, dist: 6.8, lev: 22, pd: -6.2, ret1y: 8.4, ret90d: 1.8, vol1y: 12.8, unii: 0.08, distCov: 0.95, strategy: "Global multi-asset income with leverage", sectorWeights: globalSectors }),
  bc("EOD", "Wells Fargo Global Dividend Opportunity", 6.08, 123300, "multi-asset", { aum: 0.5, dist: 8.2, lev: 15, pd: -8.5, ret1y: 7.2, ret90d: 1.5, vol1y: 13.4, unii: -0.05, distCov: 0.88, strategy: "Global dividend equity and fixed income" }),
  bc("CHW", "Calamos Gbl Dyn Inc", 8.11, 80600, "multi-asset", { aum: 0.6, dist: 9.4, lev: 26, pd: -7.2, ret1y: 9.1, ret90d: 2.0, vol1y: 15.2, unii: -0.12, distCov: 0.82, strategy: "Global dynamic income with convertible focus", sectorWeights: convertibleSectors }),
  bc("BWG", "Legg Mason Bw Global Income", 8.61, 120400, "fixed-income", { aum: 0.7, dist: 8.8, lev: 24, pd: -9.4, ret1y: 6.8, ret90d: 1.2, vol1y: 11.8, unii: -0.08, distCov: 0.90, strategy: "Global fixed income with EM allocation" }),
  bc("ETW", "Eaton Vance Corp", 9.43, 418900, "multi-asset", { aum: 2.2, dist: 8.5, lev: 0, pd: -5.8, ret1y: 12.4, ret90d: 3.2, vol1y: 13.6, unii: 0.12, distCov: 1.05, strategy: "Global equity income with options overlay" }),

  // Equity / Covered Call
  bc("PEO", "Adams Natural Resources Fund Inc", 25.61, 54900, "equity", { aum: 0.9, dist: 4.2, lev: 0, pd: -12.8, ret1y: 14.6, ret90d: 4.5, vol1y: 18.2, unii: 0.22, distCov: 1.35, strategy: "Natural resources equity long-only", sectorWeights: resourcesSectors, factorList: equityFactors }),
  bc("GDV", "Gabelli Dividend", 29.08, 79000, "equity", { aum: 2.8, dist: 5.8, lev: 0, pd: -8.4, ret1y: 15.2, ret90d: 3.8, vol1y: 14.6, unii: 0.18, distCov: 1.18, strategy: "Diversified equity with dividend focus" }),
  bc("GAM", "General American Investors", 60.99, 58800, "equity", { aum: 1.4, dist: 1.8, lev: 0, pd: -14.2, ret1y: 18.8, ret90d: 5.2, vol1y: 15.4, unii: 0.55, distCov: 1.82, strategy: "Concentrated large-cap equity" }),
  bc("TY", "Tri Continental Corp", 33.17, 33100, "equity", { aum: 1.6, dist: 3.2, lev: 0, pd: -12.6, ret1y: 16.4, ret90d: 4.1, vol1y: 14.8, unii: 0.38, distCov: 1.45, strategy: "Diversified large-cap equity with balanced approach" }),
  bc("FFA", "FT Enhanced Equity Income Fund", 21.86, 30100, "equity", { aum: 0.7, dist: 7.8, lev: 0, pd: -5.2, ret1y: 14.8, ret90d: 3.6, vol1y: 13.8, unii: 0.14, distCov: 1.08, strategy: "Enhanced equity income with covered calls" }),
  bc("ASG", "Liberty All-Star Growth Fund", 5.14, 373000, "equity", { aum: 0.8, dist: 8.2, lev: 0, pd: -8.8, ret1y: 20.2, ret90d: 5.8, vol1y: 16.4, unii: 0.08, distCov: 1.02, strategy: "Growth equity multi-manager approach" }),
  bc("ETJ", "Eaton Vance Risk-Managed Diversified Equity", 8.71, 140200, "equity", { aum: 1.2, dist: 8.4, lev: 0, pd: -7.6, ret1y: 11.2, ret90d: 2.8, vol1y: 10.8, unii: 0.06, distCov: 0.96, strategy: "Risk-managed equity with hedging overlay" }),
  bc("ETV", "Eaton Vance Corp", 14.65, 177200, "equity", { aum: 1.8, dist: 8.8, lev: 0, pd: -4.8, ret1y: 16.8, ret90d: 4.2, vol1y: 14.2, unii: 0.10, distCov: 1.04, strategy: "Tax-managed equity income with options" }),
  bc("EVT", "Eaton Vance Tax Advantaged Dividend", 26.39, 101300, "equity", { aum: 1.6, dist: 7.2, lev: 22, pd: -3.8, ret1y: 14.2, ret90d: 3.5, vol1y: 13.4, unii: 0.16, distCov: 1.12, strategy: "Tax-advantaged dividend equity with leverage" }),
  bc("BSTZ", "Blackrock Science and Technology Trust II", 22.75, 137600, "equity", { aum: 2.4, dist: 11.2, lev: 0, pd: -8.2, ret1y: 22.4, ret90d: 6.4, vol1y: 20.2, unii: -0.15, distCov: 0.78, strategy: "Global technology and science equity" }),
  bc("NBXG", "Neuberger Next Gen Connectivity Fund Inc", 13.40, 404700, "equity", { aum: 1.1, dist: 10.8, lev: 0, pd: -12.4, ret1y: 24.6, ret90d: 7.2, vol1y: 22.4, unii: -0.20, distCov: 0.72, strategy: "Next-gen connectivity and 5G equity" }),
  bc("QQQX", "Nuveen Nasdaq 100", 27.49, 81700, "equity", { aum: 1.5, dist: 7.4, lev: 0, pd: -2.4, ret1y: 19.8, ret90d: 5.5, vol1y: 17.8, unii: 0.12, distCov: 1.06, strategy: "Nasdaq-100 equity with covered call overlay" }),
  bc("BXMX", "Nuveen Equity Premium", 14.72, 134100, "equity", { aum: 1.3, dist: 7.6, lev: 0, pd: -4.2, ret1y: 13.4, ret90d: 3.2, vol1y: 12.8, unii: 0.10, distCov: 1.02, strategy: "S&P 500 buy-write strategy" }),
  bc("DIAX", "Nuveen Dow", 15.68, 73100, "equity", { aum: 0.8, dist: 6.8, lev: 0, pd: -5.6, ret1y: 11.8, ret90d: 2.8, vol1y: 12.4, unii: 0.14, distCov: 1.10, strategy: "DJIA buy-write strategy" }),
  bc("IDE", "VOYA Infrastructure Industrial", 14.05, 94700, "infrastructure", { aum: 0.5, dist: 7.8, lev: 12, pd: -6.8, ret1y: 13.2, ret90d: 3.4, vol1y: 14.8, unii: 0.08, distCov: 0.98, strategy: "Industrials and infrastructure equity" }),

  // Healthcare / Life Sciences
  bc("HQH", "Abrdn Healthcare Investors Fund", 19.89, 230200, "equity", { aum: 1.2, dist: 8.6, lev: 0, pd: -10.2, ret1y: 16.4, ret90d: 4.8, vol1y: 18.6, unii: 0.05, distCov: 0.92, strategy: "Healthcare and biotechnology equity" }),
  bc("HQL", "Abrdn Life Sciences Investors Fund", 16.98, 149300, "equity", { aum: 0.8, dist: 8.2, lev: 0, pd: -11.4, ret1y: 15.8, ret90d: 4.4, vol1y: 19.2, unii: 0.04, distCov: 0.88, strategy: "Life sciences and pharma equity" }),

  // Fixed Income / High Yield
  bc("DSL", "Doubleline Income Solutions Fund", 11.56, 630200, "fixed-income", { aum: 3.2, dist: 9.4, lev: 32, pd: -2.8, ret1y: 8.8, ret90d: 2.0, vol1y: 10.4, unii: -0.06, distCov: 0.92, strategy: "Multi-sector income with EM and MBS" }),
  bc("DHF", "Dreyfus High Yield Strategies Fund", 2.56, 202600, "fixed-income", { aum: 0.4, dist: 9.8, lev: 28, pd: -6.4, ret1y: 7.4, ret90d: 1.6, vol1y: 11.2, unii: -0.10, distCov: 0.84, strategy: "High yield corporate bonds" }),
  bc("EFR", "Eaton Vance Senior Floating-Rate Fund", 11.09, 56800, "fixed-income", { aum: 0.8, dist: 7.2, lev: 32, pd: -3.2, ret1y: 8.2, ret90d: 2.2, vol1y: 8.4, unii: 0.08, distCov: 1.04, strategy: "Senior floating-rate bank loans" }),
  bc("JGH", "Nuveen Global High Income Fund", 12.85, 112300, "fixed-income", { aum: 1.4, dist: 8.8, lev: 26, pd: -5.8, ret1y: 9.2, ret90d: 2.4, vol1y: 11.6, unii: -0.04, distCov: 0.94, strategy: "Global high income multi-sector" }),
  bc("HYI", "Western Asset High Yield Opportunity Fund Inc", 11.22, 68600, "fixed-income", { aum: 0.6, dist: 8.4, lev: 28, pd: -4.8, ret1y: 8.6, ret90d: 2.0, vol1y: 10.8, unii: -0.02, distCov: 0.96, strategy: "High yield corporate with leveraged exposure" }),
  bc("HIO", "Western Asset High", 3.81, 401300, "fixed-income", { aum: 1.8, dist: 7.8, lev: 24, pd: -7.2, ret1y: 7.8, ret90d: 1.8, vol1y: 9.8, unii: 0.02, distCov: 0.98, strategy: "High income opportunity fixed income" }),
  bc("BGX", "Blackstone Long-Short Credit Income Fund", 11.29, 75400, "fixed-income", { aum: 0.5, dist: 8.2, lev: 18, pd: -2.4, ret1y: 9.4, ret90d: 2.6, vol1y: 9.2, unii: 0.06, distCov: 1.02, strategy: "Long-short credit with hedged exposure" }),

  // Municipal Bonds
  bc("BFZ", "Blackrock California Muni Trust", 11.11, 50000, "fixed-income", { aum: 0.4, dist: 5.2, lev: 32, pd: -8.8, ret1y: 4.8, ret90d: 1.0, vol1y: 8.2, unii: 0.04, distCov: 1.08, strategy: "California municipal bonds", sectorWeights: muniSectors }),
  bc("PCQ", "Pimco California Muni", 9.12, 139200, "fixed-income", { aum: 0.8, dist: 5.8, lev: 38, pd: -4.2, ret1y: 5.4, ret90d: 1.2, vol1y: 9.4, unii: 0.02, distCov: 1.02, strategy: "California municipal income with high leverage", sectorWeights: muniSectors }),

  // Real Assets / REIT / Infrastructure
  bc("RA", "Brookfield Real Assets Income Fund Inc", 13.43, 177200, "infrastructure", { aum: 1.8, dist: 9.8, lev: 28, pd: -5.4, ret1y: 10.4, ret90d: 2.8, vol1y: 14.2, unii: -0.08, distCov: 0.88, strategy: "Real assets across infrastructure, real estate, and natural resources" }),
  bc("JRS", "Nuveen Real Estate Fund", 8.09, 84900, "reit", { aum: 0.7, dist: 8.2, lev: 24, pd: -7.6, ret1y: 11.8, ret90d: 3.4, vol1y: 16.4, unii: 0.06, distCov: 0.98, strategy: "Diversified US REIT equity income" }),
  bc("PDT", "John Hancock Premium Dividend Fund", 13.45, 103800, "equity", { aum: 0.9, dist: 7.4, lev: 28, pd: -6.8, ret1y: 12.6, ret90d: 3.8, vol1y: 13.8, unii: 0.10, distCov: 1.06, strategy: "Premium dividend equity and preferred" }),
  bc("NMAI", "Nuveen Multi-Asset Income Fund", 13.68, 153400, "multi-asset", { aum: 1.4, dist: 9.2, lev: 30, pd: -6.2, ret1y: 10.8, ret90d: 2.6, vol1y: 13.2, unii: -0.06, distCov: 0.90, strategy: "Multi-asset income across equity, credit, and real assets" }),
  bc("PDX", "Pimco Dynamic Income Strategy Fund", 20.11, 199100, "fixed-income", { aum: 2.6, dist: 10.8, lev: 42, pd: 2.4, ret1y: 9.6, ret90d: 2.2, vol1y: 12.4, unii: -0.14, distCov: 0.82, levType: "Reverse repos + TRS + interest rate swaps", strategy: "Dynamic multi-sector income with aggressive leverage" }),
  bc("WIW", "U.S Treasury Inflation Prot Secs Fd 2", 8.77, 277300, "fixed-income", { aum: 1.2, dist: 5.4, lev: 22, pd: -8.2, ret1y: 4.2, ret90d: 0.8, vol1y: 7.8, unii: 0.06, distCov: 1.12, strategy: "US TIPS and inflation-linked securities" }),

  // Convertible / Specialty
  bc("BCV", "Bancroft Convertible Fund", 23.39, 12500, "multi-asset", { aum: 0.2, dist: 4.8, lev: 0, pd: -10.4, ret1y: 12.8, ret90d: 3.2, vol1y: 14.2, unii: 0.18, distCov: 1.25, strategy: "Convertible securities focused", sectorWeights: convertibleSectors }),
  bc("NCZ", "Virtus Convertible & Income Fund II", 14.89, 38900, "multi-asset", { aum: 0.4, dist: 8.6, lev: 28, pd: -4.6, ret1y: 10.2, ret90d: 2.8, vol1y: 13.8, unii: -0.04, distCov: 0.94, strategy: "Convertible bonds and high income", sectorWeights: convertibleSectors }),
  bc("NIE", "Virtus Equity & Convertible Income Fund", 25.18, 37000, "multi-asset", { aum: 0.6, dist: 7.2, lev: 0, pd: -6.8, ret1y: 14.4, ret90d: 3.6, vol1y: 14.6, unii: 0.12, distCov: 1.08, strategy: "Equity and convertible income blend" }),
  bc("ZTR", "Virtus Total Return Fund Inc", 6.89, 374300, "multi-asset", { aum: 0.4, dist: 10.2, lev: 20, pd: -8.4, ret1y: 8.8, ret90d: 2.4, vol1y: 14.8, unii: -0.10, distCov: 0.82, strategy: "Total return multi-asset income" }),

  // Small Cap / Specialty Equity
  bc("RMT", "Royce Micro-Cap Trust", 11.98, 180400, "equity", { aum: 0.5, dist: 5.8, lev: 0, pd: -10.8, ret1y: 16.2, ret90d: 5.4, vol1y: 20.8, unii: 0.24, distCov: 1.32, strategy: "US micro-cap equity" }),
  bc("RVT", "Royce Small-Cap Trust Inc", 18.37, 370200, "equity", { aum: 1.2, dist: 5.4, lev: 0, pd: -9.6, ret1y: 15.8, ret90d: 5.2, vol1y: 19.4, unii: 0.22, distCov: 1.28, strategy: "US small-cap value equity" }),
  bc("GNT", "Gabelli Natural Resources Gold", 8.59, 78100, "equity", { aum: 0.3, dist: 4.6, lev: 0, pd: -14.8, ret1y: 18.4, ret90d: 6.8, vol1y: 24.2, unii: 0.30, distCov: 1.48, strategy: "Natural resources and gold equity", sectorWeights: resourcesSectors }),

  // Emerging Markets / International
  bc("CAF", "MS China A Share Fund", 17.98, 7300, "equity", { aum: 0.3, dist: 0, lev: 0, pd: -18.2, ret1y: 8.2, ret90d: 4.8, vol1y: 22.8, unii: 0, distCov: 0, strategy: "China A-share equity" }),
  bc("EDD", "MS Emerging Markets Domestic Debt Fund", 6.17, 465000, "fixed-income", { aum: 0.8, dist: 8.4, lev: 0, pd: -12.6, ret1y: 6.4, ret90d: 2.2, vol1y: 14.8, unii: 0.04, distCov: 0.92, strategy: "EM local currency sovereign debt" }),
  bc("TDF", "Templeton Dragon Fund", 11.60, 32800, "equity", { aum: 0.4, dist: 2.4, lev: 0, pd: -16.4, ret1y: 10.2, ret90d: 5.0, vol1y: 20.4, unii: 0.18, distCov: 1.42, strategy: "Greater China equity" }),

  // Activist / Special Situations
  bc("SABA", "Saba Capital Income & Opportunities Fund II", 8.01, 62300, "multi-asset", { aum: 0.4, dist: 7.8, lev: 0, pd: -6.4, ret1y: 8.8, ret90d: 2.0, vol1y: 11.4, unii: 0.04, distCov: 0.96, strategy: "Credit and special situations with activist overlay" }),
  bc("HGLB", "Highland Global Allocation Fund", 8.74, 30300, "multi-asset", { aum: 0.2, dist: 9.2, lev: 0, pd: -18.4, ret1y: 6.8, ret90d: 1.8, vol1y: 16.2, unii: -0.12, distCov: 0.78, strategy: "Global allocation with alternative assets" }),
]
