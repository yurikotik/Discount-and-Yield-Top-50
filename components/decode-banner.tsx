"use client"

import { Search, Activity, ShieldCheck } from "lucide-react"

const pillars = [
  {
    icon: Search,
    title: "Decode Holdings",
    description: "Live look-through; sector and issuer mapping; leverage and derivatives detection.",
  },
  {
    icon: Activity,
    title: "Decode Behavior",
    description: "NAV vs market decomposition; factor drift alerts; distribution sustainability signals.",
  },
  {
    icon: ShieldCheck,
    title: "Decode Risk",
    description: "Concentration spikes; liquidity traps; premium/discount anomalies.",
  },
]

export function DecodeBanner() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-foreground tracking-tight text-balance">
            We Don{"'"}t Replicate &mdash; We Decode
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl text-pretty">
            We keep the CEF. We keep the yield. We keep the discount. We remove the guesswork.
            Hercules X-ray intelligence decodes each fund{"'"}s true exposures without replacing it or losing the NAV discount.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className="flex gap-3 rounded-md border border-border/50 bg-secondary/30 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">{p.title}</span>
                  <span className="text-[10px] text-muted-foreground leading-relaxed">{p.description}</span>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          5-pillar scoring: Yield Quality 25% + Discount Attractiveness 25% + X-Ray Stability 20% + Risk & Liquidity 15% + Momentum & Regime 15%
        </p>
      </div>
    </div>
  )
}
