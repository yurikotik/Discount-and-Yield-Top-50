"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts"

interface Props {
  data: CEFProfile
}

export function DriftRegimeSection({ data }: Props) {
  const { driftRegime, overview, factors } = data

  const regimeColor =
    driftRegime.currentRegime === "stable" ? "text-success" :
    driftRegime.currentRegime === "transitioning" ? "text-warning" :
    "text-destructive"

  const regimeBadgeClass =
    driftRegime.currentRegime === "stable" ? "text-success border-success/30" :
    driftRegime.currentRegime === "transitioning" ? "text-warning border-warning/30" :
    "text-destructive border-destructive/30"

  // Compute drift magnitude statistics
  const drift30Values = driftRegime.driftTimeSeries.map(d => d.rolling30d)
  const drift90Values = driftRegime.driftTimeSeries.map(d => d.rolling90d)
  const avg30 = drift30Values.reduce((a, b) => a + b, 0) / drift30Values.length
  const max30 = Math.max(...drift30Values)
  const avg90 = drift90Values.reduce((a, b) => a + b, 0) / drift90Values.length
  const max90 = Math.max(...drift90Values)

  // Compute most volatile factor (highest absolute exposure change potential)
  const topFactors = [...factors]
    .sort((a, b) => Math.abs(b.exposure) - Math.abs(a.exposure))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <DriftMetricCard label="Current Regime" value={driftRegime.currentRegime} className={regimeColor} />
        <DriftMetricCard label="Change Points" value={driftRegime.changePointCount.toString()} />
        <DriftMetricCard label="Avg Drift 30d" value={avg30.toFixed(4)} />
        <DriftMetricCard label="Max Drift 30d" value={max30.toFixed(4)} severity={max30 > 0.04 ? "high" : max30 > 0.025 ? "medium" : "low"} />
        <DriftMetricCard label="Avg Drift 90d" value={avg90.toFixed(4)} />
        <DriftMetricCard label="Max Drift 90d" value={max90.toFixed(4)} severity={max90 > 0.03 ? "high" : max90 > 0.02 ? "medium" : "low"} />
      </div>

      {/* Drift Time Series Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Rolling Factor Drift</CardTitle>
          <CardDescription>30-day and 90-day rolling factor drift magnitude for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={driftRegime.driftTimeSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(3)} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [value.toFixed(4), name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)" }} />
                <Area type="monotone" dataKey="rolling30d" name="30d Drift" stroke="#4a9eff" fill="#4a9eff" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="rolling90d" name="90d Drift" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.08} strokeWidth={2} />
                <ReferenceLine y={0.035} stroke="#f87171" strokeDasharray="5 5" label={{ value: "Alert Threshold", position: "insideTopRight", fill: "#f87171", fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Regime Shifts Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Detected Regime Shifts</CardTitle>
            <CardDescription>Significant change points in factor exposure profile</CardDescription>
          </CardHeader>
          <CardContent>
            {driftRegime.regimeShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No significant regime shifts detected.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">Date</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Factor</TableHead>
                    <TableHead className="text-muted-foreground text-xs text-center">Direction</TableHead>
                    <TableHead className="text-muted-foreground text-xs text-right">Magnitude</TableHead>
                    <TableHead className="text-muted-foreground text-xs text-center">Significance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driftRegime.regimeShifts.map((shift, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="font-mono text-xs text-foreground">{shift.date}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{shift.factor}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {shift.direction === "increase" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className={`text-xs ${shift.direction === "increase" ? "text-success" : "text-destructive"}`}>
                            {shift.direction}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-foreground">{shift.magnitude.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[10px] ${shift.significance === "major" ? "text-destructive border-destructive/30" : "text-warning border-warning/30"}`}>
                          {shift.significance}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Factor Exposures (for context) */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Dominant Factor Exposures</CardTitle>
            <CardDescription>Top 5 factors by absolute exposure (context for drift analysis)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {topFactors.map((f) => (
                <div key={f.factor} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-foreground">{f.factor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-semibold ${f.exposure >= 0 ? "text-primary" : "text-destructive"}`}>
                        {f.exposure >= 0 ? "+" : ""}{f.exposure.toFixed(2)}
                      </span>
                      <Badge variant="outline" className={`text-[9px] ${f.significance === "high" ? "text-success border-success/30" : f.significance === "medium" ? "text-warning border-warning/30" : "text-muted-foreground border-muted-foreground/30"}`}>
                        t={f.tStat.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-secondary">
                    <div
                      className="absolute top-0 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(Math.abs(f.exposure) * 100, 100)}%`,
                        backgroundColor: f.exposure >= 0 ? "#4a9eff" : "#f87171",
                        left: f.exposure < 0 ? "auto" : "0",
                        right: f.exposure < 0 ? "0" : "auto",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regime Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Regime Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Badge variant="outline" className={`shrink-0 text-sm px-3 py-1.5 ${regimeBadgeClass}`}>
              {driftRegime.currentRegime.toUpperCase()}
            </Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {driftRegime.currentRegime === "stable"
                ? `Factor exposures for ${overview.ticker} have been consistent over the analysis period with ${driftRegime.changePointCount} detected change point(s). Rolling drift metrics remain within normal bounds, suggesting the fund manager has maintained a steady strategy allocation.`
                : driftRegime.currentRegime === "transitioning"
                ? `${overview.ticker} is showing signs of factor drift with ${driftRegime.changePointCount} change point(s) detected. The 30-day rolling drift has exceeded baseline thresholds, which may indicate portfolio repositioning or changing market regime. Monitor for continuation.`
                : `${overview.ticker} is in a volatile regime with ${driftRegime.changePointCount} significant change point(s). Factor exposures are shifting materially, which could reflect active repositioning, forced selling, or changing market correlations. Exercise caution with historical factor assumptions.`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DriftMetricCard({ label, value, severity, className }: { label: string; value: string; severity?: "high" | "medium" | "low"; className?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold capitalize ${
        className ? className :
        severity === "high" ? "text-destructive" : severity === "medium" ? "text-warning" : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  )
}
