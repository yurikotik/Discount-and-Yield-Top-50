"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { type FundRanking, type PillarScores, PILLAR_LABELS, PILLAR_WEIGHTS } from "@/lib/cef-universe"
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
  const radarMetrics = ["Current Yield", "NAV Discount", "Low Vol", "Low Lev", "Return", "Sharpe"]
  
  const maxes = {
    yield: Math.max(...funds.map(f => f.overview.distributionRate)),
    discount: Math.max(...funds.map(f => -f.overview.premiumDiscount + 15)),
    vol: Math.max(...funds.map(f => 25 - f.performance.volatility1Y)),
    lev: Math.max(...funds.map(f => 50 - f.overview.leverageRatio)),
    ret: Math.max(...funds.map(f => f.performance.return1Y)),
    sharpe: Math.max(...funds.map(f => f.performance.sharpeRatio)),
  }

  const RADAR_COLORS = ["#117DAE", "#459212", "#D4B40A", "#CA3A41", "#6B7280"]

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
    <div className="gy-stack">
      {/* 1Y Performance Ranking */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">1-Year Total Return Ranking</CardTitle>
          <CardDescription>All 10 funds sorted by 1-year price return</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="ticker" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} width={48} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "1Y Return"]}
                />
                <Bar dataKey="return1Y" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {perfData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.return1Y >= 0 ? "#117DAE" : "#CA3A41"} fillOpacity={1 - index * 0.06} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* P/D vs Distribution Rate Scatter */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">NAV Discount vs Current Yield</CardTitle>
            <CardDescription>Funds at NAV discount with high current yield are in the lower-right quadrant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" />
                  <XAxis type="number" dataKey="x" name="P/D" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "NAV Discount %", position: "insideBottom", offset: -5, fill: "#4A5560", fontSize: 13 }} />
                  <YAxis type="number" dataKey="y" name="Dist Rate" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "Current Yield %", angle: -90, position: "insideLeft", fill: "#4A5560", fontSize: 13 }} />
                  <ZAxis type="number" dataKey="z" range={[60, 400]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "P/D") return [`${value.toFixed(1)}%`, "P/D"]
                      if (name === "Dist Rate") return [`${value.toFixed(1)}%`, "Current Yield"]
                      return [`$${value.toFixed(1)}B`, "AUM"]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={pdScatter} fill="#459212" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sharpe vs Volatility Scatter */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Sharpe Ratio vs Volatility</CardTitle>
            <CardDescription>Upper-left quadrant = best risk-adjusted returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" />
                  <XAxis type="number" dataKey="x" name="Volatility" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: "Volatility 1Y %", position: "insideBottom", offset: -5, fill: "#4A5560", fontSize: 13 }} />
                  <YAxis type="number" dataKey="y" name="Sharpe" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} label={{ value: "Sharpe Ratio", angle: -90, position: "insideLeft", fill: "#4A5560", fontSize: 13 }} />
                  <ZAxis type="number" dataKey="z" range={[60, 400]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "Volatility") return [`${value.toFixed(1)}%`, "Vol 1Y"]
                      if (name === "Sharpe") return [value.toFixed(2), "Sharpe"]
                      return [`$${value.toFixed(1)}B`, "AUM"]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={sharpeScatter} fill="#D4B40A" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">Category Summary</CardTitle>
          <CardDescription>Aggregated metrics by fund category</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)]">Category</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Count</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Total AUM</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Avg 1Y Return</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Average Current Yield</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryData.map((c) => (
                <TableRow key={c.category} className="border-border">
                  <TableCell className="text-[length:var(--gy-text-sm)] font-medium text-foreground capitalize">{c.category}</TableCell>
                  <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{c.count}</TableCell>
                  <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">${c.totalAum}B</TableCell>
                  <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{c.avgReturn}%</TableCell>
                  <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{c.avgDist}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5-Pillar Heatmap */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">5-Pillar Scoring Heatmap</CardTitle>
          <CardDescription>Score = 0.25 Yield + 0.25 Discount + 0.20 X-Ray + 0.15 Risk + 0.15 Momentum | Selection rule: rank by composite, tie-break on deeper discount, stronger coverage, lower drift</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)]">#</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)]">Ticker</TableHead>
                {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map(key => (
                  <TableHead key={key} className="text-muted-foreground text-[length:var(--gy-text-sm)] text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[length:var(--gy-text-xs)]">{PILLAR_LABELS[key]}</span>
                      <span className="text-[8px] text-muted-foreground/60">{(PILLAR_WEIGHTS[key] * 100).toFixed(0)}%</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Score</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">PSI</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-center">Filter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((rank) => (
                <TableRow
                  key={rank.ticker}
                  className="border-border cursor-pointer transition-colors hover:bg-primary/5"
                  onClick={() => onNavigateToFund(rank.ticker)}
                >
                  <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-muted-foreground">#{rank.rank}</TableCell>
                  <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-primary">{rank.ticker}</TableCell>
                  {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map(key => {
                    const val = rank.pillars[key]
                    const bg =
                      val >= 0.7
                        ? "gy-chip-green"
                        : val >= 0.4
                          ? "gy-chip-yellow"
                          : "gy-chip-red"
                    return (
                      <TableCell key={key} className="text-center p-1">
                        <span
                          className={`inline-block rounded px-2 py-1 font-mono text-[length:var(--gy-text-sm)] font-semibold ${bg}`}
                        >
                          {val.toFixed(2)}
                        </span>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] font-bold text-primary">{rank.score.toFixed(3)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`font-mono text-[length:var(--gy-text-xs)] ${rank.psiResult.regime === "stable" ? "text-success border-success/30" : rank.psiResult.regime === "shifting" ? "text-warning border-warning/30" : "text-destructive border-destructive/30"}`}>
                      {rank.psiResult.regime}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {rank.passesFilter ? (
                      <Badge variant="outline" className="text-[length:var(--gy-text-xs)] text-success border-success/30">PASS</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[length:var(--gy-text-xs)] text-destructive border-destructive/30" title={rank.filterReasons.join("; ")}>FAIL</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Full Sortable Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">Full Fund Comparison</CardTitle>
          <CardDescription>All 10 CEFs with ranking, return, yield, leverage, and risk metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)]">Rank</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)]">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)]">Sponsor</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">AUM</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">ADV</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">P/D</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Current Yield</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Vol</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">1Y Ret</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">90d Ret</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">UNII</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Dist Cov</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Z</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">PSI</TableHead>
                <TableHead className="text-muted-foreground text-[length:var(--gy-text-sm)] text-right">Score</TableHead>
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
                    <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        #{rank.rank}
                        {!rank.passesFilter && <span className="text-[8px] text-warning" title={rank.filterReasons.join("; ")}>!</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-primary">{o.ticker}</TableCell>
                    <TableCell className="text-[length:var(--gy-text-sm)] text-muted-foreground">{o.sponsor}</TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">${o.aum.toFixed(1)}B</TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">${o.adv.toFixed(1)}M</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-[length:var(--gy-text-sm)] ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                        {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{o.distributionRate}%</TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{p.volatility1Y.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{p.return1Y.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{o.return90d.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">${o.unii.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] text-foreground">{o.distributionCoverage.toFixed(2)}x</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[length:var(--gy-text-xs)] ${rank.compositeZ >= 0 ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}>
                        {rank.compositeZ >= 0 ? "+" : ""}{rank.compositeZ.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[length:var(--gy-text-xs)] ${rank.psiResult.regime === "stable" ? "text-success border-success/30" : rank.psiResult.regime === "shifting" ? "text-warning border-warning/30" : "text-destructive border-destructive/30"}`}>
                        {rank.psiResult.psi.toFixed(3)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-[length:var(--gy-text-sm)] font-bold text-primary">{rank.score.toFixed(3)}</span>
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
