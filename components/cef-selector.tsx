"use client"

import { useState, useMemo } from "react"
import type { CEFProfile } from "@/lib/cef-universe"
import { TrendingDown, TrendingUp, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const CATEGORIES = ["all", "equity", "fixed-income", "infrastructure", "reit", "multi-asset"] as const

const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  all: "All funds",
  equity: "Stocks",
  "fixed-income": "Bonds",
  infrastructure: "Infrastructure",
  reit: "Real estate",
  "multi-asset": "Mixed",
}

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
    if (category !== "all") list = list.filter((f) => f.overview.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (f) =>
          f.overview.ticker.toLowerCase().includes(q) ||
          f.overview.name.toLowerCase().includes(q) ||
          f.overview.sponsor.toLowerCase().includes(q),
      )
    }
    return list
  }, [funds, search, category])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[length:var(--gy-text-base)] font-bold text-foreground">
          Pick a fund
        </p>
        <p className="mt-1 text-[length:var(--gy-text-sm)] leading-[var(--gy-leading)] text-muted-foreground">
          Search or filter, then tap a ticker to open its details.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md flex-1">
          <Search
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Type a ticker, fund name, or manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-12 bg-card pl-11 text-[length:var(--gy-text-base)]"
            aria-label="Search funds"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fund type">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-12 shrink-0 rounded-lg px-4 text-[length:var(--gy-text-sm)] font-semibold transition-colors ${
                category === cat
                  ? "bg-[var(--gy-blue)] text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all"
                ? `${CATEGORY_LABELS[cat]} (${funds.length})`
                : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <span className="text-[length:var(--gy-text-sm)] text-muted-foreground">
          Showing {filtered.length}
        </span>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2"
        role="listbox"
        aria-label="Fund selector"
      >
        {filtered.map((fund) => {
          const o = fund.overview
          const isSelected = o.ticker === selectedTicker
          const isPremium = o.premiumDiscount >= 0

          return (
            <button
              key={o.ticker}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(o.ticker)}
              className={`flex min-h-14 shrink-0 flex-col justify-center gap-1 rounded-xl border px-4 py-3 text-left transition-all ${
                isSelected
                  ? "border-[var(--gy-blue)] bg-[var(--gy-blue-soft)]"
                  : "border-border bg-card hover:border-[var(--gy-blue)]/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[length:var(--gy-text-base)] font-bold text-foreground">
                  {o.ticker}
                </span>
                <span
                  className={`font-mono text-[length:var(--gy-text-sm)] font-semibold ${
                    isPremium ? "text-[var(--gy-danger)]" : "text-[var(--gy-success)]"
                  }`}
                >
                  {isPremium ? "+" : ""}
                  {o.premiumDiscount.toFixed(1)}%
                </span>
                {isPremium ? (
                  <TrendingUp className="h-4 w-4 text-[var(--gy-danger)]" aria-hidden />
                ) : (
                  <TrendingDown className="h-4 w-4 text-[var(--gy-success)]" aria-hidden />
                )}
              </div>
              <span className="text-[length:var(--gy-text-sm)] text-muted-foreground">
                {o.distributionRate}% income rate
              </span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <span className="px-4 py-4 text-[length:var(--gy-text-base)] text-muted-foreground">
            No funds match. Try clearing the search or picking “All funds.”
          </span>
        )}
      </div>
    </div>
  )
}
