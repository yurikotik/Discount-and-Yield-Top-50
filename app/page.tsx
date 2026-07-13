"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { CefSelector } from "@/components/cef-selector"
import { PortfolioOverview } from "@/components/portfolio-overview"
import { HoldingsSection } from "@/components/holdings-section"
import { FactorsSection } from "@/components/factors-section"
import { IncomeSection } from "@/components/income-section"
import { RiskSection } from "@/components/risk-section"
import { LeverageProbeSection } from "@/components/leverage-probe-section"
import { DriftRegimeSection } from "@/components/drift-regime-section"
import { LiquiditySection } from "@/components/liquidity-section"
import { ConfidenceSection } from "@/components/confidence-section"
import { FundComparison } from "@/components/fund-comparison"
import type { CEFProfile, CEFUniverseSnapshot } from "@/lib/cef-types"
import type { FundRanking } from "@/lib/utf-data"
import {
  BarChart3,
  PieChart,
  DollarSign,
  LayoutDashboard,
  GitCompare,
  Crosshair,
  Activity,
  Droplets,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"

type ViewMode = "overview" | "fund-detail" | "comparison"

const fundDetailTabs = [
  { id: "holdings", label: "1. Holdings", icon: PieChart },
  { id: "factors", label: "2. Factors", icon: BarChart3 },
  { id: "income", label: "3. NAV/Market", icon: DollarSign },
  { id: "leverage", label: "4. Leverage", icon: Crosshair },
  { id: "distribution", label: "5. Distribution", icon: DollarSign },
  { id: "drift", label: "6. Drift", icon: Activity },
  { id: "liquidity", label: "7. Liquidity", icon: Droplets },
  { id: "confidence", label: "8. Confidence", icon: ShieldCheck },
] as const

type FundDetailTab = (typeof fundDetailTabs)[number]["id"]

export default function Page() {
  const [snapshot, setSnapshot] = useState<CEFUniverseSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("overview")
  const [selectedTicker, setSelectedTicker] = useState("AEF")
  const [activeDetailTab, setActiveDetailTab] = useState<FundDetailTab>("holdings")

  const loadUniverse = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/universe", { cache: "no-store" })
      const data = (await res.json()) as CEFUniverseSnapshot & { error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to load universe (${res.status})`)
      }
      setSnapshot(data)
      if (data.profiles?.length && !data.profiles.some((p) => p.overview.ticker === selectedTicker)) {
        setSelectedTicker(data.profiles[0].overview.ticker)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load universe")
    } finally {
      setLoading(false)
    }
  }, [selectedTicker])

  useEffect(() => {
    loadUniverse()
  }, [loadUniverse])

  const cefUniverse: CEFProfile[] = snapshot?.profiles ?? []
  const fundRankings: FundRanking[] = snapshot?.rankings ?? []

  const selectedProfile: CEFProfile = useMemo(
    () => cefUniverse.find((p) => p.overview.ticker === selectedTicker) ?? cefUniverse[0],
    [cefUniverse, selectedTicker],
  )

  const totalAum = useMemo(
    () => cefUniverse.reduce((s, f) => s + f.overview.aum, 0),
    [cefUniverse],
  )

  const handleNavigateToFund = useCallback((ticker: string) => {
    setSelectedTicker(ticker)
    setActiveDetailTab("holdings")
    setViewMode("fund-detail")
  }, [])

  const handleSelectFundFromBar = useCallback(
    (ticker: string) => {
      setSelectedTicker(ticker)
      if (viewMode !== "fund-detail") setViewMode("fund-detail")
    },
    [viewMode],
  )

  const topNavItems = [
    { id: "overview" as ViewMode, label: "Portfolio Overview", icon: LayoutDashboard },
    { id: "fund-detail" as ViewMode, label: `Fund Detail (${selectedTicker})`, icon: PieChart },
    { id: "comparison" as ViewMode, label: "Fund Comparison", icon: GitCompare },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading CEF universe from CEF Connect…</p>
      </div>
    )
  }

  if (error || !selectedProfile || cefUniverse.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="max-w-lg text-center text-sm text-muted-foreground">
          {error ?? "No fund data available."}
        </p>
        <button
          type="button"
          onClick={loadUniverse}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary/40"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  const fetchedLabel = snapshot?.fetchedAt
    ? new Date(snapshot.fetchedAt).toLocaleString("en-US", { timeZone: "America/New_York" })
    : "unknown"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader
        profile={selectedProfile}
        fundCount={cefUniverse.length}
        totalAum={totalAum}
        viewMode={viewMode}
        fetchedAt={snapshot?.fetchedAt}
      />

      <div className="border-b border-border px-6 py-3 bg-secondary/20">
        <CefSelector funds={cefUniverse} selectedTicker={selectedTicker} onSelect={handleSelectFundFromBar} />
      </div>

      <nav className="border-b border-border px-6" role="tablist" aria-label="Dashboard views">
        <div className="flex gap-1 overflow-x-auto">
          {topNavItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={viewMode === item.id}
                onClick={() => setViewMode(item.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  viewMode === item.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {viewMode === "fund-detail" && (
        <nav className="border-b border-border bg-secondary/10 px-6" role="tablist" aria-label="Fund analysis sections">
          <div className="flex gap-1 overflow-x-auto">
            {fundDetailTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeDetailTab === tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                    activeDetailTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      <main className="flex-1 p-6">
        {viewMode === "overview" && (
          <PortfolioOverview
            funds={cefUniverse}
            rankings={fundRankings}
            selectedTicker={selectedTicker}
            onSelectFund={setSelectedTicker}
            onNavigateToFund={handleNavigateToFund}
          />
        )}

        {viewMode === "fund-detail" && (
          <>
            {activeDetailTab === "holdings" && <HoldingsSection data={selectedProfile} />}
            {activeDetailTab === "factors" && <FactorsSection data={selectedProfile} />}
            {activeDetailTab === "income" && <RiskSection data={selectedProfile} />}
            {activeDetailTab === "leverage" && <LeverageProbeSection data={selectedProfile} />}
            {activeDetailTab === "distribution" && <IncomeSection data={selectedProfile} />}
            {activeDetailTab === "drift" && <DriftRegimeSection data={selectedProfile} />}
            {activeDetailTab === "liquidity" && <LiquiditySection data={selectedProfile} />}
            {activeDetailTab === "confidence" && <ConfidenceSection data={selectedProfile} />}
          </>
        )}

        {viewMode === "comparison" && (
          <FundComparison funds={cefUniverse} rankings={fundRankings} onNavigateToFund={handleNavigateToFund} />
        )}
      </main>

      <footer className="border-t border-border px-6 py-3">
        <p className="text-center text-xs text-muted-foreground">
          CEF X-Ray Dashboard | {cefUniverse.length} Funds | 8-Section Analytics | 5-Pillar Scoring | CEF Connect
          live data | Last updated {fetchedLabel} ET | Not investment advice
        </p>
      </footer>
    </div>
  )
}
