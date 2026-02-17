"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { TrendingDown, TrendingUp } from "lucide-react"

interface Props {
  funds: CEFProfile[]
  selectedTicker: string
  onSelect: (ticker: string) => void
}

export function CefSelector({ funds, selectedTicker, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Fund selector">
      {funds.map((fund) => {
        const o = fund.overview
        const isSelected = o.ticker === selectedTicker

        return (
          <button
            key={o.ticker}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(o.ticker)}
            className={`flex shrink-0 flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">{o.ticker}</span>
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
            <span className="text-[10px] text-muted-foreground">{o.distributionRate}% dist</span>
          </button>
        )
      })}
    </div>
  )
}
