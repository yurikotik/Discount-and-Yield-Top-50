"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts"

interface Props {
  data: CEFProfile
  selectedBasket: number
  onSelectBasket: (index: number) => void
}

function CorrelationBadge({ value }: { value: number }) {
  const color = value >= 0.96 ? "text-success border-success/30" : value >= 0.94 ? "text-primary border-primary/30" : "text-warning border-warning/30"
  return <Badge variant="outline" className={`font-mono text-xs ${color}`}>{value.toFixed(3)}</Badge>
}

export function ProxySection({ data, selectedBasket, onSelectBasket }: Props) {
  const { proxyBaskets, correlationRegimes } = data
  const active = proxyBaskets[selectedBasket]

  const radarData = [
    { metric: "Correlation", b1: proxyBaskets[0].correlation * 100, b2: proxyBaskets[1].correlation * 100, b3: proxyBaskets[2].correlation * 100 },
    { metric: "Low TE", b1: 100 - proxyBaskets[0].trackingError * 25, b2: 100 - proxyBaskets[1].trackingError * 25, b3: 100 - proxyBaskets[2].trackingError * 25 },
    { metric: "Low Cost", b1: 100 - proxyBaskets[0].annualizedCost * 200, b2: 100 - proxyBaskets[1].annualizedCost * 200, b3: 100 - proxyBaskets[2].annualizedCost * 200 },
    { metric: "Liquidity", b1: 90, b2: 84, b3: 92 },
    { metric: "Simplicity", b1: 85, b2: 78, b3: 90 },
  ]

  const corrCompareData = correlationRegimes.map((r) => ({
    name: r.basket.split(" ").slice(0, 2).join(" "),
    "90d": r.corr90d,
    "180d": r.corr180d,
    Stress: r.stressCorr,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Basket Selector */}
      <div className="grid gap-4 md:grid-cols-3">
        {proxyBaskets.map((basket, i) => (
          <button
            key={basket.name}
            onClick={() => onSelectBasket(i)}
            className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-all ${
              selectedBasket === i
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{basket.name}</span>
              {selectedBasket === i && (
                <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Selected</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground">Corr</span>
                <div className="font-mono text-sm text-foreground">{basket.correlation.toFixed(3)}</div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">TE</span>
                <div className="font-mono text-sm text-foreground">{basket.trackingError.toFixed(2)}%</div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Cost</span>
                <div className="font-mono text-sm text-foreground">{basket.annualizedCost.toFixed(2)}%</div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{basket.rationale}</p>
          </button>
        ))}
      </div>

      {/* Correlation Regime Comparison */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm text-foreground">Correlation Regime Analysis</CardTitle>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">90d vs 180d vs Stress</Badge>
          </div>
          <CardDescription>Comparing rolling correlations across time horizons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={corrCompareData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0.8, 1]} tickFormatter={(v) => v.toFixed(2)} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} formatter={(value: number) => [value.toFixed(3), ""]} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)" }} />
                  <Bar dataKey="90d" fill="#4a9eff" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="180d" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Stress" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Basket</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">90d</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">180d</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Stress</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-center">Stable?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correlationRegimes.map((r) => (
                  <TableRow key={r.basket} className="border-border">
                    <TableCell className="text-xs font-medium text-foreground max-w-[120px] truncate">{r.basket}</TableCell>
                    <TableCell className="text-right"><CorrelationBadge value={r.corr90d} /></TableCell>
                    <TableCell className="text-right"><CorrelationBadge value={r.corr180d} /></TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-xs ${r.stressCorr >= 0.92 ? "text-success border-success/30" : "text-warning border-warning/30"}`}>{r.stressCorr.toFixed(3)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.regimeStable ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" /> : <AlertTriangle className="mx-auto h-4 w-4 text-warning" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Radar */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Basket Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="oklch(0.25 0.02 250)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <Radar name="Basket 1" dataKey="b1" stroke="#4a9eff" fill="#4a9eff" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Basket 2" dataKey="b2" stroke="#34d399" fill="#34d399" fillOpacity={0.1} strokeWidth={2} />
                  <Radar name="Basket 3" dataKey="b3" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} strokeWidth={2} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "oklch(0.16 0.018 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px", color: "oklch(0.95 0.01 250)", fontSize: "12px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Selected Basket Detail */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">{active.name}</CardTitle>
            <CardDescription>Tickers: {active.tickers.join(", ")} | Corr: {active.correlation.toFixed(3)} | TE: {active.trackingError.toFixed(2)}%</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Weight</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Visual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.tickers.map((ticker, i) => (
                  <TableRow key={ticker} className="border-border">
                    <TableCell className="font-mono text-xs font-semibold text-primary">{ticker}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{(active.weights[i] * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">
                      <Progress value={active.weights[i] * 100} className="h-1.5 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
