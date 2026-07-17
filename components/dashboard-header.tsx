"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { TrendingDown, TrendingUp } from "lucide-react"
import { GyBrandStripe } from "@/components/gy-brand-stripe"
import { GyA11yToolbar } from "@/components/gy-a11y-toolbar"

interface Props {
  profile: CEFProfile
  fundCount: number
  totalAum: number
  viewMode: string
  fetchedAt?: string | null
}

function formatFetchedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

const viewLabels: Record<string, string> = {
  overview: "Seeing all funds",
  "fund-detail": "Checking one fund",
  comparison: "Comparing funds",
}

export function DashboardHeader({ profile, fundCount, totalAum, viewMode, fetchedAt }: Props) {
  const o = profile.overview

  return (
    <header className="border-b border-border bg-card">
      <GyBrandStripe />
      <div className="flex flex-wrap items-center justify-between gap-6 px-6 py-5 md:px-8 md:py-6">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[length:var(--gy-text-sm)] leading-snug">
            <span className="font-bold text-[var(--gy-green)]">Game of Yield</span>
            <span className="font-bold text-[var(--gy-red)]"> · Income Engine</span>
          </p>
          <h1 className="text-[length:var(--gy-text-xl)] font-bold tracking-[var(--gy-tracking)] text-foreground">
            CEF X-Ray
          </h1>
          <p className="max-w-xl text-[length:var(--gy-text-base)] leading-[var(--gy-leading)] text-muted-foreground">
            {fundCount} closed-end funds · ${totalAum.toFixed(1)}B total size ·{" "}
            {viewLabels[viewMode] ?? ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {viewMode === "fund-detail" && (
            <>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[length:var(--gy-text-lg)] font-bold text-primary">
                    {o.ticker}
                  </span>
                  <span className="text-[length:var(--gy-text-sm)] capitalize text-muted-foreground">
                    {o.category.replace("-", " ")}
                  </span>
                </div>
                <span className="max-w-[280px] truncate text-[length:var(--gy-text-sm)] text-muted-foreground">
                  {o.name}
                </span>
              </div>
              <div className="hidden h-12 w-px bg-border md:block" aria-hidden />
              <div className="hidden gap-6 md:flex">
                <MetricPill label="Fund value (NAV)" value={`$${o.navPerShare.toFixed(2)}`} />
                <MetricPill label="Market price" value={`$${o.marketPrice.toFixed(2)}`} />
                <MetricPill
                  label="Discount / premium"
                  value={`${o.premiumDiscount >= 0 ? "+" : ""}${o.premiumDiscount.toFixed(1)}%`}
                  icon={
                    o.premiumDiscount >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" aria-hidden />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" aria-hidden />
                    )
                  }
                  valueClass={o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}
                />
                <MetricPill label="Income rate" value={`${o.distributionRate}%`} />
                <MetricPill
                  label="Borrowing"
                  value={o.leverageRatio > 0 ? `${o.leverageRatio}%` : "None"}
                />
              </div>
            </>
          )}

          <div className="flex flex-col items-end gap-3">
            <GyA11yToolbar />
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[length:var(--gy-text-sm)] text-muted-foreground">
                Data last updated
              </span>
              <span className="font-mono text-[length:var(--gy-text-sm)] font-semibold text-foreground">
                {fetchedAt ? `${formatFetchedAt(fetchedAt)} ET` : "—"}
              </span>
            </div>
          </div>
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
    <div className="flex flex-col gap-1">
      <span className="text-[length:var(--gy-text-sm)] text-muted-foreground">{label}</span>
      <span
        className={`flex items-center gap-1.5 font-mono text-[length:var(--gy-text-base)] font-semibold ${valueClass || "text-foreground"}`}
      >
        {icon}
        {value}
      </span>
    </div>
  )
}
