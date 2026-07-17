"use client"

import type { CEFProfile } from "@/lib/cef-universe"
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
  AreaChart,
  Area,
  Legend,
} from "recharts"

interface Props {
  data: CEFProfile
}

const TYPE_COLORS: Record<string, string> = {
  income: "#117DAE",
  roc: "#CA3A41",
  "capital-gain": "#459212",
  mixed: "#D4B40A",
}

export function IncomeSection({ data }: Props) {
  const { distributions, overview, performance } = data

  // Distribution bar chart data
  const barData = distributions.map((d) => ({
    date: d.date,
    amount: d.amount,
    type: d.type,
  }))

  // Yield metrics
  const yieldOnNav = overview.distributionRate
  const yieldOnPrice = ((overview.distributionRate / 100 * overview.navPerShare) / overview.marketPrice * 100)
  const annualDist = distributions.slice(-12).reduce((s, d) => s + d.amount, 0)
  const priorYearDist = distributions.slice(0, 12).reduce((s, d) => s + d.amount, 0)
  const distGrowth = priorYearDist > 0 ? ((annualDist - priorYearDist) / priorYearDist * 100) : 0

  // Distribution type breakdown
  const typeBreakdown = distributions.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + d.amount
    return acc
  }, {})
  const totalDist = Object.values(typeBreakdown).reduce((a, b) => a + b, 0)
  const typeData = Object.entries(typeBreakdown).map(([type, amount]) => ({
    type: type === "roc" ? "Return of Capital" : type === "capital-gain" ? "Capital Gains" : type === "mixed" ? "Mixed" : "Income",
    amount: parseFloat(amount.toFixed(4)),
    pct: parseFloat((amount / totalDist * 100).toFixed(1)),
    color: TYPE_COLORS[type] || "#64748b",
  }))

  // Cumulative distribution chart
  let cumulative = 0
  const cumulativeData = distributions.map((d) => {
    cumulative += d.amount
    return { date: d.date, cumulative: parseFloat(cumulative.toFixed(4)) }
  })

  // Payout ratio estimate (simplified): annualized distribution / NAV return
  const payoutRatio = performance.navReturn1Y > 0
    ? (overview.distributionRate / performance.navReturn1Y * 100)
    : 999

  return (
    <div className="gy-stack">
      {/* Yield Metrics */}
      <div className="grid grid-cols-2 gap-4 md:gap-5 md:grid-cols-4 lg:grid-cols-7">
        <MetricCard label="Yield on NAV" value={`${yieldOnNav.toFixed(1)}%`} />
        <MetricCard label="Yield on Price" value={`${yieldOnPrice.toFixed(1)}%`} />
        <MetricCard label="Annual Dist" value={`$${annualDist.toFixed(2)}`} />
        <MetricCard label="Dist Growth" value={`${distGrowth >= 0 ? "+" : ""}${distGrowth.toFixed(1)}%`} highlight={distGrowth >= 0 ? "positive" : "negative"} />
        <MetricCard label="Frequency" value={distributions[0]?.frequency || "monthly"} />
        <MetricCard label="Payout Ratio" value={payoutRatio < 200 ? `${payoutRatio.toFixed(0)}%` : ">200%"} highlight={payoutRatio > 100 ? "negative" : "positive"} />
        <MetricCard label="NAV per Share" value={`$${overview.navPerShare.toFixed(2)}`} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Distribution History Bar Chart */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Distribution History</CardTitle>
            <CardDescription>Monthly distributions for {overview.ticker}, colored by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                    formatter={(value: number) => [`$${value.toFixed(4)}`, "Distribution"]}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={20}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type] || "#117DAE"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-4">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground capitalize">{type === "roc" ? "Return of Capital" : type === "capital-gain" ? "Capital Gains" : type}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribution Composition */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Distribution Composition</CardTitle>
            <CardDescription>Source breakdown over full period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {typeData.map((t) => (
                <div key={t.type} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: t.color }} />
                      <span className="text-xs text-foreground">{t.type}</span>
                    </div>
                    <span className="font-mono text-xs text-foreground">{t.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[length:var(--gy-text-xs)] leading-relaxed text-muted-foreground">
                <strong className="text-foreground">ROC Warning:</strong> Return of capital distributions reduce cost basis and may indicate the fund is paying out more than it earns. A payout ratio above 100% is a caution signal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Distribution Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">Cumulative Distributions</CardTitle>
          <CardDescription>Running total of per-share distributions for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" />
                <XAxis dataKey="date" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Cumulative"]}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#459212" fill="#459212" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: "positive" | "negative" }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="text-[length:var(--gy-text-xs)] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-base font-semibold ${
        highlight === "positive" ? "text-success" : highlight === "negative" ? "text-destructive" : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  )
}
