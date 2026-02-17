"use client"

import { useState } from "react"
import {
  type CEFProfile,
  type SyntheticHedgeFund,
  formatCurrency,
  multiCefHerculesPrompt,
} from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  FileText,
  FileJson,
  File,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
} from "lucide-react"

// ─── Helpers ────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateMultiCSV(profiles: CEFProfile[]): string {
  const lines = [
    "Ticker,Fund,Rank,Holding,Sector,Weight(%),MarketValue($),Country,ProxyBasket1,Corr90d,TE(%),Confidence",
  ]
  profiles.forEach((p) => {
    const basket = p.proxyBaskets[p.selectedProxyIndex]
    p.holdings.slice(0, 10).forEach((h, i) => {
      lines.push(
        `${p.overview.ticker},"${p.overview.name}",${i + 1},"${h.name}",${h.sector},${h.weight},${h.marketValue},${h.country},"${basket?.tickers.join("/")}",${basket?.correlation.toFixed(3)},${basket?.trackingError.toFixed(2)},${p.confidence}`
      )
    })
  })
  return lines.join("\n")
}

function generateMultiJSON(profiles: CEFProfile[], syntheticFund: SyntheticHedgeFund): string {
  const data = {
    platform: "Multi-CEF Analysis Dashboard",
    generatedAt: "2026-02-17",
    totalNotional: syntheticFund.totalNotional,
    weightingRule: syntheticFund.weightingRule,
    portfolioMetrics: syntheticFund.portfolioMetrics,
    funds: profiles.map((p) => {
      const basket = p.proxyBaskets[p.selectedProxyIndex]
      return {
        ticker: p.overview.ticker,
        name: p.overview.name,
        aum: p.overview.aum,
        premiumDiscount: p.overview.premiumDiscount,
        distributionRate: p.overview.distributionRate,
        leverageRatio: p.overview.leverageRatio,
        confidence: p.confidence,
        bestProxy: {
          tickers: basket?.tickers,
          weights: basket?.weights,
          correlation: basket?.correlation,
          trackingError: basket?.trackingError,
        },
        hedgeStats: {
          hedgeRatio: p.hedgeSimulation.hedgeRatio,
          annualizedReturn: p.hedgeSimulation.annualizedReturn,
          maxDrawdown: p.hedgeSimulation.maxDrawdown,
          realizedTrackingError: p.hedgeSimulation.realizedTrackingError,
        },
        factors: p.factors.map((f) => ({
          factor: f.factor,
          exposure: f.exposure,
          tStat: f.tStat,
        })),
        leverageProbe: {
          flagged: p.leverageProbe.leverageDetected,
          leverageEstimate: p.leverageProbe.estimatedLeverage,
          unexplainedReturn: p.leverageProbe.unexplainedReturn,
        },
        caveats: p.caveats,
      }
    }),
    syntheticFund: {
      allocations: syntheticFund.allocations.map((a) => ({
        ticker: a.ticker,
        weight: a.weight,
        notional: a.notional,
        hedgeRatio: a.hedgeRatio,
        correlation: a.correlation,
        trackingError: a.trackingError,
        slippage: a.slippage,
        borrowCost: a.borrowCost,
      })),
      factorConcentration: syntheticFund.factorConcentration,
    },
  }
  return JSON.stringify(data, null, 2)
}

function generateMultiMarkdown(profiles: CEFProfile[], syntheticFund: SyntheticHedgeFund): string {
  const m = syntheticFund.portfolioMetrics
  let md = `# Multi-CEF Analysis Report - Advisor Explainer
## Synthetic Hedge Fund: 10 Closed-End Funds
*As of 2026-02-17 | $${(syntheticFund.totalNotional / 1e6).toFixed(0)}M Total Notional | ${syntheticFund.weightingRule} Weighting*

---

### Portfolio Overview

| Metric | Value |
|--------|-------|
| Total Notional | ${formatCurrency(syntheticFund.totalNotional)} |
| Weighted Correlation | ${m.weightedCorrelation.toFixed(4)} |
| Portfolio Tracking Error | ${m.portfolioTrackingError.toFixed(2)}% |
| Diversification Ratio | ${m.diversificationRatio.toFixed(2)}x |
| Aggregate Max Drawdown | ${formatCurrency(m.aggregateMaxDrawdown)} |
| Total Borrow Cost | ${formatCurrency(m.totalBorrowCost)} |
| Net Beta | ${m.netBeta.toFixed(4)} |

### Per-Fund Summary

| Ticker | AUM | P/D | Dist | Corr | TE | Conf |
|--------|-----|-----|------|------|-----|------|
`

  profiles.forEach((p) => {
    const o = p.overview
    const basket = p.proxyBaskets[p.selectedProxyIndex]
    md += `| ${o.ticker} | $${o.aum.toFixed(1)}B | ${o.premiumDiscount >= 0 ? "+" : ""}${o.premiumDiscount.toFixed(1)}% | ${o.distributionRate}% | ${basket?.correlation.toFixed(3)} | ${basket?.trackingError.toFixed(2)}% | ${p.confidence} |\n`
  })

  md += `
### Key Findings

**1. Diversification Benefit**
The ${syntheticFund.weightingRule} weighting across 10 distinct CEF strategies yields a diversification ratio of ${m.diversificationRatio.toFixed(2)}x, significantly reducing portfolio-level tracking error to ${m.portfolioTrackingError.toFixed(2)}% versus individual fund averages.

**2. Leverage Concentration**
${profiles.filter((p) => p.leverageProbe.leverageDetected).length} of 10 funds show signs of undisclosed leverage or derivative overlays. The aggregate net beta of ${m.netBeta.toFixed(4)} indicates the hedge portfolio is approximately market-neutral.

**3. Execution Considerations**
Total estimated borrow cost is ${formatCurrency(m.totalBorrowCost)} annually. Slippage estimates total ${formatCurrency(m.totalSlippage)} for initial implementation. Execution should be staggered across 2-5 days per fund depending on liquidity.

### Top 3 Risks
1. **Distribution Policy Changes**: Multiple funds trade at premiums partly justified by distribution rates. Cuts would compress premiums and widen basis risk.
2. **Disclosure Lag**: Holdings are reported quarterly with 30-60 day lag. Actual portfolios may diverge from the proxy baskets.
3. **Cross-Fund Correlation Spike**: During market stress, residual correlations between hedge positions may increase, reducing diversification benefit.

---
*Generated by Multi-CEF Analysis Dashboard | Not investment advice*
`
  return md
}

// ─── Input Checklist ────────────────────────────────────────────────────────

interface ChecklistItem {
  item: string
  source: string
  status: "ready" | "pending"
  perFund: boolean
}

const inputChecklist: ChecklistItem[] = [
  { item: "Holdings CSVs (latest quarterly)", source: "Fund sponsor websites", status: "ready", perFund: true },
  { item: "2-Year Daily NAV & Market Price", source: "CEF Connect / Yahoo Finance", status: "ready", perFund: true },
  { item: "Distribution History", source: "Fund sponsors / Yahoo Finance", status: "ready", perFund: true },
  { item: "Premium/Discount History (2yr)", source: "CEF Connect", status: "ready", perFund: true },
  { item: "Target Notional ($500M total)", source: "User-defined", status: "ready", perFund: false },
  { item: "Weighting Rule Selection", source: "User-defined", status: "ready", perFund: false },
  { item: "ETF Universe (liquid, low-cost)", source: "ETF.com / Bloomberg", status: "ready", perFund: false },
  { item: "Borrow Rate Estimates", source: "Prime broker / IBKR", status: "ready", perFund: false },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  profiles: CEFProfile[]
  syntheticFund: SyntheticHedgeFund
  selectedProfile: CEFProfile
}

export function ExportPanel({ profiles, syntheticFund, selectedProfile }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDownload = (type: string) => {
    setDownloading(type)
    setTimeout(() => {
      switch (type) {
        case "csv":
          downloadFile(generateMultiCSV(profiles), "multi-cef-holdings-proxy.csv", "text/csv")
          break
        case "json":
          downloadFile(generateMultiJSON(profiles, syntheticFund), "multi-cef-analysis.json", "application/json")
          break
        case "md":
          downloadFile(generateMultiMarkdown(profiles, syntheticFund), "multi-cef-advisor-explainer.md", "text/markdown")
          break
      }
      setDownloading(null)
    }, 300)
  }

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(multiCefHerculesPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Download Files */}
      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          icon={<FileText className="h-5 w-5 text-success" />}
          title="Multi-Fund Holdings CSV"
          description="Top 10 holdings per fund across all 10 CEFs with proxy baskets, correlations, and confidence scores."
          filename="multi-cef-holdings-proxy.csv"
          onDownload={() => handleDownload("csv")}
          isDownloading={downloading === "csv"}
        />
        <ExportCard
          icon={<FileJson className="h-5 w-5 text-primary" />}
          title="Full Analysis JSON"
          description="Per-fund exposures, correlations, hedge stats, leverage probes, and synthetic fund portfolio metrics."
          filename="multi-cef-analysis.json"
          onDownload={() => handleDownload("json")}
          isDownloading={downloading === "json"}
        />
        <ExportCard
          icon={<File className="h-5 w-5 text-warning" />}
          title="Advisor Explainer (MD)"
          description="1-page multi-fund narrative with per-fund summary table, execution plan, and key risk callouts."
          filename="multi-cef-advisor-explainer.md"
          onDownload={() => handleDownload("md")}
          isDownloading={downloading === "md"}
        />
      </div>

      {/* Input Checklist */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Input Checklist</CardTitle>
          <CardDescription>Required data sources for the multi-fund pipeline ({profiles.length} funds)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs w-8">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs">Input Item</TableHead>
                <TableHead className="text-muted-foreground text-xs">Source</TableHead>
                <TableHead className="text-muted-foreground text-xs text-center">Per Fund</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inputChecklist.map((item) => (
                <TableRow key={item.item} className="border-border">
                  <TableCell>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{item.item}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.source}</TableCell>
                  <TableCell className="text-center">
                    {item.perFund ? (
                      <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">x{profiles.length}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Global</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hercules Prompt */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm text-foreground">Multi-CEF Hercules Prompt</CardTitle>
              <Badge variant="outline" className="text-[10px] border-success/30 text-success">Ready to Paste</Badge>
            </div>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Prompt"}
            </button>
          </div>
          <CardDescription>Complete multi-fund analysis prompt covering all 10 CEFs plus synthetic fund aggregation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
              {multiCefHerculesPrompt}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Quick Fund Comparison Preview */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Advisor Summary Preview</CardTitle>
          <CardDescription>Key metrics across all 10 funds at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">AUM</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">P/D</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Dist</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Lev</TableHead>
                <TableHead className="text-muted-foreground text-xs">Best Proxy</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Corr</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">TE</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Conf</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Leverage Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const o = p.overview
                const basket = p.proxyBaskets[p.selectedProxyIndex]
                return (
                  <TableRow key={o.ticker} className="border-border">
                    <TableCell className="font-mono text-xs font-bold text-primary">{o.ticker}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">${o.aum.toFixed(1)}B</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                        {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.distributionRate}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.leverageRatio > 0 ? `${o.leverageRatio}%` : "-"}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[140px] truncate">
                      {basket?.tickers.slice(0, 3).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] ${basket?.correlation >= 0.96 ? "text-success border-success/30" : basket?.correlation >= 0.93 ? "text-primary border-primary/30" : "text-warning border-warning/30"}`}>
                        {basket?.correlation.toFixed(3)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{basket?.trackingError.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] ${p.confidence >= 75 ? "text-success border-success/30" : p.confidence >= 60 ? "text-warning border-warning/30" : "text-destructive border-destructive/30"}`}>
                        {p.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.leverageProbe.leverageDetected ? (
                        <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">Flagged</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Clean</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ExportCard({
  icon,
  title,
  description,
  filename,
  onDownload,
  isDownloading,
}: {
  icon: React.ReactNode
  title: string
  description: string
  filename: string
  onDownload: () => void
  isDownloading: boolean
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <p className="text-xs text-muted-foreground">{filename}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {isDownloading ? "Downloading..." : "Download"}
        </button>
      </CardContent>
    </Card>
  )
}
