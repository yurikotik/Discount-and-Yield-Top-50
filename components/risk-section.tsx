"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Info } from "lucide-react"
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
} from "recharts"

interface Props {
  data: CEFProfile
}

export function RiskSection({ data }: Props) {
  const { risk, overview, performance, navHistory, caveats } = data

  // Premium/Discount history from nav data
  const pdHistory = navHistory.map(h => ({
    date: h.date,
    pd: parseFloat(((h.price - h.nav) / h.nav * 100).toFixed(2)),
  }))

  // Drawdown simulation from NAV
  let peak = navHistory[0]?.nav || 1
  const drawdownData = navHistory.map(h => {
    if (h.nav > peak) peak = h.nav
    const dd = ((h.nav - peak) / peak) * 100
    return { date: h.date, drawdown: parseFloat(dd.toFixed(2)) }
  })

  // Risk summary bars
  const riskBars = [
    { label: "Leverage", value: risk.leverageRatio, max: 50, color: risk.leverageRatio > 30 ? "#f87171" : risk.leverageRatio > 15 ? "#fbbf24" : "#34d399" },
    { label: "Volatility 1Y", value: risk.volatility1Y, max: 25, color: risk.volatility1Y > 18 ? "#f87171" : risk.volatility1Y > 12 ? "#fbbf24" : "#34d399" },
    { label: "Expense Ratio", value: risk.expenseRatio, max: 4, color: risk.expenseRatio > 2.5 ? "#f87171" : risk.expenseRatio > 1.5 ? "#fbbf24" : "#34d399" },
    { label: "Drawdown", value: Math.abs(risk.drawdownFromPeak), max: 15, color: Math.abs(risk.drawdownFromPeak) > 10 ? "#f87171" : Math.abs(risk.drawdownFromPeak) > 5 ? "#fbbf24" : "#34d399" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Risk Summary Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        <RiskMetric label="Leverage" value={`${risk.leverageRatio}%`} severity={risk.leverageRatio > 30 ? "high" : risk.leverageRatio > 15 ? "medium" : "low"} />
        <RiskMetric label="Lev. Type" value={risk.leverageType.split("+")[0].trim()} />
        <RiskMetric label="Lev. Cost" value={risk.leverageCost} />
        <RiskMetric label="Expense" value={`${risk.expenseRatio.toFixed(2)}%`} />
        <RiskMetric label="Mgmt Fee" value={`${risk.managementFee.toFixed(2)}%`} />
        <RiskMetric label="Vol 90d" value={`${risk.volatility90d}%`} />
        <RiskMetric label="P/D %ile" value={`${risk.premiumDiscountPercentile}th`} />
        <RiskMetric label="Z-Score P/D" value={risk.zScoreDiscount.toFixed(2)} severity={Math.abs(risk.zScoreDiscount) > 1.5 ? "high" : Math.abs(risk.zScoreDiscount) > 0.8 ? "medium" : "low"} />
      </div>

      {/* Risk Gauge Bars */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Risk Factor Gauges</CardTitle>
          <CardDescription>Key risk factors relative to their typical ranges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            {riskBars.map((bar) => (
              <div key={bar.label} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{bar.label}</span>
                  <span className="font-mono text-xs font-semibold text-foreground">{bar.value.toFixed(1)}{bar.label === "Expense Ratio" ? "%" : bar.label === "Drawdown" ? "%" : "%"}</span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-secondary">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min((bar.value / bar.max) * 100, 100)}%`,
                      backgroundColor: bar.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Premium/Discount History */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Premium / Discount History</CardTitle>
            <CardDescription>Current: {risk.premiumDiscountCurrent >= 0 ? "+" : ""}{risk.premiumDiscountCurrent.toFixed(1)}% | 1Y Avg: {risk.premiumDiscount1YAvg >= 0 ? "+" : ""}{risk.premiumDiscount1YAvg.toFixed(1)}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pdHistory} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Premium/Discount"]}
                  />
                  <Area type="monotone" dataKey="pd" stroke="#f87171" fill="#f87171" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Drawdown Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">NAV Drawdown from Peak</CardTitle>
            <CardDescription>Max 1Y drawdown: {performance.maxDrawdown1Y.toFixed(1)}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={["auto", 0]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Drawdown"]}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke="#f87171" fill="#f87171" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Performance Snapshot</CardTitle>
          <CardDescription>Returns and risk-adjusted metrics for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <PerfCell label="YTD" value={`${performance.returnYTD.toFixed(1)}%`} positive={performance.returnYTD >= 0} />
            <PerfCell label="1Y Total" value={`${performance.return1Y.toFixed(1)}%`} positive={performance.return1Y >= 0} />
            <PerfCell label="3Y Ann." value={`${performance.return3Y.toFixed(1)}%`} positive={performance.return3Y >= 0} />
            <PerfCell label="5Y Ann." value={`${performance.return5Y.toFixed(1)}%`} positive={performance.return5Y >= 0} />
            <PerfCell label="Sharpe" value={performance.sharpeRatio.toFixed(2)} positive={performance.sharpeRatio >= 0.5} />
          </div>
        </CardContent>
      </Card>

      {/* Caveats */}
      {caveats.length > 0 && (
        <Card className="border-warning/30 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <CardTitle className="text-sm text-foreground">Risk Caveats & Disclaimers</CardTitle>
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
    </div>
  )
}

function RiskMetric({ label, value, severity }: { label: string; value: string; severity?: "high" | "medium" | "low" }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${
        severity === "high" ? "text-destructive" : severity === "medium" ? "text-warning" : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  )
}

function PerfCell({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-secondary/20 p-3 text-center">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-lg font-bold ${positive ? "text-success" : "text-destructive"}`}>{value}</span>
    </div>
  )
}
