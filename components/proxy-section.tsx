"use client"

import { useState } from "react"
import { proxyBaskets } from "@/lib/utf-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

function CorrelationBadge({ value }: { value: number }) {
  const color = value >= 0.96 ? "text-success border-success/30" : value >= 0.94 ? "text-primary border-primary/30" : "text-warning border-warning/30"
  return (
    <Badge variant="outline" className={`font-mono text-xs ${color}`}>
      {value.toFixed(3)}
    </Badge>
  )
}

export function ProxySection() {
  const [selectedBasket, setSelectedBasket] = useState(0)
  const active = proxyBaskets[selectedBasket]

  const radarData = [
    { metric: "90d Corr", b1: proxyBaskets[0].correlation90d * 100, b2: proxyBaskets[1].correlation90d * 100, b3: proxyBaskets[2].correlation90d * 100 },
    { metric: "180d Corr", b1: proxyBaskets[0].correlation180d * 100, b2: proxyBaskets[1].correlation180d * 100, b3: proxyBaskets[2].correlation180d * 100 },
    { metric: "Low TE", b1: 100 - proxyBaskets[0].trackingError * 30, b2: 100 - proxyBaskets[1].trackingError * 30, b3: 100 - proxyBaskets[2].trackingError * 30 },
    { metric: "Low Turnover", b1: 100 - proxyBaskets[0].expectedTurnover * 5, b2: 100 - proxyBaskets[1].expectedTurnover * 5, b3: 100 - proxyBaskets[2].expectedTurnover * 5 },
    { metric: "Liquidity", b1: 88, b2: 82, b3: 91 },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Basket Selector */}
      <div className="grid gap-4 md:grid-cols-3">
        {proxyBaskets.map((basket, i) => (
          <button
            key={basket.id}
            onClick={() => setSelectedBasket(i)}
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground">90d Corr</span>
                <div className="font-mono text-sm text-foreground">{basket.correlation90d.toFixed(3)}</div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Track. Error</span>
                <div className="font-mono text-sm text-foreground">{basket.trackingError.toFixed(2)}%</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Radar Comparison */}
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
                  <Radar name="Core Infra" dataKey="b1" stroke="#4a9eff" fill="#4a9eff" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Income" dataKey="b2" stroke="#34d399" fill="#34d399" fillOpacity={0.1} strokeWidth={2} />
                  <Radar name="Min TE" dataKey="b3" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} strokeWidth={2} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.018 250)",
                      border: "1px solid oklch(0.25 0.02 250)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 250)",
                      fontSize: "12px",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4">
              <LegendDot color="#4a9eff" label="Core Infra" />
              <LegendDot color="#34d399" label="Income" />
              <LegendDot color="#fbbf24" label="Min TE" />
            </div>
          </CardContent>
        </Card>

        {/* Selected Basket Detail */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">{active.name}</CardTitle>
            <CardDescription>
              Correlation (90d): <CorrelationBadge value={active.correlation90d} /> |
              Correlation (180d): <CorrelationBadge value={active.correlation180d} /> |
              TE: {active.trackingError.toFixed(2)}% |
              Turnover: {active.expectedTurnover}%/yr
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Name</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Weight</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Exp. Ratio</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Avg Vol</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.etfs.map((etf) => (
                  <TableRow key={etf.ticker} className="border-border">
                    <TableCell className="font-mono text-xs font-semibold text-primary">{etf.ticker}</TableCell>
                    <TableCell className="text-xs text-foreground max-w-[180px] truncate">{etf.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={etf.weight} className="h-1 w-12" />
                        <span className="font-mono text-xs text-foreground">{etf.weight}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{etf.expenseRatio.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{etf.avgVolume}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px]">{etf.rationale}</TableCell>
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  )
}
