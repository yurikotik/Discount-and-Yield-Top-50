"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react"

interface Props {
  funds: CEFProfile[]
  selectedTicker: string
  onSelect: (ticker: string) => void
  analyzedTickers: Set<string>
}

export function CefSelector({ funds, selectedTicker, onSelect, analyzedTickers }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {funds.map((fund) => {
        const o = fund.overview
        const isSelected = o.ticker === selectedTicker
        const isAnalyzed = analyzedTickers.has(o.ticker)

        return (
          <button
            key={o.ticker}
            onClick={() => onSelect(o.ticker)}
            className={`flex shrink-0 flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">{o.ticker}</span>
              {isAnalyzed && <CheckCircle2 className="h-3 w-3 text-success" />}
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
              </span>
              {o.premiumDiscount >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[9px] ${fund.confidence >= 75 ? "border-success/30 text-success" : fund.confidence >= 60 ? "border-warning/30 text-warning" : "border-destructive/30 text-destructive"}`}>
                {fund.confidence}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{o.distributionRate}% dist</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
