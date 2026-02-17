// ─── Canonical CSV Schemas ──────────────────────────────────────────────────
// Types and parsers for the 4 pipeline input CSV files.
// Matching column headers from universe_cef_metrics.csv spec.

// ─── Row Types ──────────────────────────────────────────────────────────────

export interface UniverseMetricsRow {
  ticker: string
  aum: number
  adv: number
  return1Y: number
  return90d: number
  avgPremiumDiscount: number
  yield: number
  realizedVol: number
  holdingsDate: string
  unii: number
  distributionCoverage: number
}

export interface HoldingsRow {
  date: string
  ticker: string
  issuer: string
  shares: number
  marketValueUsd: number
  weightPct: number
}

export interface NavPriceRow {
  date: string
  nav: number
  marketPrice: number
  volume: number
}

export interface DistributionRow {
  exDate: string
  amount: number
  type: "income" | "roc" | "capital-gain" | "mixed"
}

// ─── Parse Result ───────────────────────────────────────────────────────────

export interface ParseError {
  row: number
  column: string
  message: string
}

export interface ParseResult<T> {
  data: T[]
  errors: ParseError[]
  rowCount: number
  validCount: number
}

// ─── Generic helpers ────────────────────────────────────────────────────────

function splitCsvLines(csv: string): string[][] {
  const lines = csv.trim().split("\n")
  if (lines.length < 2) return []
  const headerCount = lines[0].split(",").length
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim())
    while (vals.length < headerCount) vals.push("")
    return vals
  })
}

function num(val: string, fallback = 0): number {
  const n = parseFloat(val)
  return isNaN(n) ? fallback : n
}

// ─── Schema Parsers ─────────────────────────────────────────────────────────

export function parseUniverseMetrics(csv: string): ParseResult<UniverseMetricsRow> {
  const errors: ParseError[] = []
  const data: UniverseMetricsRow[] = []
  const rows = splitCsvLines(csv)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rn = i + 2
    const ticker = r[0]
    if (!ticker) { errors.push({ row: rn, column: "Ticker", message: "Missing ticker" }); continue }

    const row: UniverseMetricsRow = {
      ticker: ticker.toUpperCase(),
      aum: num(r[1]),
      adv: num(r[2]),
      return1Y: num(r[3]),
      return90d: num(r[4]),
      avgPremiumDiscount: num(r[5]),
      yield: num(r[6]),
      realizedVol: num(r[7]),
      holdingsDate: r[8] || new Date().toISOString().slice(0, 10),
      unii: num(r[9]),
      distributionCoverage: num(r[10], 1),
    }
    if (row.aum <= 0) errors.push({ row: rn, column: "AUM", message: `Invalid AUM: ${r[1]}` })
    data.push(row)
  }

  return { data, errors, rowCount: rows.length, validCount: data.length }
}

export function parseHoldings(csv: string): ParseResult<HoldingsRow> {
  const errors: ParseError[] = []
  const data: HoldingsRow[] = []
  const rows = splitCsvLines(csv)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r[1]) errors.push({ row: i + 2, column: "Ticker", message: "Missing ticker" })
    data.push({ date: r[0] || "", ticker: r[1] || "", issuer: r[2] || "", shares: num(r[3]), marketValueUsd: num(r[4]), weightPct: num(r[5]) })
  }

  return { data, errors, rowCount: rows.length, validCount: data.length }
}

export function parseNavPrice(csv: string): ParseResult<NavPriceRow> {
  const errors: ParseError[] = []
  const data: NavPriceRow[] = []
  const rows = splitCsvLines(csv)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const nav = num(r[1])
    if (nav <= 0) errors.push({ row: i + 2, column: "NAV", message: `Invalid NAV: ${r[1]}` })
    data.push({ date: r[0] || "", nav, marketPrice: num(r[2]), volume: num(r[3]) })
  }

  return { data, errors, rowCount: rows.length, validCount: data.length }
}

export function parseDistributions(csv: string): ParseResult<DistributionRow> {
  const errors: ParseError[] = []
  const data: DistributionRow[] = []
  const rows = splitCsvLines(csv)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const amt = num(r[1])
    if (amt <= 0) errors.push({ row: i + 2, column: "Amount", message: `Invalid amount: ${r[1]}` })
    const rawType = (r[2] || "income").toLowerCase()
    const type = (["income", "roc", "capital-gain", "mixed"].includes(rawType) ? rawType : "income") as DistributionRow["type"]
    data.push({ exDate: r[0] || "", amount: amt, type })
  }

  return { data, errors, rowCount: rows.length, validCount: data.length }
}

// ─── Schema Metadata ────────────────────────────────────────────────────────

export const CSV_SCHEMAS = [
  { id: "universe_metrics" as const, filename: "universe_cef_metrics.csv", columns: "Ticker,AUM,ADV,1y_return,90d_return,avg_premium_discount,yield,realized_vol,holdings_date,UNII,distribution_coverage", description: "Universe-level metrics for all candidate CEFs" },
  { id: "holdings" as const, filename: "{TICKER}_holdings.csv", columns: "Date,Ticker,Issuer,Shares,MarketValueUSD,Weight%", description: "Per-fund holdings snapshot" },
  { id: "nav_price" as const, filename: "{TICKER}_nav_price_2y.csv", columns: "Date,NAV,MarketPrice,Volume", description: "2-year daily NAV and market price" },
  { id: "distributions" as const, filename: "{TICKER}_distributions.csv", columns: "ExDate,Amount,Type", description: "Distribution history with type classification" },
] as const
