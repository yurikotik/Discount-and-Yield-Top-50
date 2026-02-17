"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, Zap } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts"

interface Props {
  data: CEFProfile
}

export function LeverageProbeSection({ data }: Props) {
  const { leverageProbe, risk, overview } = data

  const residualBarData = leverageProbe.returnResiduals.map((r) => ({
    period: r.period,
    residual: r.residual,
  }))

  const flagColor = leverageProbe.residualFlagged ? "text-destructive" : "text-success"
  const flagBg = leverageProbe.residualFlagged ? "border-destructive/30" : "border-success/30"

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <ProbeMetric label="Leverage Ratio" value={`${risk.leverageRatio}%`} severity={risk.leverageRatio > 30 ? "high" : risk.leverageRatio > 15 ? "medium" : "low"} />
        <ProbeMetric label="Leverage Type" value={risk.leverageType.split("+")[0].trim()} />
        <ProbeMetric label="Leverage Cost" value={risk.leverageCost} />
        <ProbeMetric label="Monthly Residual" value={`${leverageProbe.realizedVsReconstructed.toFixed(2)}%`} severity={leverageProbe.residualFlagged ? "high" : "low"} />
        <ProbeMetric label="Implied Notional" value={leverageProbe.impliedNotional > 0 ? `$${leverageProbe.impliedNotional}M` : "N/A"} />
        <ProbeMetric label="Residual Flag" value={leverageProbe.residualFlagged ? "FLAGGED" : "CLEAN"} severity={leverageProbe.residualFlagged ? "high" : "low"} />
      </div>

      {/* Flag Banner */}
      {leverageProbe.residualFlagged && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Residual Exceeds 1% Monthly Threshold</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                The gap between realized returns and reconstructed holdings-based returns is {leverageProbe.realizedVsReconstructed.toFixed(2)}% monthly,
                suggesting undisclosed leverage or derivative positions. The implied notional from unobserved instruments is estimated at ${leverageProbe.impliedNotional}M.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Residual Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Return Residuals by Period</CardTitle>
            <CardDescription>Gap between realized and reconstructed returns for {overview.ticker}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={residualBarData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Residual"]}
                  />
                  <Bar dataKey="residual" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {residualBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.residual > 1.0 ? "#f87171" : entry.residual > 0.5 ? "#fbbf24" : "#34d399"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#f87171]" />{"> 1.0% (flagged)"}</div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#fbbf24]" />{"0.5-1.0% (watch)"}</div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#34d399]" />{"< 0.5% (clean)"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Likely Instruments */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Detected / Likely Instruments</CardTitle>
            <CardDescription>Inferred from leverage type, return residuals, and fund filings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {leverageProbe.likelyInstruments.map((inst, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    {inst.includes("Swap") || inst.includes("TRS") ? (
                      <Zap className="h-4 w-4 text-warning" />
                    ) : inst.includes("None") ? (
                      <Shield className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{inst}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {inst.includes("Total Return Swap") ? "Synthetic exposure via counterparty, notional not in reported assets" :
                       inst.includes("Interest Rate") ? "Hedges or amplifies duration exposure off-balance-sheet" :
                       inst.includes("Credit Default") ? "Provides credit protection or synthetic credit exposure" :
                       inst.includes("Options") ? "Generates premium income, caps upside" :
                       inst.includes("Reverse Repo") ? "Traditional secured borrowing against portfolio assets" :
                       inst.includes("Credit Facility") ? "Bank revolving credit line for short-term leverage" :
                       "No derivative instruments detected in filings"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {leverageProbe.impliedNotional > 0 && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Implied Notional Estimate:</strong> ${leverageProbe.impliedNotional}M in off-balance-sheet derivative notional.
                  This is derived from the return residual and does not represent a precise figure.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leverage Decomposition Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Leverage Decomposition</CardTitle>
          <CardDescription>Breakdown of leverage sources for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Component</TableHead>
                <TableHead className="text-muted-foreground text-xs">Type</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border">
                <TableCell className="text-xs font-medium text-foreground">Reported Leverage</TableCell>
                <TableCell className="text-xs text-muted-foreground">{risk.leverageType}</TableCell>
                <TableCell className="text-right"><Badge variant="outline" className="text-[10px] text-success border-success/30">Disclosed</Badge></TableCell>
                <TableCell className="text-right font-mono text-xs text-foreground">{risk.leverageRatio}%</TableCell>
              </TableRow>
              <TableRow className="border-border">
                <TableCell className="text-xs font-medium text-foreground">Return Residual</TableCell>
                <TableCell className="text-xs text-muted-foreground">Unexplained monthly return gap</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={`text-[10px] ${leverageProbe.residualFlagged ? "text-destructive border-destructive/30" : "text-success border-success/30"}`}>
                    {leverageProbe.residualFlagged ? "Flagged" : "Within norm"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-foreground">{leverageProbe.realizedVsReconstructed.toFixed(2)}%/mo</TableCell>
              </TableRow>
              {leverageProbe.impliedNotional > 0 && (
                <TableRow className="border-border">
                  <TableCell className="text-xs font-medium text-foreground">Implied Derivative Notional</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Off-balance-sheet estimated exposure</TableCell>
                  <TableCell className="text-right"><Badge variant="outline" className="text-[10px] text-warning border-warning/30">Estimated</Badge></TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">${leverageProbe.impliedNotional}M</TableCell>
                </TableRow>
              )}
              <TableRow className="border-border">
                <TableCell className="text-xs font-medium text-foreground">Financing Cost</TableCell>
                <TableCell className="text-xs text-muted-foreground">Cost of leverage on reported borrowings</TableCell>
                <TableCell className="text-right"><Badge variant="outline" className="text-[10px] text-primary border-primary/30">Known</Badge></TableCell>
                <TableCell className="text-right font-mono text-xs text-foreground">{risk.leverageCost}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ProbeMetric({ label, value, severity }: { label: string; value: string; severity?: "high" | "medium" | "low" }) {
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
