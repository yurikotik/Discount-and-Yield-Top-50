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
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from "recharts"

interface Props {
  data: CEFProfile
}

export function CostsSection({ data }: Props) {
  const { costs, slippageTiers, overview } = data
  const totalBps = costs.reduce((s, c) => s + c.bps, 0)
  const totalDollars = costs.reduce((s, c) => s + c.dollarCost, 0)

  const barData = costs.map((c) => ({
    name: c.component.replace("(annual)", "").replace("(quarterly)", "").trim(),
    bps: c.bps,
  }))

  const slippageCurveData = slippageTiers.map((t) => ({
    band: t.notionalBand,
    "Bid-Ask": t.bidAskSlippage,
    "Market Impact": t.marketImpact,
    Total: t.totalSlippage,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Total Cost (Yr-1)" main={`${totalBps} bps`} sub={formatCurrency(totalDollars)} />
        <SummaryCard label="Notional" main="$50M" sub="Long / Short" />
        <SummaryCard label="Ann. Carry" main={`~${costs.find(c => c.component.includes("Borrow"))?.bps ?? 0} bps`} sub="Short borrow" />
        <SummaryCard label="Execution" main="2-4 days" sub={`For ${overview.ticker} proxy`} />
      </div>

      {/* Tiered Slippage */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Tiered Slippage by Notional Band</CardTitle>
          <CardDescription>Escalating slippage assumptions for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slippageCurveData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis dataKey="band" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}bp`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} formatter={(value: number) => [`${value} bps`, ""]} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)" }} />
                  <Bar dataKey="Bid-Ask" stackId="a" fill="#4a9eff" maxBarSize={24} />
                  <Bar dataKey="Market Impact" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Band</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Bid-Ask</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Impact</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slippageTiers.map((t) => (
                  <TableRow key={t.notionalBand} className={`border-border ${t.notionalBand === "$25M - $50M" ? "bg-primary/5" : ""}`}>
                    <TableCell className="text-xs font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        {t.notionalBand}
                        {t.notionalBand === "$25M - $50M" && <Badge className="bg-primary/20 text-primary border-0 text-[9px]">Current</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{t.bidAskSlippage} bps</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{t.marketImpact} bps</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      <span className={t.totalSlippage > 25 ? "text-destructive" : t.totalSlippage > 12 ? "text-warning" : "text-success"}>{t.totalSlippage} bps</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 9 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}bp`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} formatter={(value: number) => [`${value} bps`, "Cost"]} />
                  <Bar dataKey="bps" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.bps > 15 ? "#f87171" : entry.bps > 5 ? "#fbbf24" : "#34d399"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Cost Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Component</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">BPS</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Dollar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((c) => (
                  <TableRow key={c.component} className="border-border">
                    <TableCell className="text-xs text-foreground">{c.component}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{c.bps}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(c.dollarCost)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border bg-secondary/30">
                  <TableCell className="text-xs font-semibold text-foreground">Total</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{totalBps}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{formatCurrency(totalDollars)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({ label, main, sub }: { label: string; main: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-xl font-bold text-foreground">{main}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}
