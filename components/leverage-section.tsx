"use client"

import { leverageProbe, confidenceScore, invalidationRisks } from "@/lib/utf-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Shield, Eye, CheckCircle2 } from "lucide-react"

export function LeverageSection() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leverage Probe */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {leverageProbe.flagged ? (
                <AlertTriangle className="h-4 w-4 text-warning" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              <CardTitle className="text-sm text-foreground">Leverage & Derivatives Probe</CardTitle>
            </div>
            <CardDescription>
              {leverageProbe.flagged
                ? "Undisclosed leverage / derivative usage detected"
                : "No significant undisclosed leverage detected"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
                <Badge className={`w-fit text-xs ${leverageProbe.flagged ? "bg-warning/20 text-warning border-0" : "bg-success/20 text-success border-0"}`}>
                  {leverageProbe.flagged ? "FLAGGED" : "CLEAN"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Leverage</span>
                <span className="font-mono text-lg font-bold text-foreground">{leverageProbe.leverageEstimate}x</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Unexplained Return Component</span>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-warning">+{leverageProbe.unexplainedReturn}%</span>
                <span className="text-xs text-muted-foreground">annualized, cannot be attributed to visible holdings</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground">Evidence</span>
              <ul className="mt-2 flex flex-col gap-2">
                {leverageProbe.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Eye className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground">Likely Instruments</span>
              <ul className="mt-2 flex flex-col gap-2">
                {leverageProbe.likelyInstruments.map((inst, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Shield className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                    {inst}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Confidence & Caveats */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Replication Confidence</CardTitle>
            <CardDescription>Overall confidence score and invalidation risks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Confidence Score */}
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-secondary/20 p-6">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.25 0.02 250)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={confidenceScore >= 80 ? "#34d399" : confidenceScore >= 60 ? "#fbbf24" : "#f87171"}
                    strokeWidth="8"
                    strokeDasharray={`${(confidenceScore / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute font-mono text-2xl font-bold text-foreground">{confidenceScore}</span>
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold text-foreground">
                  {confidenceScore >= 80 ? "High Confidence" : confidenceScore >= 60 ? "Moderate Confidence" : "Low Confidence"}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Proxy replication reliability score (0-100)
                </p>
              </div>
            </div>

            {/* Invalidation Risks */}
            <div>
              <span className="text-xs font-semibold text-foreground">Invalidation Risks</span>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">Risk</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Severity</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invalidationRisks.map((r) => (
                    <TableRow key={r.risk} className="border-border">
                      <TableCell className="text-xs text-foreground max-w-[180px]">{r.risk}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            r.severity === "High"
                              ? "text-destructive border-destructive/30"
                              : r.severity === "Medium"
                              ? "text-warning border-warning/30"
                              : "text-muted-foreground border-muted-foreground/30"
                          }`}
                        >
                          {r.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">{r.impact}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
