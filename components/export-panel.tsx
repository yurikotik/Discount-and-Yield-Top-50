"use client"

import { useState } from "react"
import {
  holdings,
  sectorExposures,
  factorExposures,
  proxyBaskets,
  hedgeStats,
  costEstimates,
  navPriceData,
  confidenceScore,
  invalidationRisks,
  leverageProbe,
  fundOverview,
  concentrationMetrics,
} from "@/lib/utf-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, FileJson, File } from "lucide-react"

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

function generateCSV(): string {
  const lines = [
    "Rank,Issuer,Ticker,Sector,Weight(%),MarketValue($),LiquidityScore,Country,ProxyWeight_Basket1(%),ProxyWeight_Basket2(%),ProxyWeight_Basket3(%)",
  ]

  holdings.forEach((h) => {
    const b1 = proxyBaskets[0].etfs.find((e) => e.ticker === h.ticker)?.weight || ""
    const b2 = proxyBaskets[1].etfs.find((e) => e.ticker === h.ticker)?.weight || ""
    const b3 = proxyBaskets[2].etfs.find((e) => e.ticker === h.ticker)?.weight || ""
    lines.push(
      `${h.rank},"${h.issuer}",${h.ticker},${h.sector},${h.weight},${h.marketValue},${h.liquidityScore},${h.country},${b1},${b2},${b3}`
    )
  })

  return lines.join("\n")
}

function generateJSON(): string {
  const data = {
    fund: fundOverview,
    concentration: concentrationMetrics,
    factorExposures: factorExposures.map((f) => ({
      factor: f.factor,
      exposure: f.exposure,
      tStat: f.tStat,
      contribution: f.contribution,
    })),
    correlationMatrices: {
      "90d": proxyBaskets.map((b) => ({
        basket: b.name,
        correlation: b.correlation90d,
      })),
      "180d": proxyBaskets.map((b) => ({
        basket: b.name,
        correlation: b.correlation180d,
      })),
    },
    hedgeStatistics: hedgeStats,
    slippageAssumptions: costEstimates.map((c) => ({
      component: c.component,
      bps: c.bps,
      dollarAmount: c.dollarAmount,
      tier: c.tier,
    })),
    leverageProbe: {
      flagged: leverageProbe.flagged,
      unexplainedReturn: leverageProbe.unexplainedReturn,
      leverageEstimate: leverageProbe.leverageEstimate,
    },
    confidence: confidenceScore,
  }
  return JSON.stringify(data, null, 2)
}

function generateMarkdown(): string {
  return `# UTF Analysis Report - Advisor Explainer
## Cohen & Steers Infrastructure Fund (NYSE: UTF)
*As of ${fundOverview.asOfDate}*

---

### Fund Snapshot
| Metric | Value |
|--------|-------|
| NAV | $${fundOverview.nav.toFixed(2)} |
| Market Price | $${fundOverview.marketPrice.toFixed(2)} |
| Premium/Discount | ${fundOverview.premiumDiscount.toFixed(2)}% |
| Distribution Rate | ${fundOverview.distributionRate}% |
| Leverage | ${fundOverview.leverage}% |
| Total Assets | $${(fundOverview.totalAssets / 1e9).toFixed(1)}B |

### Key Findings

**1. Holdings Concentration**
UTF holds ${concentrationMetrics.totalPositions} positions across ${sectorExposures.length} sectors. The top 10 positions represent ${concentrationMetrics.top10Weight}% of the portfolio. Utilities dominate at ${sectorExposures[0].weight}%, followed by Cell Towers (${sectorExposures[1].weight}%) and Midstream (${sectorExposures[2].weight}%).

**2. Factor Profile**
The fund exhibits strong loadings on REIT/Infrastructure Beta (${factorExposures[1].exposure.toFixed(2)}), Dividend Yield (${factorExposures[0].exposure.toFixed(2)}), and Utilities sector exposure (${factorExposures[6].exposure.toFixed(2)}). Duration sensitivity is negative (${factorExposures[2].exposure.toFixed(2)}), indicating the fund benefits from rising rates, which is atypical for infrastructure.

**3. Best Proxy**
The "Minimum Tracking Error" basket achieves a 90-day correlation of ${proxyBaskets[2].correlation90d.toFixed(3)} with tracking error of ${proxyBaskets[2].trackingError.toFixed(2)}%. It uses a blend of IGF, XLU, AMT, AMLP, and EQIX.

**4. Hedge Implementation**
A $50M long UTF / short proxy position yields an expected annualized return of ${hedgeStats.annualizedReturn}% with max drawdown of ${hedgeStats.maxDrawdown}%. Basis risk (market-price) is ${hedgeStats.basisRiskMarket}%, driven primarily by CEF premium/discount volatility.

**5. Leverage Alert**
Analysis flags likely undisclosed leverage of approximately ${leverageProbe.leverageEstimate}x, with an unexplained return component of +${leverageProbe.unexplainedReturn}% annualized. This is consistent with structural leverage via borrowing facilities and potential derivative overlays.

### Hedge Talking Points
- UTF offers strong infrastructure exposure but carries CEF-specific risks (premium/discount volatility, leverage, distribution sustainability)
- The proxy hedge reduces infrastructure market risk while capturing the CEF alpha/premium
- Key risk: distribution policy changes could cause a significant gap between UTF and the proxy
- Replication confidence: **${confidenceScore}/100** (Moderate) - primary concern is disclosure lag and hidden derivatives

### Replication Confidence: ${confidenceScore}/100
${confidenceScore >= 80 ? "High" : confidenceScore >= 60 ? "Moderate" : "Low"} confidence in proxy replication accuracy.

---
*Generated by UTF Analysis Dashboard | Data as of ${fundOverview.asOfDate}*
`
}

export function ExportPanel() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = (type: string) => {
    setDownloading(type)
    setTimeout(() => {
      switch (type) {
        case "csv":
          downloadFile(generateCSV(), "utf-holdings-proxy.csv", "text/csv")
          break
        case "json":
          downloadFile(generateJSON(), "utf-analysis.json", "application/json")
          break
        case "md":
          downloadFile(generateMarkdown(), "utf-advisor-explainer.md", "text/markdown")
          break
      }
      setDownloading(null)
    }, 300)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          icon={<FileText className="h-5 w-5 text-success" />}
          title="Holdings CSV"
          description="Reconstructed UTF holdings with proxy weights and liquidity scores for all 20 top positions."
          filename="utf-holdings-proxy.csv"
          onDownload={() => handleDownload("csv")}
          isDownloading={downloading === "csv"}
        />
        <ExportCard
          icon={<FileJson className="h-5 w-5 text-primary" />}
          title="Analysis JSON"
          description="Factor exposures, correlation matrices (90d & 180d), hedge stats, and slippage assumptions."
          filename="utf-analysis.json"
          onDownload={() => handleDownload("json")}
          isDownloading={downloading === "json"}
        />
        <ExportCard
          icon={<File className="h-5 w-5 text-warning" />}
          title="Advisor Explainer"
          description="1-page narrative with hedge talking points, fund snapshot, and key findings."
          filename="utf-advisor-explainer.md"
          onDownload={() => handleDownload("md")}
          isDownloading={downloading === "md"}
        />
      </div>

      {/* Preview of the Markdown */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Advisor Explainer Preview</CardTitle>
          <CardDescription>1-page summary for client communication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-secondary/20 p-6 font-mono text-xs leading-relaxed text-muted-foreground">
            <h3 className="mb-3 text-base font-sans font-semibold text-foreground">UTF Analysis Report</h3>
            <p className="mb-4">
              Cohen & Steers Infrastructure Fund (NYSE: UTF) is a closed-end fund managing ${(fundOverview.totalAssets / 1e9).toFixed(1)}B
              in diversified infrastructure assets. Trading at a {Math.abs(fundOverview.premiumDiscount).toFixed(2)}% discount to NAV,
              the fund offers a {fundOverview.distributionRate}% distribution rate with {fundOverview.leverage}% structural leverage.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Best Proxy Corr</span>
                <div className="text-sm font-semibold text-foreground">{proxyBaskets[2].correlation90d.toFixed(3)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Tracking Error</span>
                <div className="text-sm font-semibold text-foreground">{proxyBaskets[2].trackingError.toFixed(2)}%</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Hedge Max DD</span>
                <div className="text-sm font-semibold text-destructive">{hedgeStats.maxDrawdown.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Confidence</span>
                <div className="text-sm font-semibold text-warning">{confidenceScore}/100</div>
              </div>
            </div>
            <p className="mb-2 font-semibold text-foreground font-sans text-xs">Key Risks:</p>
            <ul className="flex flex-col gap-1">
              {invalidationRisks.slice(0, 3).map((r) => (
                <li key={r.risk} className="text-muted-foreground">- {r.risk}: {r.impact}</li>
              ))}
            </ul>
          </div>
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
