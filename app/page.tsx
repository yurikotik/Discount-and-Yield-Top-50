"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { HoldingsSection } from "@/components/holdings-section"
import { FactorsSection } from "@/components/factors-section"
import { ProxySection } from "@/components/proxy-section"
import { HedgeSection } from "@/components/hedge-section"
import { CostsSection } from "@/components/costs-section"
import { LeverageSection } from "@/components/leverage-section"
import { ExportPanel } from "@/components/export-panel"
import {
  BarChart3,
  PieChart,
  Repeat2,
  Shield,
  DollarSign,
  AlertTriangle,
  Download,
} from "lucide-react"

const tabs = [
  { id: "holdings", label: "Holdings", icon: PieChart },
  { id: "factors", label: "Factors", icon: BarChart3 },
  { id: "proxy", label: "Proxy", icon: Repeat2 },
  { id: "hedge", label: "Hedge Sim", icon: Shield },
  { id: "costs", label: "Costs", icon: DollarSign },
  { id: "leverage", label: "Leverage & Risk", icon: AlertTriangle },
  { id: "export", label: "Export", icon: Download },
] as const

type TabId = (typeof tabs)[number]["id"]

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>("holdings")

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />

      {/* Tab Navigation */}
      <nav className="border-b border-border px-6" role="tablist" aria-label="Dashboard sections">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 p-6">
        {activeTab === "holdings" && <HoldingsSection />}
        {activeTab === "factors" && <FactorsSection />}
        {activeTab === "proxy" && <ProxySection />}
        {activeTab === "hedge" && <HedgeSection />}
        {activeTab === "costs" && <CostsSection />}
        {activeTab === "leverage" && <LeverageSection />}
        {activeTab === "export" && <ExportPanel />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3">
        <p className="text-center text-xs text-muted-foreground">
          UTF Analysis Dashboard | Data sourced from Cohen & Steers Q4 2025 disclosure, CEF Connect, Yahoo Finance | $50M notional | Not investment advice
        </p>
      </footer>
    </div>
  )
}
