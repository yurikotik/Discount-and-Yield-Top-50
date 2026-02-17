"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MonitoringPanel } from "@/components/monitoring-panel"
import { getSampleCsvs, getAllTickers } from "@/lib/sample-csvs"
import { CSV_SCHEMAS } from "@/lib/csv-schemas"
import {
  type PipelineState,
  type NodeStatus,
  type IngestInputs,
  createEmptyPipeline,
  runPipelineStepped,
} from "@/lib/pipeline"
import {
  Play,
  RotateCcw,
  ArrowRight,
  FileSpreadsheet,
  Scan,
  Calculator,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ─── Node Status Badge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NodeStatus }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
    case "running":
      return <Badge variant="outline" className="text-[10px] text-primary border-primary/30 animate-pulse"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>
    case "complete":
      return <Badge variant="outline" className="text-[10px] text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>
    case "error":
      return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
  }
}

// ─── Pipeline Node Card ─────────────────────────────────────────────────────

const NODE_CONFIG = [
  { key: "ingest" as const, label: "1. Ingest", desc: "Parse & validate CSVs", icon: FileSpreadsheet },
  { key: "xray" as const, label: "2. X-Ray", desc: "8-section analysis", icon: Scan },
  { key: "scoring" as const, label: "3. Scoring", desc: "5-pillar computation", icon: Calculator },
  { key: "aggregation" as const, label: "4. Aggregation", desc: "Rank & select", icon: BarChart3 },
]

interface NodeCardProps {
  config: typeof NODE_CONFIG[number]
  meta: { status: NodeStatus; durationMs: number | null; errors: { row: number; column: string; message: string }[] }
  isLast: boolean
}

function NodeCard({ config, meta, isLast }: NodeCardProps) {
  const Icon = config.icon
  const isActive = meta.status === "running"
  const isDone = meta.status === "complete"

  return (
    <>
      <div className={`flex flex-col items-center gap-2 rounded-lg border p-4 min-w-[140px] transition-all ${
        isActive ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" :
        isDone ? "border-success/40 bg-success/5" :
        meta.status === "error" ? "border-destructive/40 bg-destructive/5" :
        "border-border bg-card"
      }`}>
        <Icon className={`h-5 w-5 ${isActive ? "text-primary" : isDone ? "text-success" : "text-muted-foreground"}`} />
        <span className="text-xs font-semibold text-foreground">{config.label}</span>
        <span className="text-[10px] text-muted-foreground text-center">{config.desc}</span>
        <StatusBadge status={meta.status} />
        {meta.durationMs !== null && (
          <span className="text-[9px] font-mono text-muted-foreground">{meta.durationMs}ms</span>
        )}
        {meta.errors.length > 0 && (
          <span className="text-[9px] text-warning">{meta.errors.length} issue{meta.errors.length > 1 ? "s" : ""}</span>
        )}
      </div>
      {!isLast && (
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden md:block" />
      )}
    </>
  )
}

// ─── Collapsible Output Panel ───────────────────────────────────────────────

function OutputPanel({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-md">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/30 transition-colors">
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  )
}

// ─── Main Workflow View ─────────────────────────────────────────────────────

export function WorkflowView() {
  const [targetTicker, setTargetTicker] = useState("UTF")
  const [pipeline, setPipeline] = useState<PipelineState>(createEmptyPipeline("UTF"))
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    const csvs = getSampleCsvs(targetTicker)
    const inputs: IngestInputs = {
      universeMetricsCsv: csvs.universeMetrics,
      holdingsCsv: csvs.holdings,
      navPriceCsv: csvs.navPrice,
      distributionsCsv: csvs.distributions,
      targetTicker,
    }
    await runPipelineStepped(inputs, setPipeline, 500)
    setIsRunning(false)
  }, [targetTicker])

  const handleReset = useCallback(() => {
    setPipeline(createEmptyPipeline(targetTicker))
  }, [targetTicker])

  const tickers = getAllTickers()
  const isDone = pipeline.overallStatus === "complete"

  return (
    <div className="flex flex-col gap-6">
      {/* Pipeline Header */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-sm text-foreground">Ingest + X-Ray Workflow Pipeline</CardTitle>
              <CardDescription>4-node pipeline: Ingest CSV -> X-Ray Analysis -> 5-Pillar Scoring -> Aggregation & Selection</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Target:</span>
                <Select value={targetTicker} onValueChange={(v) => { setTargetTicker(v); setPipeline(createEmptyPipeline(v)) }} disabled={isRunning}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tickers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleRun} disabled={isRunning} className="gap-2">
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {isRunning ? "Running..." : "Run Pipeline"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset} disabled={isRunning}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Node Chain Diagram */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {NODE_CONFIG.map((cfg, i) => {
              const nodeState = pipeline[cfg.key]
              return <NodeCard key={cfg.key} config={cfg} meta={nodeState.meta} isLast={i === NODE_CONFIG.length - 1} />
            })}
          </div>
        </CardContent>
      </Card>

      {/* Input CSVs Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">CSV Input Contract</CardTitle>
          <CardDescription>4 canonical CSV schemas loaded from sample data ({targetTicker})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CSV_SCHEMAS.map(schema => (
              <div key={schema.id} className="rounded-md border border-border p-3 bg-secondary/10">
                <p className="text-xs font-semibold text-foreground mb-1">{schema.filename.replace("{TICKER}", targetTicker)}</p>
                <p className="text-[10px] text-muted-foreground mb-2">{schema.description}</p>
                <code className="block text-[9px] font-mono text-muted-foreground bg-background/50 rounded p-1.5 overflow-x-auto">
                  {schema.columns}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Node Outputs */}
      {isDone && pipeline.ingest.outputs && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Node Outputs</CardTitle>
            <CardDescription>Structured outputs from each pipeline stage</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* Ingest Output */}
            <OutputPanel title={`1. Ingest: ${pipeline.ingest.outputs.holdingsNormalized.length} holdings, ${pipeline.ingest.outputs.dailyReturns.length} daily returns, ${pipeline.ingest.outputs.universeMetrics.length} universe funds${pipeline.ingest.meta.errors.some(e => e.column === "format") ? " (Barchart auto-detected)" : ""}`}>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Universe Metrics ({pipeline.ingest.outputs.universeMetrics.length} funds)</p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground text-[10px]">Ticker</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">AUM</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">ADV</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">Yield</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">1Y Ret</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">P/D</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">UNII</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">Dist Cov</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pipeline.ingest.outputs.universeMetrics.map(m => (
                          <TableRow key={m.ticker} className={`border-border ${m.ticker === targetTicker ? "bg-primary/5" : ""}`}>
                            <TableCell className="font-mono text-[10px] font-bold text-primary">{m.ticker}</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">${m.aum.toFixed(1)}B</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">${m.adv.toFixed(1)}M</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">{m.yield.toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">{m.return1Y.toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">{m.avgPremiumDiscount >= 0 ? "+" : ""}{m.avgPremiumDiscount.toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">${m.unii.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">{m.distributionCoverage.toFixed(2)}x</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Normalized Holdings (top 10 of {pipeline.ingest.outputs.holdingsNormalized.length})</p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground text-[10px]">Ticker</TableHead>
                          <TableHead className="text-muted-foreground text-[10px]">Issuer</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">Weight %</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">Market Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pipeline.ingest.outputs.holdingsNormalized.slice(0, 10).map((h, i) => (
                          <TableRow key={i} className="border-border">
                            <TableCell className="font-mono text-[10px]">{h.ticker}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground truncate max-w-[200px]">{h.issuer}</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">{h.weightPct.toFixed(2)}%</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">${(h.marketValueUsd / 1e6).toFixed(1)}M</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </OutputPanel>

            {/* X-Ray Output */}
            {pipeline.xray.outputs && (
              <OutputPanel title={`2. X-Ray: ${pipeline.xray.outputs.warnings.length} warnings, confidence ${pipeline.xray.outputs.confidenceScore}/100, liquidity ${pipeline.xray.outputs.liquidityScore}/100`}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Leverage Probe</p>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">Residual: <span className={`font-mono ${pipeline.xray.outputs.leverageProbe.flagged ? "text-destructive" : "text-success"}`}>{pipeline.xray.outputs.leverageProbe.residualReturn.toFixed(3)}%</span></span>
                      <span className="text-[10px] text-muted-foreground">Flagged: <span className={`font-mono ${pipeline.xray.outputs.leverageProbe.flagged ? "text-destructive" : "text-success"}`}>{pipeline.xray.outputs.leverageProbe.flagged ? "YES" : "NO"}</span></span>
                      <span className="text-[10px] text-muted-foreground">Instruments: {pipeline.xray.outputs.leverageProbe.likelyInstruments.join(", ")}</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Distribution Sustainability</p>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">Coverage: <span className="font-mono text-foreground">{pipeline.xray.outputs.distributionSustainability.coverageRatio.toFixed(2)}x</span></span>
                      <span className="text-[10px] text-muted-foreground">UNII Trend: <span className="font-mono text-foreground">{pipeline.xray.outputs.distributionSustainability.uniiTrend}</span></span>
                      <span className="text-[10px] text-muted-foreground">ROC %: <span className="font-mono text-foreground">{pipeline.xray.outputs.distributionSustainability.rocPct.toFixed(1)}%</span></span>
                      <span className="text-[10px] text-muted-foreground">Sustainable: <span className={`font-mono ${pipeline.xray.outputs.distributionSustainability.sustainable ? "text-success" : "text-destructive"}`}>{pipeline.xray.outputs.distributionSustainability.sustainable ? "YES" : "NO"}</span></span>
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Drift & Regime</p>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">Regime: <Badge variant="outline" className={`font-mono text-[9px] ${pipeline.xray.outputs.driftDetection.regime === "stable" ? "text-success border-success/30" : pipeline.xray.outputs.driftDetection.regime === "transitioning" ? "text-warning border-warning/30" : "text-destructive border-destructive/30"}`}>{pipeline.xray.outputs.driftDetection.regime}</Badge></span>
                      <span className="text-[10px] text-muted-foreground">Change Points: {pipeline.xray.outputs.driftDetection.changePoints}</span>
                      <span className="text-[10px] text-muted-foreground">Max Drift 30d: {pipeline.xray.outputs.driftDetection.maxDrift30d.toFixed(2)}%</span>
                    </div>
                  </div>
                  {pipeline.xray.outputs.warnings.length > 0 && (
                    <div className="rounded-md border border-warning/30 bg-warning/5 p-3 sm:col-span-2 lg:col-span-3">
                      <p className="text-xs font-medium text-warning mb-2">X-Ray Warnings</p>
                      <ul className="flex flex-col gap-1">
                        {pipeline.xray.outputs.warnings.map((w, i) => (
                          <li key={i} className="text-[10px] text-foreground/80">- {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </OutputPanel>
            )}

            {/* Scoring Output */}
            {pipeline.scoring.outputs && (
              <OutputPanel title={`3. Scoring: ${pipeline.scoring.outputs.ticker} composite=${pipeline.scoring.outputs.compositeScore.toFixed(3)}, filter=${pipeline.scoring.outputs.passesFilter ? "PASS" : "FAIL"}`}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-5">
                    {(Object.entries(pipeline.scoring.outputs.pillars) as [string, number][]).map(([key, val]) => {
                      const labels: Record<string, string> = { yieldQuality: "Yield Quality", discountAttractiveness: "Discount", xrayStability: "X-Ray Stability", riskLiquidity: "Risk/Liquidity", momentumRegime: "Momentum" }
                      const weights: Record<string, number> = { yieldQuality: 25, discountAttractiveness: 25, xrayStability: 20, riskLiquidity: 15, momentumRegime: 15 }
                      const color = val >= 0.7 ? "text-success" : val >= 0.4 ? "text-warning" : "text-destructive"
                      return (
                        <div key={key} className="rounded-md border border-border p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">{labels[key]} ({weights[key]}%)</p>
                          <p className={`font-mono text-lg font-bold ${color}`}>{val.toFixed(2)}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-muted-foreground">Composite Z: <span className="font-mono text-foreground">{pipeline.scoring.outputs.zScores.compositeZ.toFixed(3)}</span></span>
                    <span className="text-xs text-muted-foreground">PSI: <span className="font-mono text-foreground">{pipeline.scoring.outputs.psi.toFixed(4)}</span> ({pipeline.scoring.outputs.psiRegime})</span>
                    <span className="text-xs text-muted-foreground">Composite Score: <span className="font-mono text-primary font-bold">{pipeline.scoring.outputs.compositeScore.toFixed(3)}</span></span>
                  </div>
                </div>
              </OutputPanel>
            )}

            {/* Aggregation Output */}
            {pipeline.aggregation.outputs && (
              <OutputPanel title={`4. Aggregation: Top pick=${pipeline.aggregation.outputs.selectionSummary.topPick}, ${pipeline.aggregation.outputs.selectionSummary.filterPassCount}/${pipeline.aggregation.outputs.selectionSummary.totalFunds} pass filter`} defaultOpen>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Top Pick</p>
                      <p className="font-mono text-lg font-bold text-primary">{pipeline.aggregation.outputs.selectionSummary.topPick}</p>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Top Score</p>
                      <p className="font-mono text-lg font-bold text-foreground">{pipeline.aggregation.outputs.selectionSummary.topScore.toFixed(3)}</p>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Avg Score</p>
                      <p className="font-mono text-lg font-bold text-foreground">{pipeline.aggregation.outputs.selectionSummary.averageScore.toFixed(3)}</p>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Filter Pass/Fail</p>
                      <p className="font-mono text-lg font-bold text-foreground">{pipeline.aggregation.outputs.selectionSummary.filterPassCount}/{pipeline.aggregation.outputs.selectionSummary.totalFunds}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground text-[10px]">Rank</TableHead>
                          <TableHead className="text-muted-foreground text-[10px]">Ticker</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-right">Score</TableHead>
                          <TableHead className="text-muted-foreground text-[10px] text-center">Filter</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pipeline.aggregation.outputs.rankedFunds.map(f => (
                          <TableRow key={f.ticker} className={`border-border ${f.ticker === targetTicker ? "bg-primary/5" : ""}`}>
                            <TableCell className="font-mono text-[10px] font-bold text-muted-foreground">#{f.rank}</TableCell>
                            <TableCell className="font-mono text-[10px] font-bold text-primary">{f.ticker}</TableCell>
                            <TableCell className="text-right font-mono text-[10px]">{f.score.toFixed(3)}</TableCell>
                            <TableCell className="text-center">
                              {f.passesFilter ? (
                                <Badge variant="outline" className="text-[9px] text-success border-success/30">PASS</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">FAIL</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </OutputPanel>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitoring Alerts */}
      {isDone && pipeline.aggregation.outputs && (
        <MonitoringPanel alerts={pipeline.aggregation.outputs.alerts} />
      )}

      {/* File Contract Reference */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Pipeline Output File Contract</CardTitle>
          <CardDescription>Spec-defined deliverables per fund</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { file: "{TICKER}_reconstructed_holdings.csv", desc: "Normalized holdings with weights" },
              { file: "{TICKER}_factor_exposures.json", desc: "Multi-factor regression output" },
              { file: "{TICKER}_xray_flags.json", desc: "8-section X-ray flags and scores" },
              { file: "{TICKER}_score.json", desc: "5-pillar scores + composite" },
              { file: "{TICKER}_xray_onepager.md", desc: "Advisor-ready one-pager" },
              { file: "top10_selection.csv", desc: "Final ranked selection with scores" },
            ].map(item => (
              <div key={item.file} className="rounded border border-border p-2.5 bg-secondary/10">
                <code className="text-[10px] font-mono text-primary">{item.file.replace("{TICKER}", targetTicker)}</code>
                <p className="text-[9px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
