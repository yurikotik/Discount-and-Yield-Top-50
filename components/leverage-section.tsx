"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, Eye, CheckCircle2 } from "lucide-react"

interface Props {
  data: CEFProfile
}

export function LeverageSection({ data }: Props) {
  const { leverageProbe: probe, confidence, caveats, overview } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leverage Probe */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {probe.leverageDetected ? (
                <AlertTriangle className="h-4 w-4 text-warning" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              <CardTitle className="text-sm text-foreground">Leverage & Derivatives Probe</CardTitle>
            </div>
            <CardDescription>
              {probe.leverageDetected
                ? `Leverage detected at ${probe.estimatedLeverage}% for ${overview.ticker}`
                : `No significant leverage detected for ${overview.ticker}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
                <Badge className={`w-fit text-xs ${probe.leverageDetected ? "bg-warning/20 text-warning border-0" : "bg-success/20 text-success border-0"}`}>
                  {probe.leverageDetected ? "FLAGGED" : "CLEAN"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Leverage</span>
                <span className="font-mono text-lg font-bold text-foreground">{probe.estimatedLeverage}%</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Unexplained Return</span>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-warning">+{probe.unexplainedReturn}%</span>
                <span className="text-xs text-muted-foreground">annualized, not explained by visible holdings</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Detection Confidence</span>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${probe.confidenceInDetection}%` }} />
                </div>
                <span className="font-mono text-sm font-semibold text-foreground">{probe.confidenceInDetection}%</span>
              </div>
            </div>

            {probe.instruments.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-foreground">Identified Instruments</span>
                <ul className="mt-2 flex flex-col gap-2">
                  {probe.instruments.map((inst, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Shield className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                      <span><strong className="text-foreground">{inst.type}</strong>: ${(inst.notional / 1e6).toFixed(0)}M - {inst.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">{probe.notes}</p>
          </CardContent>
        </Card>

        {/* Confidence & Caveats */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Replication Confidence</CardTitle>
            <CardDescription>Confidence score and risk factors for {overview.ticker}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-secondary/20 p-6">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.25 0.02 250)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={confidence >= 80 ? "#34d399" : confidence >= 60 ? "#fbbf24" : "#f87171"}
                    strokeWidth="8"
                    strokeDasharray={`${(confidence / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute font-mono text-2xl font-bold text-foreground">{confidence}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {confidence >= 80 ? "High Confidence" : confidence >= 60 ? "Moderate Confidence" : "Low Confidence"}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground">Caveats & Risks</span>
              <ul className="mt-2 flex flex-col gap-2">
                {caveats.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Eye className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
