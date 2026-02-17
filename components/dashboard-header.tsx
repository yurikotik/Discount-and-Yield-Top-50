"use client"

import { fundOverview, formatCurrency } from "@/lib/utf-data"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Activity } from "lucide-react"

export function DashboardHeader() {
  const { premiumDiscount } = fundOverview

  return (
    <header className="border-b border-border px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                {fundOverview.name}
              </h1>
              <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
                {fundOverview.ticker}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {fundOverview.exchange} | As of {fundOverview.asOfDate} | Inception {fundOverview.inceptionDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <MetricPill label="NAV" value={`$${fundOverview.nav.toFixed(2)}`} />
          <MetricPill label="Price" value={`$${fundOverview.marketPrice.toFixed(2)}`} />
          <MetricPill
            label="Prem/Disc"
            value={`${premiumDiscount.toFixed(2)}%`}
            icon={premiumDiscount >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
            valueClass={premiumDiscount >= 0 ? "text-success" : "text-destructive"}
          />
          <MetricPill label="Total Assets" value={formatCurrency(fundOverview.totalAssets)} />
          <MetricPill label="Dist. Rate" value={`${fundOverview.distributionRate}%`} />
          <MetricPill label="Leverage" value={`${fundOverview.leverage}%`} />
          <MetricPill label="Exp. Ratio" value={`${fundOverview.expenseRatio}%`} />
        </div>
      </div>
    </header>
  )
}

function MetricPill({
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
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 text-sm font-mono font-medium ${valueClass || "text-foreground"}`}>
        {icon}
        {value}
      </span>
    </div>
  )
}
