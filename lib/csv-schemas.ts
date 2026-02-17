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
// Ported from cef_ingest.py: fuzzy column resolution, delimiter detection,
// and common column-name candidate matching.

/** Detect delimiter: try comma, tab, pipe, semicolon */
function detectDelimiter(headerLine: string): string {
  const candidates = [",", "\t", "|", ";"]
  let best = ","
  let bestCount = 0
  for (const d of candidates) {
    const count = headerLine.split(d).length
    if (count > bestCount) { bestCount = count; best = d }
  }
  return best
}

/** Split CSV handling quoted values and varying delimiters */
function splitCsvLines(csv: string): { headers: string[]; rows: string[][]; delimiter: string } {
  const lines = csv.trim().replace(/\r\n/g, "\n").split("\n").filter(l => l.trim() !== "")
  if (lines.length < 2) return { headers: [], rows: [], delimiter: "," }
  const delimiter = detectDelimiter(lines[0])
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ""))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""))
    while (vals.length < headers.length) vals.push("")
    return vals
  })
  return { headers, rows, delimiter }
}

/**
 * Fuzzy column resolver -- matches CSV headers to canonical column names.
 * Ported from Python cef_ingest.py normalize_* functions.
 * Returns a map: canonicalName -> column index in the CSV.
 */
function resolveColumns(
  headers: string[],
  candidates: Record<string, string[]>,
): Record<string, number> {
  const resolved: Record<string, number> = {}
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""))

  for (const [canonical, aliases] of Object.entries(candidates)) {
    const lowerAliases = aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ""))
    const idx = lowerHeaders.findIndex(h => lowerAliases.includes(h))
    if (idx !== -1) {
      resolved[canonical] = idx
    }
  }
  return resolved
}

function num(val: string | undefined, fallback = 0): number {
  if (val === undefined || val === "") return fallback
  // Strip $ and % and commas
  const cleaned = val.replace(/[$%,]/g, "").trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? fallback : n
}

function str(val: string | undefined, fallback = ""): string {
  return val?.trim() || fallback
}

// ─── Column candidate maps (from cef_ingest.py) ────────────────────────────

const UNIVERSE_COLUMNS: Record<string, string[]> = {
  Ticker: ["ticker", "symbol", "fund_ticker"],
  AUM: ["aum", "total_assets", "net_assets", "totalassets"],
  ADV: ["adv", "avg_daily_volume", "avgdailyvolume", "volume"],
  "1y_return": ["1y_return", "1yreturn", "return1y", "annualreturn", "total_return_1y"],
  "90d_return": ["90d_return", "90dreturn", "return90d", "return_90d", "3m_return"],
  avg_premium_discount: ["avg_premium_discount", "avgpremiumdiscount", "premium_discount", "premiumdiscount", "pd"],
  yield: ["yield", "distribution_yield", "dist_yield", "divyield"],
  realized_vol: ["realized_vol", "realizedvol", "volatility", "vol_1y", "annualvol"],
  holdings_date: ["holdings_date", "holdingsdate", "as_of_date", "asofdate", "report_date"],
  UNII: ["unii", "undistributed_nii", "undistributednii"],
  distribution_coverage: ["distribution_coverage", "distributioncoverage", "dist_coverage", "coverage"],
}

const HOLDINGS_COLUMNS: Record<string, string[]> = {
  Date: ["date", "as_of_date", "asofdate", "holdings_date", "reportdate"],
  Ticker: ["ticker", "symbol", "holding_ticker"],
  Issuer: ["issuer", "name", "security_name", "securityname", "description", "holding_name"],
  Shares: ["shares", "quantity", "qty", "shares_held", "position"],
  MarketValueUSD: ["marketvalueusd", "market_value", "marketvalue", "mv", "value", "market_value_usd", "mkt_val"],
  "Weight%": ["weight", "weight%", "weightpct", "pct_of_fund", "portfolio_weight", "alloc"],
}

const NAV_COLUMNS: Record<string, string[]> = {
  Date: ["date", "trade_date", "tradedate", "pricing_date"],
  NAV: ["nav", "net_asset_value", "navpershare", "nav_per_share"],
  MarketPrice: ["marketprice", "market_price", "price", "close", "closing_price"],
  Volume: ["volume", "shares_traded", "daily_volume", "tradingvolume"],
}

const DISTRIBUTION_COLUMNS: Record<string, string[]> = {
  ExDate: ["exdate", "ex_date", "ex_div_date", "record_date", "date"],
  Amount: ["amount", "distribution", "div_amount", "per_share", "rate"],
  Type: ["type", "dist_type", "distribution_type", "category", "income_type"],
}

/** Map common distribution type aliases to canonical enum */
function normalizeDistType(raw: string): DistributionRow["type"] {
  const lower = raw.toLowerCase().trim()
  const map: Record<string, DistributionRow["type"]> = {
    income: "income",
    ordinary: "income",
    "ordinary income": "income",
    dividend: "income",
    interest: "income",
    roc: "roc",
    "return of capital": "roc",
    "capital gain": "capital-gain",
    "capital-gain": "capital-gain",
    "long-term capital gain": "capital-gain",
    "short-term capital gain": "capital-gain",
    ltcg: "capital-gain",
    stcg: "capital-gain",
    mixed: "mixed",
    special: "mixed",
  }
  return map[lower] ?? "income"
}

// ─── Barchart CSV Auto-Detection & Normalization ────────────────────────────
// Ported from barchart_to_universe.py: detects raw Barchart watchlist exports
// (columns: Symbol,Name,Last,Change,%Change,Open,High,Low,Volume,Time) and
// normalizes them to the canonical universe_cef_metrics.csv schema before parsing.
// Barchart CSV only provides Ticker (from Symbol) and ADV proxy (from Volume);
// all other metrics are left as 0/empty for enrichment merge later.

const BARCHART_SIGNATURE = ["symbol", "name", "last", "change"]

/**
 * Detect whether a CSV is a raw Barchart export by checking the first 4 columns.
 * Returns true if the header matches the Barchart signature.
 */
export function isBarchartFormat(csv: string): boolean {
  const firstLine = csv.trim().split("\n")[0] ?? ""
  const delimiter = detectDelimiter(firstLine)
  const headers = firstLine.split(delimiter).map(h =>
    h.trim().replace(/^["']|["']$/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
  )
  return BARCHART_SIGNATURE.every(sig => headers.includes(sig))
}

/**
 * Convert a Barchart CSV to canonical universe_cef_metrics.csv format.
 * Extracts Ticker from Symbol and uses Volume as ADV proxy.
 * All enrichment fields (AUM, returns, P/D, yield, vol, UNII, coverage) default to 0.
 * The caller can merge enrichment data afterward.
 */
export function normalizeBarchartToUniverse(barchartCsv: string): string {
  const { headers, rows } = splitCsvLines(barchartCsv)
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""))

  const symbolIdx = lowerHeaders.indexOf("symbol")
  const volumeIdx = lowerHeaders.indexOf("volume")

  if (symbolIdx === -1) {
    return "Ticker,AUM,ADV,1y_return,90d_return,avg_premium_discount,yield,realized_vol,holdings_date,UNII,distribution_coverage\n"
  }

  const canonicalHeader = "Ticker,AUM,ADV,1y_return,90d_return,avg_premium_discount,yield,realized_vol,holdings_date,UNII,distribution_coverage"
  const today = new Date().toISOString().slice(0, 10)
  const lines = [canonicalHeader]

  for (const row of rows) {
    const ticker = str(row[symbolIdx]).toUpperCase()
    if (!ticker) continue
    // Volume from Barchart as ADV proxy (strip commas)
    const adv = volumeIdx !== -1 ? num(row[volumeIdx]) : 0
    // All enrichment fields default to 0 / today
    lines.push(`${ticker},0,${adv},0,0,0,0,0,${today},0,1`)
  }

  return lines.join("\n")
}

/**
 * Merge enrichment data into a pre-parsed universe metrics array.
 * Each enrichment file is a 2-column CSV: Ticker,<value>.
 * Matches by ticker and fills in the specified field.
 */
export function mergeEnrichment(
  base: UniverseMetricsRow[],
  enrichmentCsv: string,
  targetField: keyof Omit<UniverseMetricsRow, "ticker" | "holdingsDate">,
): UniverseMetricsRow[] {
  const { headers, rows } = splitCsvLines(enrichmentCsv)
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""))
  const tickerIdx = lowerHeaders.findIndex(h => h === "ticker" || h === "symbol")
  const valIdx = lowerHeaders.findIndex((_, i) => i !== tickerIdx)

  if (tickerIdx === -1 || valIdx === -1) return base

  const lookup = new Map<string, number>()
  for (const row of rows) {
    const ticker = str(row[tickerIdx]).toUpperCase()
    if (ticker) lookup.set(ticker, num(row[valIdx]))
  }

  return base.map(r => {
    const val = lookup.get(r.ticker)
    if (val !== undefined) {
      return { ...r, [targetField]: val }
    }
    return r
  })
}

// ─── Schema Parsers ─────────────────────────────────────────────────────────

/**
 * Parse universe metrics CSV. Auto-detects Barchart format and normalizes first.
 */
export function parseUniverseMetrics(csv: string): ParseResult<UniverseMetricsRow> {
  // Auto-detect Barchart format and normalize
  const normalizedCsv = isBarchartFormat(csv) ? normalizeBarchartToUniverse(csv) : csv
  const errors: ParseError[] = []
  const data: UniverseMetricsRow[] = []
  const { headers, rows } = splitCsvLines(normalizedCsv)
  const wasBarchart = isBarchartFormat(csv)
  if (wasBarchart) errors.push({ row: 0, column: "format", message: "Auto-detected Barchart format; normalized to canonical schema. Enrichment fields default to 0." })
  const col = resolveColumns(headers, UNIVERSE_COLUMNS)

  // Warn about unresolved columns
  for (const key of Object.keys(UNIVERSE_COLUMNS)) {
    if (col[key] === undefined) errors.push({ row: 1, column: key, message: `Column not found (tried: ${UNIVERSE_COLUMNS[key].join(", ")})` })
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rn = i + 2
    const ticker = str(r[col.Ticker ?? 0])
    if (!ticker) { errors.push({ row: rn, column: "Ticker", message: "Missing ticker" }); continue }

    const row: UniverseMetricsRow = {
      ticker: ticker.toUpperCase(),
      aum: num(r[col.AUM ?? 1]),
      adv: num(r[col.ADV ?? 2]),
      return1Y: num(r[col["1y_return"] ?? 3]),
      return90d: num(r[col["90d_return"] ?? 4]),
      avgPremiumDiscount: num(r[col.avg_premium_discount ?? 5]),
      yield: num(r[col.yield ?? 6]),
      realizedVol: num(r[col.realized_vol ?? 7]),
      holdingsDate: str(r[col.holdings_date ?? 8], new Date().toISOString().slice(0, 10)),
      unii: num(r[col.UNII ?? 9]),
      distributionCoverage: num(r[col.distribution_coverage ?? 10], 1),
    }
    if (row.aum <= 0) errors.push({ row: rn, column: "AUM", message: `Invalid AUM: ${r[col.AUM ?? 1]}` })
    data.push(row)
  }

  return { data, errors, rowCount: rows.length, validCount: data.length }
}

export function parseHoldings(csv: string): ParseResult<HoldingsRow> {
  const errors: ParseError[] = []
  const data: HoldingsRow[] = []
  const { headers, rows } = splitCsvLines(csv)
  const col = resolveColumns(headers, HOLDINGS_COLUMNS)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const ticker = str(r[col.Ticker ?? 1])
    if (!ticker) errors.push({ row: i + 2, column: "Ticker", message: "Missing ticker" })
    data.push({
      date: str(r[col.Date ?? 0]),
      ticker,
      issuer: str(r[col.Issuer ?? 2]),
      shares: num(r[col.Shares ?? 3]),
      marketValueUsd: num(r[col.MarketValueUSD ?? 4]),
      weightPct: num(r[col["Weight%"] ?? 5]),
    })
  }

  return { data, errors, rowCount: rows.length, validCount: data.length }
}

export function parseNavPrice(csv: string): ParseResult<NavPriceRow> {
  const errors: ParseError[] = []
  const data: NavPriceRow[] = []
  const { headers, rows } = splitCsvLines(csv)
  const col = resolveColumns(headers, NAV_COLUMNS)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const nav = num(r[col.NAV ?? 1])
    if (nav <= 0) errors.push({ row: i + 2, column: "NAV", message: `Invalid NAV: ${r[col.NAV ?? 1]}` })
    data.push({
      date: str(r[col.Date ?? 0]),
      nav,
      marketPrice: num(r[col.MarketPrice ?? 2]),
      volume: num(r[col.Volume ?? 3]),
    })
  }

  return { data, errors, rowCount: rows.length, validCount: data.length }
}

export function parseDistributions(csv: string): ParseResult<DistributionRow> {
  const errors: ParseError[] = []
  const data: DistributionRow[] = []
  const { headers, rows } = splitCsvLines(csv)
  const col = resolveColumns(headers, DISTRIBUTION_COLUMNS)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const amt = num(r[col.Amount ?? 1])
    if (amt <= 0) errors.push({ row: i + 2, column: "Amount", message: `Invalid amount: ${r[col.Amount ?? 1]}` })
    const rawType = str(r[col.Type ?? 2], "income")
    data.push({ exDate: str(r[col.ExDate ?? 0]), amount: amt, type: normalizeDistType(rawType) })
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
