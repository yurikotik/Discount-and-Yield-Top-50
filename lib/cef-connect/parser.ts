export interface ParsedTableRow {
  label: string
  value: string
}

export interface ParsedHoldingRow {
  name: string
  valueUsd: number
  weight: number
}

export interface ParsedFundHtml {
  sponsor: string
  categoryLabel: string
  advShares: number
  advUsd: number
  inceptionDate: string
  totalAssetsUsd: number
  leverageRatio: number
  leverageType: string
  managementFee: number
  expenseRatio: number
  holdingsDate: string
  sectors: ParsedTableRow[]
  holdings: ParsedHoldingRow[]
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

function parseMoney(value: string): number {
  const cleaned = value.replace(/[$,]/g, "").replace(/M$/i, "").trim()
  const num = Number.parseFloat(cleaned)
  if (Number.isNaN(num)) return 0
  if (/M$/i.test(value.replace(/[$,]/g, ""))) return num * 1e6
  if (value.includes("M")) return num * 1e6
  if (value.includes("B")) return num * 1e9
  return num
}

function parsePercent(value: string): number {
  const num = Number.parseFloat(value.replace("%", "").trim())
  return Number.isNaN(num) ? 0 : num
}

function extractTableRows(html: string, tableIdFragment: string): ParsedTableRow[] {
  const tableMatch = html.match(new RegExp(`id="${tableIdFragment}"[\\s\\S]*?<\\/table>`, "i"))
  if (!tableMatch) return []
  const rows: ParsedTableRow[] = []
  const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="[^"]*right-align[^"]*"[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(tableMatch[0]))) {
    const label = decodeHtml(match[1].replace(/<[^>]+>/g, ""))
    const value = decodeHtml(match[2].replace(/<[^>]+>/g, ""))
    if (label && value) rows.push({ label, value })
  }
  return rows
}

function extractLabelValue(html: string, label: string): string | null {
  const regex = new RegExp(
    `<td[^>]*>\\s*(?:<span[^>]*>)?\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?<\\/td>\\s*<td[^>]*class="[^"]*right-align[^"]*"[^>]*>([\\s\\S]*?)<\\/td>`,
    "i",
  )
  const match = html.match(regex)
  if (!match) return null
  return decodeHtml(match[1].replace(/<[^>]+>/g, ""))
}

function extractAsOfDate(html: string, labelIdFragment: string): string | null {
  const match = html.match(new RegExp(`id="${labelIdFragment}"[^>]*>([^<]+)<`, "i"))
  return match ? decodeHtml(match[1].replace(/^As of\s*/i, "")) : null
}

function extractSponsor(html: string): string {
  const match = html.match(/Fund Sponsor<\/strong><br\s*\/?>\s*([^<]+)/i)
  return match ? decodeHtml(match[1]) : "Unknown"
}

function extractHoldings(html: string): ParsedHoldingRow[] {
  const tableMatch = html.match(/id="ContentPlaceHolder1_cph_main_cph_main_ucPortChar_TopHoldingsGrid"[\s\S]*?<\/table>/i)
  if (!tableMatch) return []
  const rows: ParsedHoldingRow[] = []
  const rowRegex =
    /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="[^"]*right-align[^"]*"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="[^"]*right-align[^"]*"[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(tableMatch[0]))) {
    const name = decodeHtml(match[1].replace(/<[^>]+>/g, ""))
    const valueText = decodeHtml(match[2].replace(/<[^>]+>/g, ""))
    const weightText = decodeHtml(match[3].replace(/<[^>]+>/g, ""))
    if (!name || name.toLowerCase().includes("holding")) continue
    const weight = parsePercent(weightText)
    if (weight <= 0) continue
    rows.push({
      name,
      valueUsd: parseMoney(valueText),
      weight,
    })
  }
  return rows.slice(0, 15)
}

function extractSectors(html: string): ParsedTableRow[] {
  const rows = extractTableRows(html, "ContentPlaceHolder1_cph_main_cph_main_ucPortChar_pcSector_SectorGrid")
  const skip = new Set(["defensive (super sector)", "sensitive (super sector)", "cyclical (super sector)", "corporate (super sector)"])
  return rows.filter((row) => !skip.has(row.label.toLowerCase())).slice(0, 8)
}

function inferLeverageType(holdings: ParsedHoldingRow[], leverageRatio: number): string {
  const names = holdings.map((h) => h.name.toLowerCase()).join(" ")
  const instruments: string[] = []
  if (/irs|swap|ccpois|flo|fix/.test(names)) instruments.push("Interest rate swaps")
  if (/trs|total return/.test(names)) instruments.push("Total Return Swaps")
  if (/option|call|put|overwrite/.test(names)) instruments.push("Options Overlay")
  if (/repo|reverse/.test(names)) instruments.push("Reverse Repos")
  if (leverageRatio > 0 && instruments.length === 0) instruments.push("Credit facility / structural leverage")
  if (leverageRatio <= 0) return "None"
  return instruments.join(" + ")
}

export function parseFundHtml(html: string): ParsedFundHtml {
  const holdings = extractHoldings(html)
  const leverageRatio = parsePercent(extractLabelValue(html, "Effective Leverage \\(%\\):") ?? "0")
  const totalAssetsText =
    extractLabelValue(html, "Total Investment Exposure:") ??
    extractLabelValue(html, "Total Common Assets:") ??
    "0"
  const advShares = Number.parseFloat((extractLabelValue(html, "Average Daily Volume \\(shares\\):") ?? "0").replace(/,/g, ""))
  const advUsd = parseMoney(extractLabelValue(html, "Average Daily Volume \\(USD\\):") ?? "0")
  const managementFee = parsePercent(extractLabelValue(html, "Management Fees") ?? "0")
  const expenseRatio = parsePercent(
    html.match(/Total:<\/td><td[^>]*>[\s\S]*?summary-line">\s*([\d.]+%)/i)?.[1] ?? "0",
  )

  return {
    sponsor: extractSponsor(html),
    categoryLabel: extractLabelValue(html, "Category:") ?? "Unknown",
    advShares: Number.isNaN(advShares) ? 0 : advShares,
    advUsd,
    inceptionDate: extractLabelValue(html, "Inception Date:") ?? "",
    totalAssetsUsd: parseMoney(totalAssetsText),
    leverageRatio,
    leverageType: inferLeverageType(holdings, leverageRatio),
    managementFee,
    expenseRatio,
    holdingsDate:
      extractAsOfDate(html, "ContentPlaceHolder1_cph_main_cph_main_ucPortChar_HoldingsAsOfLabel") ??
      extractAsOfDate(html, "ContentPlaceHolder1_cph_main_cph_main_ucPortChar_pcSector_SectorAsOfLabel") ??
      new Date().toISOString().slice(0, 10),
    sectors: extractSectors(html),
    holdings,
  }
}

function parseDisplayDate(input: string): string {
  const d = new Date(input)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  }
  return input
}

export function toIsoDate(input: string): string {
  const d = new Date(input)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  const m = input.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const [, mm, dd, yyyy] = m
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  return new Date().toISOString().slice(0, 10)
}

export { parseDisplayDate }
