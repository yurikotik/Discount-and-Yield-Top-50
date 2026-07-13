// Re-export core analytics types used across the dashboard and data pipeline.
export type {
  Holding,
  SectorExposure,
  FactorExposure,
  ReturnDecomposition,
  NAVPricePoint,
  DistributionRecord,
  PerformanceMetrics,
  RiskMetrics,
  FundMetricVector,
  ZScoreVector,
  PSIResult,
  FundRanking,
  PillarScores,
  LeverageProbe,
  DriftMetric,
  RegimeShift,
  DriftRegimeData,
  LiquidityData,
  HoldingLiquidity,
  ConfidenceData,
} from "./utf-data"

export { PILLAR_WEIGHTS, PILLAR_LABELS, formatCurrency, formatPercent, formatBps } from "./utf-data"

export interface CEFOverview {
  ticker: string
  name: string
  sponsor: string
  strategy: string
  aum: number
  adv: number
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
  holdings: import("./utf-data").Holding[]
  sectors: import("./utf-data").SectorExposure[]
  factors: import("./utf-data").FactorExposure[]
  returnDecomposition: import("./utf-data").ReturnDecomposition[]
  navHistory: import("./utf-data").NAVPricePoint[]
  distributions: import("./utf-data").DistributionRecord[]
  performance: import("./utf-data").PerformanceMetrics
  risk: import("./utf-data").RiskMetrics
  caveats: string[]
  leverageProbe: import("./utf-data").LeverageProbe
  driftRegime: import("./utf-data").DriftRegimeData
  liquidity: import("./utf-data").LiquidityData
  confidence: import("./utf-data").ConfidenceData
}

export interface CEFUniverseSnapshot {
  version: 1
  fetchedAt: string
  source: "cefconnect"
  tickers: string[]
  profiles: CEFProfile[]
  rankings: import("./utf-data").FundRanking[]
  errors: Array<{ ticker: string; message: string }>
}
