"use client"

import { useState, useCallback } from "react"
import type { CEFProfile } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Info, Copy, Check, FileText, Shield, Database } from "lucide-react"

interface Props {
  data: CEFProfile
}

function generateXrayPrompt(ticker: string, name: string): string {
  return `Analyze the closed-end fund ${ticker} (${name}) using its latest publicly disclosed holdings CSV and 2 years of daily NAV and market price data. Do NOT propose replication or hedging. Return structured outputs only.

1. Holdings ingestion
   - Parse holdings CSV and normalize to USD market value weights.
   - Report top 20 positions, issuer exposures, sector exposures, concentration metrics, and liquidity score per holding.

2. Factor decomposition
   - Estimate exposures to value, momentum, dividend yield, credit sensitivity, duration proxy, REIT/infra tilt, and sector factors.
   - Provide factor loadings and percent contribution to NAV returns over 30d, 90d, and 2y.

3. NAV versus market decomposition
   - Decompose daily returns into NAV-driven returns and premium/discount-driven returns.
   - Report cumulative contribution of each component for 30d, 90d, and 2y windows.

4. Leverage and derivatives probe
   - Regress realized returns on reconstructed holdings and factors.
   - Quantify unexplained return residual; flag if residual > 1% monthly.
   - If flagged, list likely instruments or behaviors (e.g., total return swaps, options, repo) and estimate implied notional.

5. Distribution sustainability
   - Compute distribution coverage using reported income, realized NAV returns, and UNII trends.
   - Score distribution sustainability 0-100 and list red flags.

6. Drift and regime detection
   - Compute rolling 30d and 90d factor drift metrics and change points.
   - Flag significant regime shifts with timestamps.

7. Liquidity and execution signals
   - Estimate liquidity score per holding using ADV proxies and market cap.
   - Provide overall fund liquidity index and note large illiquid positions.

8. Confidence and caveats
   - Provide intelligence quality score 0-100.
   - List conditions that would invalidate the X-ray (stale holdings, undisclosed swaps, rapid intraday trading).

Deliverables
- CSV: ${ticker}_reconstructed_holdings.csv with Date,Ticker,Issuer,Shares,MarketValueUSD,Weight%,LiquidityScore.
- JSON: ${ticker}_xray.json with factor_loadings, nav_vs_market_contributions, residuals, distribution_score, confidence_score.
- Markdown: ${ticker}_xray_onepager.md with a 1-page narrative, 3 charts (sector pie, factor bar, NAV vs market decomposition), and 3 advisor talking points.

Inputs required
- holdings CSV URL or file
- 2 years daily NAV and market price CSV
- distribution history CSV
- optional: fund factsheet PDF for cross-validation`
}

export function ConfidenceSection({ data }: Props) {
  const { confidence, overview, caveats } = data
  const [copied, setCopied] = useState(false)

  const xrayPrompt = generateXrayPrompt(overview.ticker, overview.name)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(xrayPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea")
      ta.value = xrayPrompt
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [xrayPrompt])

  const qualityColor =
    confidence.qualityScore >= 75 ? "text-success" :
    confidence.qualityScore >= 50 ? "text-warning" :
    "text-destructive"

  const distColor =
    confidence.distributionScore >= 70 ? "text-success" :
    confidence.distributionScore >= 40 ? "text-warning" :
    "text-destructive"

  const swapRiskColor =
    confidence.swapDisclosureRisk === "low" ? "text-success border-success/30" :
    confidence.swapDisclosureRisk === "medium" ? "text-warning border-warning/30" :
    "text-destructive border-destructive/30"

  return (
    <div className="gy-stack">
      {/* Quality Score + Distribution Score */}
      <div className="grid grid-cols-2 gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-7">
        <QualityCard label="Intelligence Score" value={`${confidence.qualityScore}/100`} className={qualityColor} />
        <QualityCard label="Distribution Score" value={`${confidence.distributionScore}/100`} className={distColor} />
        <QualityCard label="Holdings Age" value={`${confidence.holdingsAge}d`} severity={confidence.holdingsAge > 60 ? "medium" : "low"} />
        <QualityCard label="Data Completeness" value={`${confidence.dataCompleteness}%`} severity={confidence.dataCompleteness < 80 ? "medium" : "low"} />
        <QualityCard label="Swap Risk" value={confidence.swapDisclosureRisk.toUpperCase()} severity={confidence.swapDisclosureRisk === "high" ? "high" : confidence.swapDisclosureRisk === "medium" ? "medium" : "low"} />
        <QualityCard label="Red Flags" value={confidence.distributionRedFlags.length.toString()} severity={confidence.distributionRedFlags.length > 2 ? "high" : confidence.distributionRedFlags.length > 0 ? "medium" : "low"} />
        <QualityCard label="Invalidations" value={confidence.invalidationConditions.length.toString()} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Quality Assessment */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-foreground">Intelligence Quality Assessment</CardTitle>
            </div>
            <CardDescription>Overall confidence in the X-ray analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Score Gauge */}
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="oklch(0.22 0.02 250)" strokeWidth="3" />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={confidence.qualityScore >= 75 ? "#459212" : confidence.qualityScore >= 50 ? "#D4B40A" : "#CA3A41"}
                      strokeWidth="3"
                      strokeDasharray={`${confidence.qualityScore}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-mono text-base font-bold ${qualityColor}`}>{confidence.qualityScore}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {confidence.qualityScore >= 75 ? "High Confidence" : confidence.qualityScore >= 50 ? "Moderate Confidence" : "Low Confidence"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {confidence.qualityScore >= 75
                      ? "Holdings data is reasonably current and derivative exposure is well-disclosed. Analysis outputs are reliable for advisory use."
                      : confidence.qualityScore >= 50
                      ? "Some data gaps exist. Holdings may be stale or derivative positions partially undisclosed. Use analysis with caveats."
                      : "Significant data gaps. Undisclosed positions likely. Analysis should be considered directional only."
                    }
                  </p>
                </div>
              </div>

              {/* Sub-metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[length:var(--gy-text-xs)] uppercase tracking-wider text-muted-foreground">Data Completeness</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${confidence.dataCompleteness}%` }} />
                  </div>
                  <span className="mt-1 block font-mono text-xs text-foreground">{confidence.dataCompleteness}%</span>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[length:var(--gy-text-xs)] uppercase tracking-wider text-muted-foreground">Holdings Freshness</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(0, 100 - confidence.holdingsAge)}%`, backgroundColor: confidence.holdingsAge > 60 ? "#D4B40A" : "#459212" }} />
                  </div>
                  <span className="mt-1 block font-mono text-xs text-foreground">{confidence.holdingsAge} days old</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Sustainability */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {confidence.distributionScore >= 70 ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <CardTitle className="text-foreground">Distribution Sustainability</CardTitle>
            </div>
            <CardDescription>Score: {confidence.distributionScore}/100 for {overview.ticker}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Score Ring */}
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="oklch(0.22 0.02 250)" strokeWidth="3" />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={confidence.distributionScore >= 70 ? "#459212" : confidence.distributionScore >= 40 ? "#D4B40A" : "#CA3A41"}
                      strokeWidth="3"
                      strokeDasharray={`${confidence.distributionScore}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-mono text-base font-bold ${distColor}`}>{confidence.distributionScore}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {confidence.distributionScore >= 70 ? "Sustainable" : confidence.distributionScore >= 40 ? "At Risk" : "Unsustainable"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Distribution rate of {overview.distributionRate}% vs NAV return of {data.performance.navReturn1Y}%.
                  </p>
                </div>
              </div>

              {/* Red Flags */}
              {confidence.distributionRedFlags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[length:var(--gy-text-xs)] uppercase tracking-wider text-muted-foreground">Red Flags</span>
                  {confidence.distributionRedFlags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                      <span className="text-xs text-muted-foreground">{flag}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invalidation Conditions */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">Invalidation Conditions</CardTitle>
          <CardDescription>Conditions that could reduce the reliability of this X-ray analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {confidence.invalidationConditions.map((cond, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/20 p-3">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs text-muted-foreground leading-relaxed">{cond}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fund Caveats */}
      {caveats.length > 0 && (
        <Card className="border-warning/30 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <CardTitle className="text-foreground">Fund-Specific Caveats</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {caveats.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* X-Ray Prompt Template */}
      <Card className="border-primary/30 bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-foreground">X-Ray Prompt Template</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Prompt"}
            </Button>
          </div>
          <CardDescription>Pre-filled prompt for running a full X-ray analysis on {overview.ticker} via LLM or analytics pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {xrayPrompt}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function QualityCard({ label, value, severity, className }: { label: string; value: string; severity?: "high" | "medium" | "low"; className?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="text-[length:var(--gy-text-xs)] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${
        className ? className :
        severity === "high" ? "text-destructive" : severity === "medium" ? "text-warning" : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  )
}
