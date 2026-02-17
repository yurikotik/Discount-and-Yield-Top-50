"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { formatCurrency } from "@/lib/cef-universe"
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
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts"

interface Props {
  data: CEFProfile
}

export function HedgeSection({ data }: Props) {
  const { hedgeSimulation: sim, overview } = data

  // Downsample PnL for rendering (every 5th day)
  const pnlSampled = sim.dailyPnl.filter((_, i) => i % 5 === 0)

  // Build histogram
  const allPnl = sim.dailyPnl.map(d => d.pnl)
  const pnlHistogram = buildHistogram(allPnl)

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Hedge Ratio" value={sim.hedgeRatio.toFixed(2)} />
        <StatCard label="Notional" value={formatCurrency(sim.notional)} />
        <StatCard label="Realized TE" value={`${sim.realizedTrackingError.toFixed(2)}%`} />
        <StatCard label="Sharpe" value={sim.sharpeRatio.toFixed(2)} />
        <StatCard label="Max Drawdown" value={formatCurrency(sim.maxDrawdown)} negative />
        <StatCard label="Basis Risk" value={`${(sim.basisRisk * 100).toFixed(1)}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cumulative P&L */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Cumulative P&L (Long {overview.ticker} / Short Proxy)</CardTitle>
            <CardDescription>{sim.dailyPnl.length}-day simulation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pnlSampled} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis dataKey="day" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number) => [formatCurrency(value), "Cum. P&L"]}
                  />
                  <ReferenceLine y={0} stroke="oklch(0.40 0.02 250)" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="cumulative" stroke="#4a9eff" fill="#4a9eff" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* P&L Histogram */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Daily P&L Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlHistogram} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <XAxis dataKey="range" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} />
                  <Bar dataKey="count" name="Days" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {pnlHistogram.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.midpoint >= 0 ? "#34d399" : "#f87171"} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Analysis */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Scenario Analysis</CardTitle>
          <CardDescription>Stress testing under adverse conditions for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Scenario</TableHead>
                <TableHead className="text-muted-foreground text-xs">Description</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Est. P&L</TableHead>
                <TableHead className="text-muted-foreground text-xs">Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sim.scenarios.map((s) => (
                <TableRow key={s.scenario} className="border-border">
                  <TableCell className="text-xs font-semibold text-foreground">{s.scenario}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[280px]">{s.description}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">{formatCurrency(s.pnlImpact)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">{s.probability}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-base font-semibold ${negative ? "text-destructive" : "text-foreground"}`}>{value}</span>
    </div>
  )
}

function buildHistogram(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const buckets = 12
  const step = (max - min) / buckets || 1
  const histogram = Array.from({ length: buckets }, (_, i) => ({
    range: `${((min + i * step) / 1000).toFixed(0)}K`,
    count: 0,
    midpoint: min + (i + 0.5) * step,
  }))
  values.forEach((v) => {
    const idx = Math.min(Math.floor((v - min) / step), buckets - 1)
    histogram[idx].count++
  })
  return histogram
}
