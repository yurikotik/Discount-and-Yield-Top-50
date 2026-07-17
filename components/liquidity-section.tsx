"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { formatCurrency } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"

interface Props {
  data: CEFProfile
}

export function LiquiditySection({ data }: Props) {
  const { liquidity, overview } = data

  const sortedByScore = [...liquidity.holdings].sort((a, b) => a.liquidityScore - b.liquidityScore)
  const sortedByWeight = [...liquidity.holdings].sort((a, b) => b.weight - a.weight)

  const scoreBarData = sortedByWeight.slice(0, 15).map(h => ({
    ticker: h.ticker,
    score: h.liquidityScore,
    weight: h.weight,
  }))

  const scatterData = liquidity.holdings.map(h => ({
    name: h.ticker,
    x: h.advProxy,
    y: h.liquidityScore,
    z: h.weight,
  }))

  const indexColor =
    liquidity.overallIndex >= 70 ? "text-success" :
    liquidity.overallIndex >= 40 ? "text-warning" :
    "text-destructive"

  return (
    <div className="gy-stack">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-6">
        <LiqMetric label="Overall Index" value={`${liquidity.overallIndex}/100`} className={indexColor} />
        <LiqMetric label="Illiquid %" value={`${liquidity.illiquidPct.toFixed(1)}%`} severity={liquidity.illiquidPct > 15 ? "high" : liquidity.illiquidPct > 5 ? "medium" : "low"} />
        <LiqMetric label="Positions" value={liquidity.holdings.length.toString()} />
        <LiqMetric label="Illiquid Flags" value={liquidity.largeIlliquidPositions.length.toString()} severity={liquidity.largeIlliquidPositions.length > 2 ? "high" : liquidity.largeIlliquidPositions.length > 0 ? "medium" : "low"} />
        <LiqMetric label="AUM" value={`$${overview.aum.toFixed(1)}B`} />
        <LiqMetric label="Category" value={overview.category.replace("-", " ")} />
      </div>

      {/* Illiquid Position Warnings */}
      {liquidity.largeIlliquidPositions.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-foreground">Large Illiquid Positions Detected</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The following positions have liquidity scores below 40 and weight above 1.5%:{" "}
                <span className="font-mono text-foreground">{liquidity.largeIlliquidPositions.join(", ")}</span>.
                These may face slippage or difficulty liquidating during market stress.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Liquidity Score Bar Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Liquidity Score by Holding</CardTitle>
            <CardDescription>Score 0-100 based on ADV proxy and market cap for top 15 positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis type="category" dataKey="ticker" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} width={70} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "score") return [`${value}/100`, "Liquidity Score"]
                      return [`${value}%`, "Weight"]
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {scoreBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 70 ? "#459212" : entry.score >= 40 ? "#D4B40A" : "#CA3A41"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#34d399]" />{"70+ (liquid)"}</div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#fbbf24]" />{"40-69 (moderate)"}</div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#f87171]" />{"<40 (illiquid)"}</div>
            </div>
          </CardContent>
        </Card>

        {/* ADV vs Score Scatter */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">ADV Proxy vs Liquidity Score</CardTitle>
            <CardDescription>Bubble size = portfolio weight</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" />
                  <XAxis type="number" dataKey="x" name="ADV ($M)" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} label={{ value: "ADV Proxy ($M)", position: "insideBottom", offset: -5, fill: "#4A5560", fontSize: 13 }} />
                  <YAxis type="number" dataKey="y" name="Score" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} domain={[0, 100]} label={{ value: "Liquidity Score", angle: -90, position: "insideLeft", fill: "#4A5560", fontSize: 13 }} />
                  <ZAxis type="number" dataKey="z" range={[40, 300]} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                    formatter={(value: number, name: string) => {
                      if (name === "ADV ($M)") return [`$${value.toFixed(1)}M`, "ADV"]
                      if (name === "Score") return [`${value}/100`, "Score"]
                      return [`${value.toFixed(1)}%`, "Weight"]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={scatterData} fill="#117DAE" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Liquidity Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">Holdings Liquidity Detail</CardTitle>
          <CardDescription>Per-holding liquidity assessment for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">#</TableHead>
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-xs">Name</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Weight</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">ADV ($M)</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Mkt Cap ($B)</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Score</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Days to Liq.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByWeight.map((h, i) => (
                <TableRow key={`${h.ticker}-${i}`} className="border-border">
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs text-primary">{h.ticker}</TableCell>
                  <TableCell className="text-xs text-foreground">{h.name}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{h.weight}%</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">${h.advProxy.toFixed(1)}M</TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">${h.marketCap.toFixed(1)}B</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={h.liquidityScore} className="h-1.5 w-10" />
                      <span className={`font-mono text-xs font-semibold ${h.liquidityScore >= 70 ? "text-success" : h.liquidityScore >= 40 ? "text-warning" : "text-destructive"}`}>
                        {h.liquidityScore}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">{h.daysToLiquidate}d</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function LiqMetric({ label, value, severity, className }: { label: string; value: string; severity?: "high" | "medium" | "low"; className?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="text-[length:var(--gy-text-xs)] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold capitalize ${
        className ? className :
        severity === "high" ? "text-destructive" : severity === "medium" ? "text-warning" : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  )
}
