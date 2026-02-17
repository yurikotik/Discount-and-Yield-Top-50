"use client"

import { holdings, sectorExposures, concentrationMetrics, formatCurrency } from "@/lib/utf-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Tooltip as RechartsTooltip,
} from "recharts"

const SECTOR_COLORS = [
  "#4a9eff", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
  "#60a5fa", "#fb923c", "#e879f9", "#22d3ee", "#94a3b8",
]

function LiquidityBadge({ score }: { score: number }) {
  if (score >= 90) return <Badge className="bg-success/20 text-success border-0 text-[10px]">High</Badge>
  if (score >= 75) return <Badge className="bg-warning/20 text-warning border-0 text-[10px]">Med</Badge>
  return <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">Low</Badge>
}

export function HoldingsSection() {
  const pieData = sectorExposures.map((s, i) => ({
    name: s.sector,
    value: s.weight,
    fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
  }))

  const barData = holdings.slice(0, 15).map((h) => ({
    name: h.ticker,
    weight: h.weight,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Concentration Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        <ConcentrationCard label="Top 5 Wt." value={`${concentrationMetrics.top5Weight}%`} />
        <ConcentrationCard label="Top 10 Wt." value={`${concentrationMetrics.top10Weight}%`} />
        <ConcentrationCard label="Top 20 Wt." value={`${concentrationMetrics.top20Weight}%`} />
        <ConcentrationCard label="HHI" value={concentrationMetrics.herfindahlIndex.toFixed(3)} />
        <ConcentrationCard label="Eff. Positions" value={concentrationMetrics.effectivePositions.toFixed(0)} />
        <ConcentrationCard label="Total Positions" value={concentrationMetrics.totalPositions.toString()} />
        <ConcentrationCard label="Avg Liquidity" value={concentrationMetrics.avgLiquidityScore.toFixed(0)} />
        <ConcentrationCard label="Med. Liquidity" value={concentrationMetrics.medianLiquidityScore.toString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sector Pie */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Sector Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.018 250)",
                      border: "1px solid oklch(0.25 0.02 250)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 250)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {sectorExposures.slice(0, 6).map((s, i) => (
                <div key={s.sector} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SECTOR_COLORS[i] }}
                  />
                  <span className="text-muted-foreground truncate">{s.sector}</span>
                  <span className="ml-auto font-mono text-foreground">{s.weight}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Holdings Bar */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Top 15 Holdings by Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 8]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.018 250)",
                      border: "1px solid oklch(0.25 0.02 250)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 250)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Weight"]}
                  />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {barData.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={index < 5 ? "#4a9eff" : "#34d399"} fillOpacity={1 - index * 0.04} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Top 20 Holdings Detail</CardTitle>
          <CardDescription>USD-weighted positions with liquidity scores</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">#</TableHead>
                <TableHead className="text-muted-foreground text-xs">Issuer</TableHead>
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-xs">Sector</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Weight</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Mkt Value</TableHead>
                <TableHead className="text-muted-foreground text-xs text-center">Liquidity</TableHead>
                <TableHead className="text-muted-foreground text-xs">Country</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => (
                <TableRow key={h.rank} className="border-border">
                  <TableCell className="font-mono text-xs text-muted-foreground">{h.rank}</TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{h.issuer}</TableCell>
                  <TableCell className="font-mono text-xs text-primary">{h.ticker}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.sector}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={h.weight * 12} className="h-1 w-12" />
                      <span className="font-mono text-xs text-foreground">{h.weight}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{formatCurrency(h.marketValue)}</TableCell>
                  <TableCell className="text-center">
                    <LiquidityBadge score={h.liquidityScore} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.country}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ConcentrationCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-base font-semibold text-foreground">{value}</span>
    </div>
  )
}
