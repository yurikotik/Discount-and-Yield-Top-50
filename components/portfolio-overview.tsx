"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { formatPercent, PILLAR_LABELS, PILLAR_WEIGHTS, type FundRanking, type PillarScores } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react"
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
  Legend,
} from "recharts"

interface Props {
  funds: CEFProfile[]
  rankings: FundRanking[]
  selectedTicker: string
  onSelectFund: (ticker: string) => void
  onNavigateToFund: (ticker: string) => void
}

export function PortfolioOverview({ funds, rankings, selectedTicker, onSelectFund, onNavigateToFund }: Props) {
  const totalAum = funds.reduce((s, f) => s + f.overview.aum, 0)
  const avgDist = funds.reduce((s, f) => s + f.overview.distributionRate, 0) / funds.length
  const avgLev = funds.reduce((s, f) => s + f.overview.leverageRatio, 0) / funds.length
  const levFunds = funds.filter(f => f.overview.leverageRatio > 0).length
  const avgExpense = funds.reduce((s, f) => s + f.overview.expenseRatio, 0) / funds.length
  const avgReturn = funds.reduce((s, f) => s + f.performance.return1Y, 0) / funds.length

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

  return (
    <div className="flex flex-col gap-6">
      {/* Decode Banner */}
      <DecodeBanner />

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total AUM" value={`$${totalAum.toFixed(1)}B`} />
        <StatCard label="Avg 1Y Return" value={`${avgReturn.toFixed(1)}%`} />
        <StatCard label="Avg Dist Rate" value={`${avgDist.toFixed(1)}%`} />
        <StatCard label="Avg Leverage" value={`${avgLev.toFixed(1)}%`} />
        <StatCard label="Avg Expense" value={`${avgExpense.toFixed(2)}%`} />
        <StatCard label="Leveraged Funds" value={`${levFunds} / ${funds.length}`} />
      </div>

      {/* Fund Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {funds.map((fund) => {
          const o = fund.overview
          const isSelected = o.ticker === selectedTicker
          const rank = rankings.find(r => r.ticker === o.ticker)
          return (
            <button
              key={o.ticker}
              onClick={() => onNavigateToFund(o.ticker)}
              className={`flex flex-col gap-3 rounded-lg border p-4 text-left transition-all ${
                isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-foreground">{o.ticker}</span>
                  {rank && (
                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                      #{rank.rank}
                    </Badge>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{o.name}</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">AUM</span>
                  <div className="font-mono text-sm text-foreground">${o.aum.toFixed(1)}B</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">P/D</span>
                  <div className={`flex items-center gap-1 font-mono text-sm ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                    {o.premiumDiscount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Dist Rate</span>
                  <div className="font-mono text-sm text-foreground">{o.distributionRate}%</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">1Y Return</span>
                  <div className="font-mono text-sm text-foreground">{fund.performance.return1Y.toFixed(1)}%</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">5-Pillar Composite Ranking</CardTitle>
            <CardDescription>Yield 25% + Discount 25% + X-Ray 20% + Risk 15% + Momentum 15%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="ticker" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number) => [value.toFixed(2), "Score"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {rankBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 0 ? "#4a9eff" : "#f87171"} fillOpacity={1 - index * 0.06} />
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

      {/* 5-Pillar Breakdown Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Scoring Pillar Breakdown</CardTitle>
          <CardDescription>Per-fund 5-pillar scores (0-1 scale, higher is better)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Rank</TableHead>
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map(key => (
                  <TableHead key={key} className="text-muted-foreground text-xs text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span>{PILLAR_LABELS[key]}</span>
                      <span className="text-[9px] text-muted-foreground/60">{(PILLAR_WEIGHTS[key] * 100).toFixed(0)}%</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-muted-foreground text-xs text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((rank) => (
                <TableRow
                  key={rank.ticker}
                  className={`border-border cursor-pointer transition-colors hover:bg-primary/5 ${rank.ticker === selectedTicker ? "bg-primary/5" : ""}`}
                  onClick={() => onNavigateToFund(rank.ticker)}
                >
                  <TableCell className="font-mono text-xs font-bold text-muted-foreground">#{rank.rank}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-primary">{rank.ticker}</TableCell>
                  {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map(key => {
                    const val = rank.pillars[key]
                    const color = val >= 0.7 ? "text-success" : val >= 0.4 ? "text-warning" : "text-destructive"
                    return (
                      <TableCell key={key} className="text-right">
                        <span className={`font-mono text-xs ${color}`}>{val.toFixed(2)}</span>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right font-mono text-xs font-bold text-primary">{rank.score.toFixed(3)}</TableCell>
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
          <CardDescription>Key metrics across all 10 CEFs, ranked by composite score</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Rank</TableHead>
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-xs">Category</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">AUM</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">P/D</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Dist</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Lev</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Expense</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">1Y Ret</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Sharpe</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Z-Score</TableHead>
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
                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">#{rank.rank}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">{o.ticker}</TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{o.category.replace("-", " ")}</TableCell>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-xl font-bold text-foreground">{value}</span>
    </div>
  )
}
