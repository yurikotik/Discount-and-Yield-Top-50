"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { type FundRanking } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"

interface Props {
  funds: CEFProfile[]
  rankings: FundRanking[]
  onNavigateToFund: (ticker: string) => void
}

export function FundComparison({ funds, rankings, onNavigateToFund }: Props) {
  // Performance ranking bars
  const perfData = funds
    .map(f => ({ ticker: f.overview.ticker, return1Y: f.performance.return1Y }))
    .sort((a, b) => b.return1Y - a.return1Y)

  // Scatter: P/D vs Distribution Rate
  const pdScatter = funds.map(f => ({
    name: f.overview.ticker,
    x: f.overview.premiumDiscount,
    y: f.overview.distributionRate,
    z: f.overview.aum,
  }))

  // Scatter: Sharpe vs Volatility
  const sharpeScatter = funds.map(f => ({
    name: f.overview.ticker,
    x: f.performance.volatility1Y,
    y: f.performance.sharpeRatio,
    z: f.overview.aum,
  }))

  // Radar chart: normalize metrics to 0-100 for top 5 funds by ranking
  const top5Tickers = rankings.slice(0, 5).map(r => r.ticker)
  const radarMetrics = ["Yield", "Discount", "Low Vol", "Low Lev", "Return", "Sharpe"]
  
  const maxes = {
    yield: Math.max(...funds.map(f => f.overview.distributionRate)),
    discount: Math.max(...funds.map(f => -f.overview.premiumDiscount + 15)),
    vol: Math.max(...funds.map(f => 25 - f.performance.volatility1Y)),
    lev: Math.max(...funds.map(f => 50 - f.overview.leverageRatio)),
    ret: Math.max(...funds.map(f => f.performance.return1Y)),
    sharpe: Math.max(...funds.map(f => f.performance.sharpeRatio)),
  }

  const RADAR_COLORS = ["#4a9eff", "#34d399", "#fbbf24", "#f87171", "#a78bfa"]

  // Category breakdown
  const categories = funds.reduce<Record<string, { count: number; avgReturn: number; avgDist: number; totalAum: number }>>((acc, f) => {
    const cat = f.overview.category
    if (!acc[cat]) acc[cat] = { count: 0, avgReturn: 0, avgDist: 0, totalAum: 0 }
    acc[cat].count++
    acc[cat].avgReturn += f.performance.return1Y
    acc[cat].avgDist += f.overview.distributionRate
    acc[cat].totalAum += f.overview.aum
    return acc
  }, {})

  const categoryData = Object.entries(categories).map(([cat, data]) => ({
    category: cat.replace("-", " "),
    count: data.count,
    avgReturn: parseFloat((data.avgReturn / data.count).toFixed(1)),
    avgDist: parseFloat((data.avgDist / data.count).toFixed(1)),
    totalAum: parseFloat(data.totalAum.toFixed(1)),
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* 1Y Performance Ranking */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">1-Year Total Return Ranking</CardTitle>
          <CardDescription>All 10 funds sorted by 1-year price return</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="ticker" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "1Y Return"]}
                />
                <Bar dataKey="return1Y" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {perfData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.return1Y >= 0 ? "#4a9eff" : "#f87171"} fillOpacity={1 - index * 0.06} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* P/D vs Distribution Rate Scatter */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Premium/Discount vs Distribution Rate</CardTitle>
            <CardDescription>Funds at discount with high yield are in the lower-right quadrant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis type="number" dataKey="x" name="P/D" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "Premium/Discount %", position: "insideBottom", offset: -5, fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <YAxis type="number" dataKey="y" name="Dist Rate" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "Dist Rate %", angle: -90, position: "insideLeft", fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <ZAxis type="number" dataKey="z" range={[60, 400]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "P/D") return [`${value.toFixed(1)}%`, "P/D"]
                      if (name === "Dist Rate") return [`${value.toFixed(1)}%`, "Dist Rate"]
                      return [`$${value.toFixed(1)}B`, "AUM"]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={pdScatter} fill="#34d399" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sharpe vs Volatility Scatter */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Sharpe Ratio vs Volatility</CardTitle>
            <CardDescription>Upper-left quadrant = best risk-adjusted returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis type="number" dataKey="x" name="Volatility" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "Volatility 1Y %", position: "insideBottom", offset: -5, fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <YAxis type="number" dataKey="y" name="Sharpe" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "Sharpe Ratio", angle: -90, position: "insideLeft", fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <ZAxis type="number" dataKey="z" range={[60, 400]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "Volatility") return [`${value.toFixed(1)}%`, "Vol 1Y"]
                      if (name === "Sharpe") return [value.toFixed(2), "Sharpe"]
                      return [`$${value.toFixed(1)}B`, "AUM"]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={sharpeScatter} fill="#fbbf24" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Category Summary</CardTitle>
          <CardDescription>Aggregated metrics by fund category</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Category</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Count</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Total AUM</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Avg 1Y Return</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Avg Dist Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryData.map((c) => (
                <TableRow key={c.category} className="border-border">
                  <TableCell className="text-xs font-medium text-foreground capitalize">{c.category}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{c.count}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">${c.totalAum}B</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{c.avgReturn}%</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{c.avgDist}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Full Sortable Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Full Fund Comparison</CardTitle>
          <CardDescription>All 10 CEFs with ranking, return, yield, leverage, and risk metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Rank</TableHead>
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-xs">Sponsor</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">AUM</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">P/D</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Dist</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Lev</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Expense</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">1Y Ret</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Vol 1Y</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Sharpe</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">MaxDD</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Z-Score</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">PSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((rank) => {
                const fund = funds.find(f => f.overview.ticker === rank.ticker)!
                const o = fund.overview
                const p = fund.performance
                return (
                  <TableRow
                    key={o.ticker}
                    className="border-border cursor-pointer transition-colors hover:bg-primary/5"
                    onClick={() => onNavigateToFund(o.ticker)}
                  >
                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">#{rank.rank}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">{o.ticker}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.sponsor}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">${o.aum.toFixed(1)}B</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                        {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.distributionRate}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.leverageRatio > 0 ? `${o.leverageRatio}%` : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.expenseRatio.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{p.return1Y.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{p.volatility1Y.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{p.sharpeRatio.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-destructive">{p.maxDrawdown1Y.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] ${rank.compositeZ >= 0 ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}>
                        {rank.compositeZ >= 0 ? "+" : ""}{rank.compositeZ.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] ${rank.psiResult.regime === "stable" ? "text-success border-success/30" : rank.psiResult.regime === "shifting" ? "text-warning border-warning/30" : "text-destructive border-destructive/30"}`}>
                        {rank.psiResult.psi.toFixed(3)}
                      </Badge>
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
