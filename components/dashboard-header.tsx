"use client"

import type { CEFOverview } from "@/lib/cef-universe"
import { formatCurrency } from "@/lib/cef-universe"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Activity } from "lucide-react"

interface Props {
  overview: CEFOverview
}

export function DashboardHeader({ overview }: Props) {
  const { premiumDiscount } = overview

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{overview.name}</h2>
            <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">{overview.ticker}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{overview.sponsor} | {overview.strategy}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <MetricPill label="NAV" value={`$${overview.navPerShare.toFixed(2)}`} />
        <MetricPill label="Price" value={`$${overview.marketPrice.toFixed(2)}`} />
        <MetricPill
          label="Prem/Disc"
          value={`${premiumDiscount >= 0 ? "+" : ""}${premiumDiscount.toFixed(2)}%`}
          icon={premiumDiscount >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
          valueClass={premiumDiscount >= 0 ? "text-success" : "text-destructive"}
        />
        <MetricPill label="AUM" value={`$${overview.aum.toFixed(1)}B`} />
        <MetricPill label="Dist. Rate" value={`${overview.distributionRate}%`} />
        <MetricPill label="Leverage" value={`${overview.leverageRatio}%`} />
        <MetricPill label="Exp. Ratio" value={`${overview.expenseRatio}%`} />
      </div>
    </div>
  )
}

function MetricPill({ label, value, icon, valueClass }: { label: string; value: string; icon?: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-mono text-sm font-medium ${valueClass || "text-foreground"}`}>
        {icon}
        {value}
      </span>
    </div>
  )
}
