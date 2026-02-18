"use client"

import { useState, useMemo } from "react"
import type { CEFProfile } from "@/lib/cef-universe"
import { TrendingDown, TrendingUp, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const CATEGORIES = ["all", "equity", "fixed-income", "infrastructure", "reit", "multi-asset"] as const

interface Props {
  funds: CEFProfile[]
  selectedTicker: string
  onSelect: (ticker: string) => void
}

export function CefSelector({ funds, selectedTicker, onSelect }: Props) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all")

  const filtered = useMemo(() => {
    let list = funds
    if (category !== "all") list = list.filter(f => f.overview.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.overview.ticker.toLowerCase().includes(q) ||
        f.overview.name.toLowerCase().includes(q) ||
        f.overview.sponsor.toLowerCase().includes(q)
      )
    }
    return list
  }, [funds, search, category])

  return (
    <div className="flex flex-col gap-2">
      {/* Search + Category Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search ticker, name, sponsor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? `All (${funds.length})` : cat.replace("-", " ")}
            </button>
          ))}
        </div>
        <span className="hidden text-[10px] text-muted-foreground sm:inline">
          {filtered.length} fund{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Fund Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="listbox" aria-label="Fund selector">
        {filtered.map((fund) => {
          const o = fund.overview
          const isSelected = o.ticker === selectedTicker

          return (
            <button
              key={o.ticker}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(o.ticker)}
              className={`flex shrink-0 flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-foreground">{o.ticker}</span>
                <span className={`font-mono text-[10px] ${o.premiumDiscount >= 0 ? "text-success" : "text-destructive"}`}>
                  {o.premiumDiscount >= 0 ? "+" : ""}{o.premiumDiscount.toFixed(1)}%
                </span>
                {o.premiumDiscount >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5 text-success" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                )}
              </div>
              <span className="text-[9px] text-muted-foreground">{o.distributionRate}% dist</span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <span className="px-4 py-2 text-xs text-muted-foreground">No funds match filter</span>
        )}
      </div>
    </div>
  )
}
