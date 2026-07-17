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

/** Plain verbs — Medicare.gov style task labels */
const fundDetailTabs = [
  { id: "holdings", label: "See Holdings", help: "What the fund owns", icon: PieChart },
  { id: "factors", label: "See Factors", help: "What drives returns", icon: BarChart3 },
  { id: "income", label: "Check Price vs Value", help: "Market price vs NAV", icon: DollarSign },
  { id: "leverage", label: "Check Borrowing", help: "How much leverage", icon: Crosshair },
  { id: "distribution", label: "Check Income", help: "Distributions & coverage", icon: DollarSign },
  { id: "drift", label: "See Drift", help: "Has the fund changed?", icon: Activity },
  { id: "liquidity", label: "Check Liquidity", help: "How easy to trade", icon: Droplets },
  { id: "confidence", label: "Trust Score", help: "Data quality & caveats", icon: ShieldCheck },
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
    {
      id: "overview" as ViewMode,
      label: "See All Funds",
      help: "Rankings and big-picture stats",
      icon: LayoutDashboard,
    },
    {
      id: "fund-detail" as ViewMode,
      label: `Check ${selectedTicker}`,
      help: "Deep dive on one fund",
      icon: PieChart,
    },
    {
      id: "comparison" as ViewMode,
      label: "Compare Funds",
      help: "Side-by-side scores",
      icon: GitCompare,
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <p className="max-w-md text-center text-[length:var(--gy-text-lg)] leading-[var(--gy-leading)] text-muted-foreground">
          Loading fund data… This may take a moment.
        </p>
      </div>
    )
  }

  if (error || !selectedProfile || cefUniverse.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
        <div className="max-w-lg text-center">
          <h1 className="gy-section-title mb-3">We could not load fund data</h1>
          <p className="text-[length:var(--gy-text-base)] leading-[var(--gy-leading)] text-muted-foreground">
            {error ?? "No fund data is available right now. Please try again."}
          </p>
        </div>
        <button
          type="button"
          onClick={loadUniverse}
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-[var(--gy-blue)] px-6 text-[length:var(--gy-text-base)] font-semibold text-white hover:opacity-90"
        >
          <RefreshCw className="h-5 w-5" aria-hidden />
          Try again
        </button>
      </div>
    )
  }

  const fetchedLabel = snapshot?.fetchedAt
    ? new Date(snapshot.fetchedAt).toLocaleString("en-US", { timeZone: "America/New_York" })
    : "unknown"

  const activeDetailHelp =
    fundDetailTabs.find((t) => t.id === activeDetailTab)?.help ?? ""

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader
        profile={selectedProfile}
        fundCount={cefUniverse.length}
        totalAum={totalAum}
        viewMode={viewMode}
        fetchedAt={snapshot?.fetchedAt}
      />

      <div className="border-b border-border bg-secondary/30 px-6 py-5 md:px-8">
        <CefSelector
          funds={cefUniverse}
          selectedTicker={selectedTicker}
          onSelect={handleSelectFundFromBar}
        />
      </div>

      <div className="border-b border-border px-6 py-5 md:px-8">
        <p className="gy-section-title">What do you want to do?</p>
        <p className="gy-section-help">
          Pick one path. You can change anytime — nothing is locked in.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Main tasks">
          {topNavItems.map((item) => {
            const Icon = item.icon
            const active = viewMode === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-active={active}
                onClick={() => setViewMode(item.id)}
                className="gy-task-card"
              >
                <span className="flex items-center gap-2 text-[length:var(--gy-text-base)] font-bold text-foreground">
                  <Icon className="h-5 w-5 text-[var(--gy-blue)]" aria-hidden />
                  {item.label}
                </span>
                <span className="text-[length:var(--gy-text-sm)] leading-[var(--gy-leading)] text-muted-foreground">
                  {item.help}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {viewMode === "fund-detail" && (
        <nav
          className="border-b border-border bg-card px-6 py-4 md:px-8"
          aria-label="Fund analysis sections"
        >
          <p className="mb-3 text-[length:var(--gy-text-sm)] font-semibold text-muted-foreground">
            Looking at <span className="font-mono text-foreground">{selectedTicker}</span> — choose a
            check:
          </p>
          <div className="flex flex-wrap gap-2" role="tablist">
            {fundDetailTabs.map((tab) => {
              const Icon = tab.icon
              const active = activeDetailTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={tab.help}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 text-[length:var(--gy-text-sm)] font-semibold transition-colors ${
                    active
                      ? "border-[var(--gy-green)] bg-[var(--gy-green-soft)] text-[var(--gy-green)]"
                      : "border-border bg-background text-muted-foreground hover:border-[var(--gy-green)]/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {tab.label}
                </button>
              )
            })}
          </div>
          {activeDetailHelp && (
            <p className="mt-3 text-[length:var(--gy-text-sm)] text-muted-foreground">
              {activeDetailHelp}
            </p>
          )}
        </nav>
      )}

      <main id="main-content" className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8 md:px-8 md:py-10">
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
          <div className="gy-stack">
            {activeDetailTab === "holdings" && <HoldingsSection data={selectedProfile} />}
            {activeDetailTab === "factors" && <FactorsSection data={selectedProfile} />}
            {activeDetailTab === "income" && <RiskSection data={selectedProfile} />}
            {activeDetailTab === "leverage" && <LeverageProbeSection data={selectedProfile} />}
            {activeDetailTab === "distribution" && <IncomeSection data={selectedProfile} />}
            {activeDetailTab === "drift" && <DriftRegimeSection data={selectedProfile} />}
            {activeDetailTab === "liquidity" && <LiquiditySection data={selectedProfile} />}
            {activeDetailTab === "confidence" && <ConfidenceSection data={selectedProfile} />}
          </div>
        )}

        {viewMode === "comparison" && (
          <FundComparison
            funds={cefUniverse}
            rankings={fundRankings}
            onNavigateToFund={handleNavigateToFund}
          />
        )}
      </main>

      <footer className="border-t border-border px-6 py-6 md:px-8">
        <p className="mx-auto max-w-3xl text-center text-[length:var(--gy-text-sm)] leading-[var(--gy-leading)] text-muted-foreground">
          Game of Yield CEF X-Ray · {cefUniverse.length} funds · Data from CEF Connect · Last updated{" "}
          {fetchedLabel} ET · This is not investment advice
        </p>
      </footer>
    </div>
  )
}
