"use client"

import { useState, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { CefSelector } from "@/components/cef-selector"
import { PortfolioOverview } from "@/components/portfolio-overview"
import { HoldingsSection } from "@/components/holdings-section"
import { FactorsSection } from "@/components/factors-section"
import { ProxySection } from "@/components/proxy-section"
import { HedgeSection } from "@/components/hedge-section"
import { CostsSection } from "@/components/costs-section"
import { LeverageSection } from "@/components/leverage-section"
import { SyntheticFundSection } from "@/components/synthetic-fund-section"
import { ExportPanel } from "@/components/export-panel"
import {
  allCEFProfiles,
  buildSyntheticFund,
  type CEFProfile,
  type WeightingRule,
} from "@/lib/cef-universe"
import {
  BarChart3,
  PieChart,
  Repeat2,
  Shield,
  DollarSign,
  AlertTriangle,
  Download,
  LayoutDashboard,
  Layers,
} from "lucide-react"

// ─── View Modes ─────────────────────────────────────────────────────────────

type ViewMode = "overview" | "fund-detail" | "synthetic" | "export"

const fundDetailTabs = [
  { id: "holdings", label: "Holdings", icon: PieChart },
  { id: "factors", label: "Factors", icon: BarChart3 },
  { id: "proxy", label: "Proxy", icon: Repeat2 },
  { id: "hedge", label: "Hedge Sim", icon: Shield },
  { id: "costs", label: "Costs", icon: DollarSign },
  { id: "leverage", label: "Leverage & Risk", icon: AlertTriangle },
] as const

type FundDetailTab = (typeof fundDetailTabs)[number]["id"]

export default function Page() {
  const [viewMode, setViewMode] = useState<ViewMode>("overview")
  const [selectedTicker, setSelectedTicker] = useState("UTF")
  const [activeDetailTab, setActiveDetailTab] = useState<FundDetailTab>("holdings")
  const [weightingRule, setWeightingRule] = useState<WeightingRule>("risk-parity")
  const [selectedBasketIndex, setSelectedBasketIndex] = useState(0)
  const [analyzedTickers] = useState<Set<string>>(
    () => new Set(allCEFProfiles.map((p) => p.overview.ticker))
  )

  const selectedProfile: CEFProfile = useMemo(
    () => allCEFProfiles.find((p) => p.overview.ticker === selectedTicker) ?? allCEFProfiles[0],
    [selectedTicker]
  )

  const syntheticFund = useMemo(
    () => buildSyntheticFund(allCEFProfiles, weightingRule),
    [weightingRule]
  )

  const handleNavigateToFund = useCallback((ticker: string) => {
    setSelectedTicker(ticker)
    setActiveDetailTab("holdings")
    setViewMode("fund-detail")
  }, [])

  const handleSelectFundFromBar = useCallback((ticker: string) => {
    setSelectedTicker(ticker)
    if (viewMode === "fund-detail") {
      // stay in fund-detail, just switch ticker
    } else {
      setViewMode("fund-detail")
    }
  }, [viewMode])

  const topNavItems = [
    { id: "overview" as ViewMode, label: "Portfolio Overview", icon: LayoutDashboard },
    { id: "fund-detail" as ViewMode, label: `Fund Detail (${selectedTicker})`, icon: PieChart },
    { id: "synthetic" as ViewMode, label: "Synthetic Fund", icon: Layers },
    { id: "export" as ViewMode, label: "Export & Prompt", icon: Download },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Global Header */}
      <DashboardHeader profile={selectedProfile} fundCount={allCEFProfiles.length} viewMode={viewMode} />

      {/* CEF Selector Bar */}
      <div className="border-b border-border px-6 py-3 bg-secondary/20">
        <CefSelector
          funds={allCEFProfiles}
          selectedTicker={selectedTicker}
          onSelect={handleSelectFundFromBar}
          analyzedTickers={analyzedTickers}
        />
      </div>

      {/* Top-Level View Navigation */}
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

      {/* Fund Detail Sub-Navigation */}
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

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Portfolio Overview */}
        {viewMode === "overview" && (
          <PortfolioOverview
            funds={allCEFProfiles}
            selectedTicker={selectedTicker}
            onSelectFund={setSelectedTicker}
            onNavigateToFund={handleNavigateToFund}
          />
        )}

        {/* Fund Detail (per-fund analysis) */}
        {viewMode === "fund-detail" && (
          <>
            {activeDetailTab === "holdings" && <HoldingsSection data={selectedProfile} />}
            {activeDetailTab === "factors" && <FactorsSection data={selectedProfile} />}
            {activeDetailTab === "proxy" && <ProxySection data={selectedProfile} selectedBasket={selectedBasketIndex} onSelectBasket={setSelectedBasketIndex} />}
            {activeDetailTab === "hedge" && <HedgeSection data={selectedProfile} />}
            {activeDetailTab === "costs" && <CostsSection data={selectedProfile} />}
            {activeDetailTab === "leverage" && <LeverageSection data={selectedProfile} />}
          </>
        )}

        {/* Synthetic Fund Aggregation */}
        {viewMode === "synthetic" && (
          <SyntheticFundSection
            fund={syntheticFund}
            weightingRule={weightingRule}
            onChangeRule={setWeightingRule}
            profiles={allCEFProfiles}
          />
        )}

        {/* Export & Prompt */}
        {viewMode === "export" && (
          <ExportPanel
            profiles={allCEFProfiles}
            syntheticFund={syntheticFund}
            selectedProfile={selectedProfile}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3">
        <p className="text-center text-xs text-muted-foreground">
          Multi-CEF Analysis Dashboard | 10 Funds | {syntheticFund.weightingRule.replace("-", " ")} weighting | $500M total notional | Not investment advice
        </p>
      </footer>
    </div>
  )
}
