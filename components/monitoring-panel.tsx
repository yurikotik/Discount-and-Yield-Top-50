"use client"

import type { MonitoringAlert } from "@/lib/pipeline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info } from "lucide-react"

interface Props {
  alerts: MonitoringAlert[]
}

const severityConfig = {
  critical: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", badge: "bg-destructive text-destructive-foreground" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 border-warning/30", badge: "bg-warning text-warning-foreground" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted border-border", badge: "bg-muted text-muted-foreground" },
}

export function MonitoringPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Monitoring & Runbook Alerts</CardTitle>
          <CardDescription>No active alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-success">All checks passed. Pipeline outputs within expected parameters.</p>
        </CardContent>
      </Card>
    )
  }

  const criticalCount = alerts.filter(a => a.severity === "critical").length
  const warningCount = alerts.filter(a => a.severity === "warning").length

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm text-foreground">Monitoring & Runbook Alerts</CardTitle>
            <CardDescription>
              {criticalCount > 0 && <span className="text-destructive">{criticalCount} critical</span>}
              {criticalCount > 0 && warningCount > 0 && " / "}
              {warningCount > 0 && <span className="text-warning">{warningCount} warning</span>}
              {(criticalCount > 0 || warningCount > 0) && " / "}
              {alerts.length} total
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {alerts.map((alert, i) => {
            const cfg = severityConfig[alert.severity]
            const Icon = cfg.icon
            return (
              <div key={i} className={`flex items-start gap-3 rounded-md border p-3 ${cfg.bg}`}>
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-foreground">{alert.ticker}</span>
                    <Badge variant="outline" className="font-mono text-[9px]">{alert.tag}</Badge>
                  </div>
                  <p className="text-xs text-foreground/80">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Action: {alert.action}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
