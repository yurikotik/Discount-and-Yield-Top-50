"use client"

import { Search, Activity, ShieldCheck } from "lucide-react"

const pillars = [
  {
    icon: Search,
    title: "See what’s inside",
    description: "Find out what the fund owns — sectors, companies, and borrowing.",
  },
  {
    icon: Activity,
    title: "See how it behaves",
    description: "Compare market price to fund value, and spot income that may not last.",
  },
  {
    icon: ShieldCheck,
    title: "See the risks",
    description: "Watch for crowded bets, hard-to-sell holdings, and pricey premiums.",
  },
]

export function DecodeBanner() {
  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8" aria-labelledby="decode-heading">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2
            id="decode-heading"
            className="text-[length:var(--gy-text-lg)] font-bold tracking-[var(--gy-tracking)] text-foreground text-balance"
          >
            We don’t replace your fund — we explain it
          </h2>
          <p className="max-w-3xl text-[length:var(--gy-text-base)] leading-[var(--gy-leading)] text-muted-foreground text-pretty">
            Keep the closed-end fund, the income, and any discount. X-Ray shows what’s really going
            on so you can decide with clearer information.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.title}
                className="flex gap-4 rounded-lg border border-border bg-secondary/40 p-5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--gy-blue-soft)]">
                  <Icon className="h-6 w-6 text-[var(--gy-blue)]" aria-hidden />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[length:var(--gy-text-base)] font-semibold text-foreground">
                    {p.title}
                  </span>
                  <span className="text-[length:var(--gy-text-sm)] leading-[var(--gy-leading)] text-muted-foreground">
                    {p.description}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[length:var(--gy-text-sm)] leading-[var(--gy-leading)] text-muted-foreground">
          Rankings use five simple checks: income quality, discount attractiveness, stability, risk
          &amp; liquidity, and recent momentum.
        </p>
      </div>
    </section>
  )
}
