"use client"

import { costEstimates, proxyExecutionEstimates, formatCurrency } from "@/lib/utf-data"
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
} from "recharts"

export function CostsSection() {
  const totalCostBps = costEstimates.reduce((sum, c) => sum + c.bps, 0)
  const totalCostDollars = costEstimates.reduce((sum, c) => sum + c.dollarAmount, 0)

  const barData = costEstimates.map((c) => ({
    name: c.component.replace("Long UTF ", "").replace("Short Leg ", "Short "),
    bps: c.bps,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Cost (1-Way)</span>
          <span className="font-mono text-xl font-bold text-foreground">{totalCostBps.toFixed(1)} bps</span>
          <span className="text-xs text-muted-foreground">{formatCurrency(totalCostDollars)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Notional Size</span>
          <span className="font-mono text-xl font-bold text-foreground">$50M</span>
          <span className="text-xs text-muted-foreground">Long / Short</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ann. Carry Cost</span>
          <span className="font-mono text-xl font-bold text-warning">~51 bps</span>
          <span className="text-xs text-muted-foreground">Borrow + rebalance</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Execution Window</span>
          <span className="font-mono text-xl font-bold text-foreground">2-4 days</span>
          <span className="text-xs text-muted-foreground">Across proxy baskets</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cost Breakdown Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Cost Breakdown (bps)</CardTitle>
            <CardDescription>Transaction costs at $50M notional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 9 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}bp`} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.018 250)",
                      border: "1px solid oklch(0.25 0.02 250)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 250)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} bps`, "Cost"]}
                  />
                  <Bar dataKey="bps" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.bps > 10 ? "#f87171" : entry.bps > 5 ? "#fbbf24" : "#34d399"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Detail Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Tiered Cost Estimates</CardTitle>
            <CardDescription>Detailed slippage and fee assumptions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Component</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">BPS</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">$$$</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costEstimates.map((c) => (
                  <TableRow key={c.component} className="border-border">
                    <TableCell className="text-xs text-foreground">{c.component}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{c.bps.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(c.dollarAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">{c.tier}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border bg-secondary/30">
                  <TableCell className="text-xs font-semibold text-foreground">Total</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{totalCostBps.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{formatCurrency(totalCostDollars)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Execution Estimates */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Execution Estimates by Proxy Basket</CardTitle>
          <CardDescription>Time-to-execute and market impact for each candidate at $50M notional</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Basket</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Time to Execute</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Market Impact</TableHead>
                <TableHead className="text-muted-foreground text-xs">Liquidity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxyExecutionEstimates.map((e) => (
                <TableRow key={e.basket} className="border-border">
                  <TableCell className="text-xs font-medium text-foreground">{e.basket}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{e.timeToExecute}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">{e.marketImpact}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${e.liquidity === "High" ? "text-success border-success/30" : "text-warning border-warning/30"}`}>
                      {e.liquidity}
                    </Badge>
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
