"use client"

import { useState } from "react"
import type { CEFProfile } from "@/lib/cef-universe"
import { TrendingDown, TrendingUp, Activity, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

interface Props {
  profile: CEFProfile
  fundCount: number
  totalAum: number
  viewMode: string
  onPortfolioSync?: (holdings: PortfolioHolding[]) => void
}

interface PortfolioHolding {
  ticker: string
  name: string
  shares?: number
  nav?: number
  price?: number
  discount?: number
  zScore?: number
}

const viewLabels: Record<string, string> = {
  overview: "Portfolio Overview",
  "fund-detail": "Fund Detail",
  comparison: "Fund Comparison",
}

export function DashboardHeader({ profile, fundCount, totalAum, viewMode, onPortfolioSync }: Props) {
  const o = profile.overview
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const [syncMessage, setSyncMessage] = useState("")

  const handleSync = async () => {
    setSyncStatus("syncing")
    setSyncMessage("")
    
    try {
      const response = await fetch("/api/portfolio-sync", {
        method: "POST",
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSyncStatus("success")
        setSyncMessage(`Synced ${data.count || 0} holdings`)
        if (onPortfolioSync && data.holdings) {
          onPortfolioSync(data.holdings)
        }
        // Reset to idle after 3 seconds
        setTimeout(() => setSyncStatus("idle"), 3000)
      } else {
        setSyncStatus("error")
        setSyncMessage(data.error || "Sync failed")
        setTimeout(() => setSyncStatus("idle"), 5000)
      }
    } catch (err) {
      setSyncStatus("error")
      setSyncMessage("Network error")
      setTimeout(() => setSyncStatus("idle"), 5000)
    }
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            CEF X-Ray Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            {fundCount} closed-end funds | ${totalAum.toFixed(1)}B combined AUM | {viewLabels[viewMode] ?? ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {viewMode === "fund-detail" && (
          <>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-primary">{o.ticker}</span>
                <span className="text-xs text-muted-foreground">{o.category}</span>
              </div>
              <span className="max-w-[260px] truncate text-[10px] text-muted-foreground">{o.name}</span>
            </div>
            <div className="hidden h-8 w-px bg-border md:block" />
            <div className="hidden gap-4 text-xs md:flex">
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
        {/* Portfolio Sync Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncStatus === "syncing"}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              syncStatus === "syncing"
                ? "bg-muted text-muted-foreground cursor-wait"
                : syncStatus === "success"
                ? "bg-green-500/20 text-green-600"
                : syncStatus === "error"
                ? "bg-destructive/20 text-destructive"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
            title="Sync portfolio from CEFConnect"
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : syncStatus === "success" ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : syncStatus === "error" ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {syncStatus === "syncing"
                ? "Syncing..."
                : syncStatus === "success"
                ? syncMessage
                : syncStatus === "error"
                ? syncMessage
                : "Sync Portfolio"}
            </span>
          </button>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] uppercase text-muted-foreground">As of</span>
          <span className="font-mono text-xs text-foreground">2026-02-17</span>
        </div>
      </div>
    </header>
  )
}

function MetricPill({ label, value, icon, valueClass }: { label: string; value: string; icon?: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-mono text-sm font-medium ${valueClass || "text-foreground"}`}>
        {icon}
        {value}
      </span>
    </div>
  )
}
