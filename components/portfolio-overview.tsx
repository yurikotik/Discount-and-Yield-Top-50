"use client"

import { useState, useMemo } from "react"
import type { CEFProfile } from "@/lib/cef-universe"
import { formatPercent, PILLAR_LABELS, PILLAR_WEIGHTS, type FundRanking, type PillarScores } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, ArrowRight, ChevronDown, ChevronUp } from "lucide-react"
import { DecodeBanner } from "@/components/decode-banner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"

interface Props {
  funds: CEFProfile[]
  rankings: FundRanking[]
  selectedTicker: string
  onSelectFund: (ticker: string) => void
  onNavigateToFund: (ticker: string) => void
}

// ─── Heat-map helper: score 0-1 -> bg color class ──────────────────────────
function pillarBg(val: number): string {
  if (val >= 0.8) return "bg-success/25"
  if (val >= 0.6) return "bg-success/10"
  if (val >= 0.4) return "bg-warning/15"
  if (val >= 0.2) return "bg-warning/10"
  return "bg-destructive/15"
}

function pillarText(val: number): string {
  if (val >= 0.7) return "text-success"
  if (val >= 0.4) return "text-warning"
  return "text-destructive"
}

export function PortfolioOverview({ funds, rankings, selectedTicker, onSelectFund, onNavigateToFund }: Props) {
  const [showAllCards, setShowAllCards] = useState(false)
  const [showAllPillars, setShowAllPillars] = useState(false)
  const totalAum = funds.reduce((s, f) => s + f.overview.aum, 0)
  const avgDist = funds.reduce((s, f) => s + f.overview.distributionRate, 0) / funds.length
  const avgLev = funds.reduce((s, f) => s + f.overview.leverageRatio, 0) / funds.length
  const levFunds = funds.filter(f => f.overview.leverageRatio > 0).length
  const avgExpense = funds.reduce((s, f) => s + f.overview.expenseRatio, 0) / funds.length
  const avgReturn = funds.reduce((s, f) => s + f.performance.return1Y, 0) / funds.length
  const avgPD = funds.reduce((s, f) => s + f.overview.premiumDiscount, 0) / funds.length

  // Top ranked fund
  const topFund = rankings[0]
  const topProfile = funds.find(f => f.overview.ticker === topFund?.ticker)

  // Ranking bar chart data
  const rankBarData = rankings.map(r => ({
    ticker: r.ticker,
    score: r.score,
    compositeZ: r.compositeZ,
  }))

  // Scatter: yield vs leverage
  const scatterData = funds.map(f => ({
    name: f.overview.ticker,
    x: f.overview.leverageRatio,
    y: f.overview.distributionRate,
    z: f.overview.aum,
  }))

  // Top 10 for cards
  const top10Tickers = new Set(rankings.slice(0, 10).map(r => r.ticker))
  const displayFunds = showAllCards ? funds : funds.filter(f => top10Tickers.has(f.overview.ticker))

  // Pillar table display
  const pillarRankings = showAllPillars ? rankings : rankings.slice(0, 15)

  return (
    <div className="flex flex-col gap-6">
      {/* Decode Banner */}
      <DecodeBanner />

      {/* KPI Summary Row -- Salesforce-style with deltas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Total AUM" value={`$${totalAum.toFixed(1)}B`} />
        <KpiCard label="Universe" value={`${funds.length}`} sub="funds" />
        <KpiCard label="Avg 1Y Return" value={`${avgReturn.toFixed(1)}%`} delta={avgReturn > 10 ? "+strong" : undefined} positive={avgReturn > 10} />
        <KpiCard label="Avg Dist Rate" value={`${avgDist.toFixed(1)}%`} />
        <KpiCard label="Avg P/D" value={`${avgPD >= 0 ? "+" : ""}${avgPD.toFixed(1)}%`} positive={avgPD < 0} delta={avgPD < -3 ? "discount zone" : avgPD > 0 ? "premium zone" : undefined} />
        <KpiCard label="Avg Leverage" value={`${avgLev.toFixed(1)}%`} sub={`${levFunds} leveraged`} />
        <KpiCard label="Avg Expense" value={`${avgExpense.toFixed(2)}%`} />
      </div>

      {/* Top Ranked -- Salesforce "Top Deals" pattern */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Fund Cards Grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {showAllCards ? `All ${funds.length} Funds` : "Top 10 by Score"}
            </h3>
            <button
              onClick={() => setShowAllCards(!showAllCards)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {showAllCards ? "Show Top 10" : `Show All ${funds.length}`}
              {showAllCards ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {displayFunds.map((fund) => {
              const o = fund.overview
              const isSelected = o.ticker === selectedTicker
              const rank = rankings.find(r => r.ticker === o.ticker)
              return (
                <button
                  key={o.ticker}
                  onClick={() => onNavigateToFund(o.ticker)}
                  className={`group flex gap-3 rounded-lg border p-3 text-left transition-all ${
                    isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {/* Rank Badge -- large numbered circle like Salesforce Top Deals */}
                  {rank && (
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${
                      rank.rank <= 3 ? "bg-primary/20 text-primary" :
                      rank.rank <= 10 ? "bg-accent/20 text-accent" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {rank.rank}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-foreground">{o.ticker}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{o.name}</p>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="font-mono text-foreground">${o.aum.toFixed(1)}B</span>
                      <span className={`font-mono ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                        {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                      </span>
                      <span className="font-mono text-foreground">{o.distributionRate}% dist</span>
                      {rank && <span className="font-mono text-primary ml-auto">{rank.score.toFixed(2)}</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Top 5 Deals -- Right sidebar, Salesforce style */}
        <Card className="border-border bg-card h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Top 5 Ranked</CardTitle>
            <CardDescription>Best composite score</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rankings.slice(0, 5).map((rank, i) => {
              const fund = funds.find(f => f.overview.ticker === rank.ticker)!
              const o = fund.overview
              return (
                <button
                  key={rank.ticker}
                  onClick={() => onNavigateToFund(rank.ticker)}
                  className="flex items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-primary/5"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${
                    i === 0 ? "bg-primary text-primary-foreground" :
                    i <= 2 ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">{o.ticker}</span>
                      <span className="font-mono text-xs text-primary">{rank.score.toFixed(3)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{o.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>${o.aum.toFixed(1)}B</span>
                      <span className="text-foreground">{o.distributionRate}% dist</span>
                      <span className={o.premiumDiscount < 0 ? "text-destructive" : "text-success"}>
                        {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}% P/D
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">5-Pillar Composite Ranking</CardTitle>
            <CardDescription>Yield 25% + Discount 25% + X-Ray 20% + Risk 15% + Momentum 15%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-y-auto max-h-[600px]" style={{ height: Math.max(320, rankBarData.length * 18 + 40) }}>
              <ResponsiveContainer width="100%" height={Math.max(320, rankBarData.length * 18 + 40)}>
                <BarChart data={rankBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="ticker" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number) => [value.toFixed(2), "Score"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {rankBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 0 ? "#4a9eff" : "#f87171"} fillOpacity={Math.max(0.3, 1 - index * 0.012)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Yield vs Leverage Scatter */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Yield vs Leverage</CardTitle>
            <CardDescription>Bubble size = AUM</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis type="number" dataKey="x" name="Leverage" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "Leverage %", position: "insideBottom", offset: -5, fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <YAxis type="number" dataKey="y" name="Yield" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "Dist Rate %", angle: -90, position: "insideLeft", fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <ZAxis type="number" dataKey="z" range={[60, 400]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "Leverage") return [`${value}%`, "Leverage"]
                      if (name === "Yield") return [`${value}%`, "Dist Rate"]
                      return [`$${value.toFixed(1)}B`, "AUM"]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={scatterData} fill="#4a9eff" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5-Pillar Breakdown Table -- Heat-map cells like Salesforce Follow Up Contact Rate */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-foreground">Scoring Pillar Breakdown</CardTitle>
              <CardDescription>Per-fund 5-pillar scores with heat-map (0-1 scale)</CardDescription>
            </div>
            <button
              onClick={() => setShowAllPillars(!showAllPillars)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {showAllPillars ? "Show Top 15" : `Show All ${rankings.length}`}
              {showAllPillars ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs w-12">#</TableHead>
                <TableHead className="text-muted-foreground text-xs">Fund</TableHead>
                {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map(key => (
                  <TableHead key={key} className="text-muted-foreground text-xs text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{PILLAR_LABELS[key]}</span>
                      <span className="text-[9px] text-muted-foreground/60">{(PILLAR_WEIGHTS[key] * 100).toFixed(0)}%</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-muted-foreground text-xs text-center">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pillarRankings.map((rank) => (
                <TableRow
                  key={rank.ticker}
                  className={`border-border cursor-pointer transition-colors hover:bg-primary/5 ${rank.ticker === selectedTicker ? "bg-primary/5" : ""}`}
                  onClick={() => onNavigateToFund(rank.ticker)}
                >
                  <TableCell className="font-mono text-xs font-bold text-muted-foreground">{rank.rank}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-primary">{rank.ticker}</span>
                  </TableCell>
                  {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map(key => {
                    const val = rank.pillars[key]
                    return (
                      <TableCell key={key} className="text-center p-1">
                        <div className={`rounded-md px-2 py-1 ${pillarBg(val)}`}>
                          <span className={`font-mono text-xs font-medium ${pillarText(val)}`}>
                            {(val * 100).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center">
                    <span className="font-mono text-xs font-bold text-primary">{rank.score.toFixed(3)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cross-Fund Comparison Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Cross-Fund Comparison</CardTitle>
          <CardDescription>Key metrics across all {funds.length} CEFs, ranked by composite score</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">#</TableHead>
                <TableHead className="text-muted-foreground text-xs">Fund</TableHead>
                <TableHead className="text-muted-foreground text-xs">Cat</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">AUM</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">P/D</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Dist</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Lev</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Exp</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">1Y Ret</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Sharpe</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Z</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((rank) => {
                const fund = funds.find(f => f.overview.ticker === rank.ticker)!
                const o = fund.overview
                return (
                  <TableRow
                    key={o.ticker}
                    className={`border-border cursor-pointer transition-colors hover:bg-primary/5 ${o.ticker === selectedTicker ? "bg-primary/5" : ""}`}
                    onClick={() => onNavigateToFund(o.ticker)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{rank.rank}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">{o.ticker}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground capitalize">{o.category.replace("-", " ")}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">${o.aum.toFixed(1)}B</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                        {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.distributionRate}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.leverageRatio > 0 ? `${o.leverageRatio}%` : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.expenseRatio.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{fund.performance.return1Y.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{fund.performance.sharpeRatio.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] ${rank.compositeZ >= 0 ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}>
                        {rank.compositeZ >= 0 ? "+" : ""}{rank.compositeZ.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-primary">{rank.score.toFixed(3)}</TableCell>
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

// ─── KPI Card with optional delta indicator ─────────────────────────────────
function KpiCard({ label, value, delta, positive, sub }: {
  label: string
  value: string
  delta?: string
  positive?: boolean
  sub?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xl font-bold text-foreground">{value}</span>
        {delta && (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${positive ? "text-success" : "text-warning"}`}>
            {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {delta}
          </span>
        )}
        {sub && !delta && (
          <span className="text-[10px] text-muted-foreground">{sub}</span>
        )}
      </div>
    </div>
  )
}
