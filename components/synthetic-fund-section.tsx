"use client"

import { type SyntheticHedgeFund, type WeightingRule, type CEFProfile, formatCurrency } from "@/lib/cef-universe"
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
  PieChart,
  Pie,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts"

interface Props {
  fund: SyntheticHedgeFund
  weightingRule: WeightingRule
  onChangeRule: (rule: WeightingRule) => void
  profiles: CEFProfile[]
}

const WEIGHT_RULES: { value: WeightingRule; label: string; description: string }[] = [
  { value: "aum-weighted", label: "AUM-Weighted", description: "Weight proportional to fund AUM" },
  { value: "risk-parity", label: "Risk-Parity", description: "Weight inversely proportional to tracking error" },
  { value: "equal-risk", label: "Equal Risk", description: "Equal 1/N allocation" },
]

const ALLOC_COLORS = [
  "#4a9eff", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
  "#fb923c", "#60a5fa", "#e879f9", "#22d3ee", "#94a3b8",
]

export function SyntheticFundSection({ fund, weightingRule, onChangeRule, profiles }: Props) {
  const m = fund.portfolioMetrics

  // Allocation pie data
  const allocPieData = fund.allocations.map((a, i) => ({
    name: a.ticker,
    value: parseFloat((a.weight * 100).toFixed(1)),
    fill: ALLOC_COLORS[i],
  }))

  // Factor concentration bar data
  const factorData = fund.factorConcentration.slice(0, 8).map(f => ({
    name: f.factor,
    exposure: f.exposure,
  }))

  // Sampled combined PnL
  const pnlSampled = fund.combinedPnl.filter((_, i) => i % 5 === 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Weighting Rule Selector */}
      <div className="grid gap-3 md:grid-cols-3">
        {WEIGHT_RULES.map((rule) => (
          <button
            key={rule.value}
            onClick={() => onChangeRule(rule.value)}
            className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition-all ${
              weightingRule === rule.value
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{rule.label}</span>
              {weightingRule === rule.value && (
                <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Active</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          </button>
        ))}
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        <MetricCard label="Total Notional" value={formatCurrency(fund.totalNotional)} />
        <MetricCard label="Wtd Correlation" value={m.weightedCorrelation.toFixed(3)} color={m.weightedCorrelation >= 0.95 ? "text-success" : "text-warning"} />
        <MetricCard label="Portfolio TE" value={`${m.portfolioTrackingError.toFixed(2)}%`} />
        <MetricCard label="Diversification" value={`${m.diversificationRatio.toFixed(2)}x`} />
        <MetricCard label="Agg Max DD" value={formatCurrency(m.aggregateMaxDrawdown)} color="text-destructive" />
        <MetricCard label="Total Borrow" value={formatCurrency(m.totalBorrowCost)} />
        <MetricCard label="Total Slippage" value={formatCurrency(m.totalSlippage)} />
        <MetricCard label="Net Beta" value={m.netBeta.toFixed(4)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Portfolio Composition Pie */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Portfolio Composition</CardTitle>
            <CardDescription>Allocation by CEF ({fund.weightingRule.replace("-", " ")})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                    {allocPieData.map((entry, i) => (<Cell key={`cell-${i}`} fill={entry.fill} />))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} formatter={(value: number) => [`${value.toFixed(1)}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {fund.allocations.map((a, i) => (
                <div key={a.ticker} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ALLOC_COLORS[i] }} />
                  <span className="font-mono text-muted-foreground">{a.ticker}</span>
                  <span className="ml-auto font-mono text-foreground">{(a.weight * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Factor Concentration */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Net Factor Concentration</CardTitle>
            <CardDescription>Weighted aggregate factor exposures across all 10 funds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factorData} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <XAxis type="number" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} formatter={(value: number) => [value.toFixed(3), "Exposure"]} />
                  <Bar dataKey="exposure" radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {factorData.map((entry, i) => (<Cell key={`cell-${i}`} fill={entry.exposure >= 0 ? "#4a9eff" : "#f87171"} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined P&L */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Combined Portfolio P&L</CardTitle>
          <CardDescription>Aggregate long CEF / short proxy simulation across all 10 funds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlSampled} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                <XAxis dataKey="day" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} formatter={(value: number) => [formatCurrency(value), ""]} />
                <ReferenceLine y={0} stroke="oklch(0.40 0.02 250)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="cumulative" stroke="#4a9eff" fill="#4a9eff" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Execution Plan Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Execution Plan</CardTitle>
          <CardDescription>Per-fund notional allocation, proxy selection, borrow cost, and execution estimates</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Weight</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Notional</TableHead>
                <TableHead className="text-muted-foreground text-xs">Proxy Basket</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">H. Ratio</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Corr</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">TE</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Slippage</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Borrow</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Exec Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fund.allocations.map((a) => (
                <TableRow key={a.ticker} className="border-border">
                  <TableCell className="font-mono text-xs font-bold text-primary">{a.ticker}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{(a.weight * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{formatCurrency(a.notional)}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{a.proxyBasket.tickers.join(", ")}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{a.hedgeRatio.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`font-mono text-[10px] ${a.correlation >= 0.96 ? "text-success border-success/30" : a.correlation >= 0.93 ? "text-primary border-primary/30" : "text-warning border-warning/30"}`}>
                      {a.correlation.toFixed(3)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{a.trackingError.toFixed(2)}%</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{a.slippage}bp</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{a.borrowCost}bp</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{a.executionDays}d</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-border bg-secondary/30">
                <TableCell className="text-xs font-semibold text-foreground">Total</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-foreground">100%</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{formatCurrency(fund.totalNotional)}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{m.weightedCorrelation.toFixed(3)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{m.portfolioTrackingError.toFixed(2)}%</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{formatCurrency(m.totalSlippage)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{formatCurrency(m.totalBorrowCost)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cross-Fund Correlation Heatmap (simplified as table) */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Cross-Fund Residual Correlation Matrix</CardTitle>
          <CardDescription>Correlation of hedge residuals between fund pairs</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs w-12" />
                {profiles.map(p => (
                  <TableHead key={p.overview.ticker} className="text-muted-foreground text-xs text-center font-mono w-12">{p.overview.ticker}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p, i) => (
                <TableRow key={p.overview.ticker} className="border-border">
                  <TableCell className="font-mono text-xs font-bold text-primary">{p.overview.ticker}</TableCell>
                  {fund.crossCorrelationMatrix[i]?.map((corr, j) => (
                    <TableCell key={j} className="text-center p-1">
                      <div
                        className="mx-auto flex h-8 w-10 items-center justify-center rounded text-[10px] font-mono"
                        style={{
                          backgroundColor: i === j
                            ? "oklch(0.25 0.02 250)"
                            : `oklch(${0.25 + corr * 0.15} ${corr * 0.05} ${corr > 0.5 ? 25 : 230})`,
                          color: "oklch(0.90 0.01 250)",
                        }}
                      >
                        {i === j ? "1.00" : corr.toFixed(2)}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${color || "text-foreground"}`}>{value}</span>
    </div>
  )
}
