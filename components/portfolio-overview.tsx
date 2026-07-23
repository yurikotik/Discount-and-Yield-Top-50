"use client"

import { useState } from "react"
import type { CEFProfile } from "@/lib/cef-universe"
import { PILLAR_LABELS, PILLAR_WEIGHTS, type FundRanking, type PillarScores } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react"
import { DecodeBanner } from "@/components/decode-banner"
import { GY_CHART, gyTick, gyTooltipStyle, heatTextClass } from "@/lib/gy-chart"
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
  funds: CEFProfile[]
  rankings: FundRanking[]
  selectedTicker: string
  onSelectFund: (ticker: string) => void
  onNavigateToFund: (ticker: string) => void
}

export function PortfolioOverview({
  funds,
  rankings,
  selectedTicker,
  onNavigateToFund,
}: Props) {
  const [showAllCards, setShowAllCards] = useState(false)
  const totalAum = funds.reduce((s, f) => s + f.overview.aum, 0)
  const avgDist = funds.reduce((s, f) => s + f.overview.distributionRate, 0) / funds.length
  const avgLev = funds.reduce((s, f) => s + f.overview.leverageRatio, 0) / funds.length
  const levFunds = funds.filter((f) => f.overview.leverageRatio > 0).length
  const avgExpense = funds.reduce((s, f) => s + f.overview.expenseRatio, 0) / funds.length
  const avgReturn = funds.reduce((s, f) => s + f.performance.return1Y, 0) / funds.length
  const avgDiscount =
    funds.reduce((s, f) => s + f.overview.premiumDiscount, 0) / funds.length

  const rankBarData = rankings.map((r) => ({
    ticker: r.ticker,
    score: r.score,
    compositeZ: r.compositeZ,
  }))

  const scatterData = funds.map((f) => ({
    name: f.overview.ticker,
    x: f.overview.leverageRatio,
    y: f.overview.distributionRate,
    z: f.overview.aum,
  }))

  const cardFunds = showAllCards
    ? funds
    : funds.filter((f) => rankings.findIndex((r) => r.ticker === f.overview.ticker) < 10)

  return (
    <div className="gy-stack">
      <DecodeBanner />

      <section aria-labelledby="snapshot-heading">
        <h2 id="snapshot-heading" className="gy-section-title">
          Snapshot of all funds
        </h2>
        <p className="gy-section-help">
          Quick averages across the list. Numbers update when new data is fetched.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Total size" value={`$${totalAum.toFixed(1)}B`} />
          <StatCard label="Avg 1-year return" value={`${avgReturn.toFixed(1)}%`} />
          <StatCard label="Average Current Yield" value={`${avgDist.toFixed(1)}%`} />
          <StatCard
            label="Average NAV Discount"
            value={`${avgDiscount >= 0 ? "+" : ""}${avgDiscount.toFixed(1)}%`}
          />
          <StatCard label="Avg borrowing" value={`${avgLev.toFixed(1)}%`} />
          <StatCard label="Avg expense" value={`${avgExpense.toFixed(2)}%`} />
          <StatCard label="Funds that borrow" value={`${levFunds} of ${funds.length}`} />
        </div>
      </section>

      <section aria-labelledby="top-funds-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="top-funds-heading" className="gy-section-title">
              {showAllCards ? `All ${funds.length} funds` : "Top 10 funds"}
            </h2>
            <p className="gy-section-help">
              Tap a fund card to open details. Higher rank means a stronger overall score.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllCards(!showAllCards)}
            className="min-h-12 rounded-lg border border-[var(--gy-blue)] px-5 text-[length:var(--gy-text-base)] font-semibold text-[var(--gy-blue)] hover:bg-[var(--gy-blue-soft)]"
          >
            {showAllCards ? "Show top 10 only" : `Show all ${funds.length}`}
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cardFunds.map((fund) => {
            const o = fund.overview
            const isSelected = o.ticker === selectedTicker
            const rank = rankings.find((r) => r.ticker === o.ticker)
            return (
              <button
                key={o.ticker}
                type="button"
                onClick={() => onNavigateToFund(o.ticker)}
                className={`flex min-h-[13rem] flex-col gap-4 rounded-xl border p-5 text-left transition-all ${
                  isSelected
                    ? "border-[var(--gy-blue)] bg-[var(--gy-blue-soft)]"
                    : "border-border bg-card hover:border-[var(--gy-blue)]/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[length:var(--gy-text-base)] font-bold text-foreground">
                      {o.ticker}
                    </span>
                    {rank && (
                      <Badge
                        variant="outline"
                        className="border-[var(--gy-blue)]/40 text-[length:var(--gy-text-sm)] text-[var(--gy-blue)]"
                      >
                        Rank #{rank.rank}
                      </Badge>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[length:var(--gy-text-sm)] font-semibold text-[var(--gy-blue)]">
                    Open
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>

                <p className="line-clamp-2 text-[length:var(--gy-text-sm)] leading-[var(--gy-leading)] text-muted-foreground">
                  {o.name}
                </p>

                <div className="mt-auto grid grid-cols-2 gap-3">
                  <Metric label="Size" value={`$${o.aum.toFixed(1)}B`} />
                  <Metric
                    label="NAV Discount"
                    value={`${o.premiumDiscount >= 0 ? "+" : ""}${o.premiumDiscount.toFixed(1)}%`}
                    icon={
                      o.premiumDiscount >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                      )
                    }
                    valueClass={
                      o.premiumDiscount >= 0
                        ? "text-[var(--gy-danger)]"
                        : "text-[var(--gy-success)]"
                    }
                  />
                  <Metric label="Current Yield" value={`${o.distributionRate}%`} />
                  <Metric
                    label="1-year return"
                    value={`${fund.performance.return1Y.toFixed(1)}%`}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground">Fund rankings</CardTitle>
            <CardDescription>
              Longer bars rank higher. Score blends income, discount, stability, risk, and
              momentum.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="max-h-[600px] overflow-y-auto"
              style={{ height: Math.max(320, rankBarData.length * 22 + 40) }}
            >
              <ResponsiveContainer width="100%" height={Math.max(320, rankBarData.length * 22 + 40)}>
                <BarChart data={rankBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GY_CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={gyTick} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="ticker"
                    tick={gyTick}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <RechartsTooltip
                    contentStyle={gyTooltipStyle}
                    formatter={(value: number) => [value.toFixed(2), "Score"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {rankBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= 0 ? GY_CHART.blue : GY_CHART.red}
                        fillOpacity={Math.max(0.35, 1 - index * 0.012)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground">Current Yield vs borrowing</CardTitle>
            <CardDescription>
              Larger bubbles = larger funds. Farther right = more borrowing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GY_CHART.grid} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Leverage"
                    tick={gyTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: "Leverage %",
                      position: "insideBottom",
                      offset: -2,
                      fill: GY_CHART.tick,
                      fontSize: 14,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Yield"
                    tick={gyTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: "Current Yield %",
                      angle: -90,
                      position: "insideLeft",
                      fill: GY_CHART.tick,
                      fontSize: 14,
                    }}
                  />
                  <ZAxis type="number" dataKey="z" range={[60, 400]} />
                  <RechartsTooltip
                    contentStyle={gyTooltipStyle}
                    formatter={(value: number, name: string) => {
                      if (name === "Leverage") return [`${value}%`, "Leverage"]
                      if (name === "Yield") return [`${value}%`, "Current Yield"]
                      return [`$${value.toFixed(1)}B`, "AUM"]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                  />
                  <Scatter data={scatterData} fill={GY_CHART.blue} fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Score breakdown</CardTitle>
          <CardDescription>
            Each column is one check (0–1). Higher is better. Tap a row to open that fund.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[length:var(--gy-text-sm)] text-muted-foreground">
                  Rank
                </TableHead>
                <TableHead className="text-[length:var(--gy-text-sm)] text-muted-foreground">
                  Ticker
                </TableHead>
                {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map((key) => (
                  <TableHead
                    key={key}
                    className="text-right text-[length:var(--gy-text-sm)] text-muted-foreground"
                  >
                    <div className="flex flex-col items-end gap-0.5">
                      <span>{PILLAR_LABELS[key]}</span>
                      <span className="text-[length:var(--gy-text-xs)] text-muted-foreground/80">
                        {(PILLAR_WEIGHTS[key] * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right text-[length:var(--gy-text-sm)] text-muted-foreground">
                  Score
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((rank) => (
                <TableRow
                  key={rank.ticker}
                  className={`cursor-pointer border-border transition-colors hover:bg-[var(--gy-blue-soft)] ${
                    rank.ticker === selectedTicker ? "bg-[var(--gy-blue-soft)]" : ""
                  }`}
                  onClick={() => onNavigateToFund(rank.ticker)}
                >
                  <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-muted-foreground">
                    #{rank.rank}
                  </TableCell>
                  <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-[var(--gy-blue)]">
                    {rank.ticker}
                  </TableCell>
                  {(Object.keys(PILLAR_LABELS) as (keyof PillarScores)[]).map((key) => {
                    const val = rank.pillars[key]
                    return (
                      <TableCell key={key} className="text-right">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-mono text-[length:var(--gy-text-sm)] font-semibold ${heatTextClass(val)}`}
                        >
                          {val.toFixed(2)}
                        </span>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] font-bold text-[var(--gy-blue)]">
                    {rank.score.toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Compare key numbers</CardTitle>
          <CardDescription>
            All {funds.length} funds, ranked by overall score. Tap any row to dig in.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {[
                  "Rank",
                  "Ticker",
                  "Type",
                  "Size",
                  "NAV Discount",
                  "Current Yield",
                  "Borrowing",
                  "Expense",
                  "1Y return",
                  "Sharpe",
                  "Z-score",
                  "Score",
                ].map((h) => (
                  <TableHead
                    key={h}
                    className={`px-3 py-3 text-[length:var(--gy-text-sm)] text-muted-foreground ${
                      [
                        "Size",
                        "NAV Discount",
                        "Current Yield",
                        "Borrowing",
                        "Expense",
                        "1Y return",
                        "Sharpe",
                        "Z-score",
                        "Score",
                      ].includes(h)
                        ? "text-right"
                        : ""
                    }`}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((rank) => {
                const fund = funds.find((f) => f.overview.ticker === rank.ticker)!
                const o = fund.overview
                return (
                  <TableRow
                    key={o.ticker}
                    className={`cursor-pointer border-border transition-colors hover:bg-[var(--gy-blue-soft)] ${
                      o.ticker === selectedTicker ? "bg-[var(--gy-blue-soft)]" : ""
                    }`}
                    onClick={() => onNavigateToFund(o.ticker)}
                  >
                    <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-muted-foreground">
                      #{rank.rank}
                    </TableCell>
                    <TableCell className="font-mono text-[length:var(--gy-text-sm)] font-bold text-[var(--gy-blue)]">
                      {o.ticker}
                    </TableCell>
                    <TableCell className="text-[length:var(--gy-text-sm)] capitalize text-muted-foreground">
                      {o.category.replace("-", " ")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)]">
                      ${o.aum.toFixed(1)}B
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono text-[length:var(--gy-text-sm)] ${
                          o.premiumDiscount >= 0
                            ? "text-[var(--gy-danger)]"
                            : "text-[var(--gy-success)]"
                        }`}
                      >
                        {o.premiumDiscount >= 0 ? "+" : ""}
                        {o.premiumDiscount.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)]">
                      {o.distributionRate}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)]">
                      {o.leverageRatio > 0 ? `${o.leverageRatio}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)]">
                      {o.expenseRatio.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)]">
                      {fund.performance.return1Y.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)]">
                      {fund.performance.sharpeRatio.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[length:var(--gy-text-xs)] ${
                          rank.compositeZ >= 0
                            ? "border-[var(--gy-green)]/40 text-[var(--gy-success)]"
                            : "border-[var(--gy-red)]/40 text-[var(--gy-danger)]"
                        }`}
                      >
                        {rank.compositeZ >= 0 ? "+" : ""}
                        {rank.compositeZ.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-[length:var(--gy-text-sm)] font-bold text-[var(--gy-blue)]">
                      {rank.score.toFixed(3)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="text-[length:var(--gy-text-sm)] leading-snug text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-[length:var(--gy-text-lg)] font-bold text-foreground">
        {value}
      </span>
    </div>
  )
}

function Metric({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  valueClass?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[length:var(--gy-text-sm)] text-muted-foreground">{label}</span>
      <div
        className={`flex items-center gap-1 font-mono text-[length:var(--gy-text-sm)] font-semibold ${valueClass || "text-foreground"}`}
      >
        {icon}
        {value}
      </div>
    </div>
  )
}
