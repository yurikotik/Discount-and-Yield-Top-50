"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { formatCurrency } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react"

interface Props {
  funds: CEFProfile[]
  selectedTicker: string
  onSelectFund: (ticker: string) => void
  onNavigateToFund: (ticker: string) => void
}

export function PortfolioOverview({ funds, selectedTicker, onSelectFund, onNavigateToFund }: Props) {
  const totalAum = funds.reduce((s, f) => s + f.overview.aum, 0)
  const avgConf = funds.reduce((s, f) => s + f.confidence, 0) / funds.length
  const avgDist = funds.reduce((s, f) => s + f.overview.distributionRate, 0) / funds.length
  const avgLev = funds.reduce((s, f) => s + f.overview.leverageRatio, 0) / funds.length
  const levFunds = funds.filter(f => f.overview.leverageRatio > 0).length

  return (
    <div className="flex flex-col gap-6">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total AUM" value={`$${totalAum.toFixed(1)}B`} />
        <StatCard label="Avg Confidence" value={avgConf.toFixed(0)} color={avgConf >= 70 ? "text-success" : "text-warning"} />
        <StatCard label="Avg Dist Rate" value={`${avgDist.toFixed(1)}%`} />
        <StatCard label="Avg Leverage" value={`${avgLev.toFixed(1)}%`} />
        <StatCard label="Leveraged Funds" value={`${levFunds} / ${funds.length}`} />
        <StatCard label="Target Notional" value="$500M" />
      </div>

      {/* Fund Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {funds.map((fund) => {
          const o = fund.overview
          const isSelected = o.ticker === selectedTicker
          return (
            <button
              key={o.ticker}
              onClick={() => onNavigateToFund(o.ticker)}
              className={`flex flex-col gap-3 rounded-lg border p-4 text-left transition-all ${
                isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-foreground">{o.ticker}</span>
                  <Badge variant="outline" className={`text-[9px] ${fund.confidence >= 75 ? "border-success/30 text-success" : fund.confidence >= 60 ? "border-warning/30 text-warning" : "border-destructive/30 text-destructive"}`}>
                    {fund.confidence}
                  </Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{o.name}</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">AUM</span>
                  <div className="font-mono text-sm text-foreground">${o.aum.toFixed(1)}B</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">P/D</span>
                  <div className={`flex items-center gap-1 font-mono text-sm ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                    {o.premiumDiscount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Dist Rate</span>
                  <div className="font-mono text-sm text-foreground">{o.distributionRate}%</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Leverage</span>
                  <div className="font-mono text-sm text-foreground">{o.leverageRatio > 0 ? `${o.leverageRatio}%` : "None"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Best Proxy:</span>
                <span className="font-mono text-[10px] text-primary">{fund.proxyBaskets[fund.selectedProxyIndex]?.tickers.join(", ")}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Cross-Fund Comparison Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Cross-Fund Comparison</CardTitle>
          <CardDescription>Key metrics across all 10 CEFs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Ticker</TableHead>
                <TableHead className="text-muted-foreground text-xs">Strategy</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">AUM</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">P/D</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Dist</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Lev</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Corr</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">TE</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Conf</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Yr-1 Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funds.map((fund) => {
                const o = fund.overview
                const basket = fund.proxyBaskets[fund.selectedProxyIndex]
                const totalCost = fund.costs.reduce((s, c) => s + c.bps, 0)
                return (
                  <TableRow
                    key={o.ticker}
                    className={`border-border cursor-pointer transition-colors hover:bg-primary/5 ${o.ticker === selectedTicker ? "bg-primary/5" : ""}`}
                    onClick={() => onNavigateToFund(o.ticker)}
                  >
                    <TableCell className="font-mono text-xs font-bold text-primary">{o.ticker}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{o.strategy}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">${o.aum.toFixed(1)}B</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                        {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.distributionRate}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{o.leverageRatio > 0 ? `${o.leverageRatio}%` : "-"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] ${basket.correlation >= 0.96 ? "text-success border-success/30" : basket.correlation >= 0.93 ? "text-primary border-primary/30" : "text-warning border-warning/30"}`}>
                        {basket.correlation.toFixed(3)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">{basket.trackingError.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] ${fund.confidence >= 75 ? "text-success border-success/30" : fund.confidence >= 60 ? "text-warning border-warning/30" : "text-destructive border-destructive/30"}`}>
                        {fund.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{totalCost}bp</TableCell>
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

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-xl font-bold ${color || "text-foreground"}`}>{value}</span>
    </div>
  )
}
