// Compatibility barrel — types, formatters, and scoring used by dashboard components.
export type { CEFProfile, CEFOverview, CEFUniverseSnapshot } from "./cef-types"
export {
  formatCurrency,
  formatPercent,
  formatBps,
  PILLAR_WEIGHTS,
  PILLAR_LABELS,
  type FundRanking,
  type PillarScores,
} from "./cef-types"
export { computeRankings } from "./cef-scoring"
export { CEF_TICKERS } from "./cef-tickers"
