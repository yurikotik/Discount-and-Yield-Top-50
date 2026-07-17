"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { formatCurrency } from "@/lib/cef-universe"
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

interface Props {
  data: CEFProfile
}

const SECTOR_COLORS = [
  "#117DAE", "#459212", "#D4B40A", "#CA3A41", "#6B7280",
  "#60a5fa", "#fb923c", "#e879f9", "#22d3ee", "#94a3b8",
]

export function HoldingsSection({ data }: Props) {
  const { holdings, sectors, overview } = data

  // Compute concentration metrics from holdings
  const sorted = [...holdings].sort((a, b) => b.weight - a.weight)
  const top5 = sorted.slice(0, 5).reduce((s, h) => s + h.weight, 0)
  const top10 = sorted.slice(0, 10).reduce((s, h) => s + h.weight, 0)
  const top20 = sorted.slice(0, 20).reduce((s, h) => s + h.weight, 0)
  const hhi = sorted.reduce((s, h) => s + (h.weight / 100) ** 2, 0)
  const effPositions = 1 / Math.max(hhi, 0.001)

  const pieData = sectors.map((s, i) => ({
    name: s.sector,
    value: s.weight,
    fill: s.color || SECTOR_COLORS[i % SECTOR_COLORS.length],
  }))

  const barData = sorted.slice(0, 15).map((h) => ({
    name: h.ticker,
    weight: h.weight,
  }))

  return (
    <div className="gy-stack">
      {/* Concentration Metrics */}
      <div className="grid grid-cols-2 gap-4 md:gap-5 md:grid-cols-4 lg:grid-cols-7">
        <ConcentrationCard label="Top 5 Wt." value={`${top5.toFixed(1)}%`} />
        <ConcentrationCard label="Top 10 Wt." value={`${top10.toFixed(1)}%`} />
        <ConcentrationCard label="Top 20 Wt." value={`${top20.toFixed(1)}%`} />
        <ConcentrationCard label="HHI" value={hhi.toFixed(3)} />
        <ConcentrationCard label="Eff. Positions" value={effPositions.toFixed(0)} />
        <ConcentrationCard label="Total Positions" value={holdings.length.toString()} />
        <ConcentrationCard label="AUM" value={`$${overview.aum.toFixed(1)}B`} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sector Pie */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Sector Allocation</CardTitle>
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
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D9D2C8",
                      borderRadius: "8px",
                      color: "#1B242C",
                      fontSize: "16px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {sectors.slice(0, 6).map((s, i) => (
                <div key={s.sector} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color || SECTOR_COLORS[i] }}
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
            <CardTitle className="text-foreground">Top 15 Holdings by Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} domain={[0, "auto"]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} width={65} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D9D2C8",
                      borderRadius: "8px",
                      color: "#1B242C",
                      fontSize: "16px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Weight"]}
                  />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {barData.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={index < 5 ? "#117DAE" : "#459212"} fillOpacity={1 - index * 0.04} />
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
          <CardTitle className="text-foreground">Holdings Detail</CardTitle>
          <CardDescription>USD-weighted positions for {overview.ticker}</CardDescription>
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
                <TableHead className="text-muted-foreground text-xs">Country</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((h, i) => (
                <TableRow key={`${h.ticker}-${i}`} className="border-border">
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{h.name}</TableCell>
                  <TableCell className="font-mono text-xs text-primary">{h.ticker}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.sector}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={h.weight * 12} className="h-1 w-12" />
                      <span className="font-mono text-xs text-foreground">{h.weight}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{formatCurrency(h.marketValue)}</TableCell>
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
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="text-[length:var(--gy-text-xs)] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-base font-semibold text-foreground">{value}</span>
    </div>
  )
}
