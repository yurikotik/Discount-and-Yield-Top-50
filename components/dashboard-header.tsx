"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { TrendingDown, TrendingUp, Activity, Clock } from "lucide-react"

interface Props {
  profile: CEFProfile
  fundCount: number
  totalAum: number
  viewMode: string
}

const viewLabels: Record<string, string> = {
  overview: "Portfolio Overview",
  "fund-detail": "Fund Detail",
  comparison: "Fund Comparison",
}

export function DashboardHeader({ profile, fundCount, totalAum, viewMode }: Props) {
  const o = profile.overview

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
          <Activity className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground tracking-tight">
            CEF X-Ray Dashboard
          </h1>
          <p className="text-[10px] text-muted-foreground">
            {fundCount} funds | ${totalAum.toFixed(1)}B AUM | {viewLabels[viewMode] ?? ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {viewMode === "fund-detail" && (
          <>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-primary">{o.ticker}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground capitalize">{o.category.replace("-", " ")}</span>
              </div>
              <span className="max-w-[240px] truncate text-[10px] text-muted-foreground">{o.name}</span>
            </div>
            <div className="hidden h-7 w-px bg-border md:block" />
            <div className="hidden gap-3 text-xs md:flex">
              <MetricPill label="NAV" value={`$${o.navPerShare.toFixed(2)}`} />
              <MetricPill label="Price" value={`$${o.marketPrice.toFixed(2)}`} />
              <MetricPill
                label="P/D"
                value={`${o.premiumDiscount >= 0 ? "+" : ""}${o.premiumDiscount.toFixed(1)}%`}
                icon={o.premiumDiscount >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                valueClass={o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}
              />
              <MetricPill label="Dist" value={`${o.distributionRate}%`} />
              <MetricPill label="Lev" value={o.leverageRatio > 0 ? `${o.leverageRatio}%` : "None"} />
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5 rounded-md bg-secondary/50 px-2.5 py-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">As of</span>
            <span className="font-mono text-[11px] text-foreground">2026-02-17</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function MetricPill({ label, value, icon, valueClass }: { label: string; value: string; icon?: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-mono text-xs font-medium ${valueClass || "text-foreground"}`}>
        {icon}
        {value}
      </span>
    </div>
  )
}
