"use client"

import type { CEFProfile } from "@/lib/cef-universe"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts"

interface Props {
  data: CEFProfile
}

export function FactorsSection({ data }: Props) {
  const { factors, returnDecomposition, navHistory, overview } = data

  const factorBarData = factors.map((f) => ({
    name: f.factor,
    exposure: f.exposure,
  }))

  const decompositionBarData = returnDecomposition.map((r) => ({
    period: r.period,
    "NAV Return": parseFloat(r.navReturn.toFixed(1)),
    "P/D Effect": parseFloat(r.premiumDiscountEffect.toFixed(1)),
    Distribution: parseFloat(r.distributionReturn.toFixed(1)),
    Leverage: parseFloat(r.leverageEffect.toFixed(1)),
  }))

  // Compute premium/discount from navHistory
  const navPriceWithPremium = navHistory.map((h) => ({
    ...h,
    premium: parseFloat(((h.price - h.nav) / h.nav * 100).toFixed(2)),
  }))

  return (
    <div className="gy-stack">
      {/* NAV vs Market Return Decomposition */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">NAV vs Market Return Decomposition</CardTitle>
          <CardDescription>Breaking total return into NAV-driven, premium/discount, distribution, and leverage components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decompositionBarData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" />
                  <XAxis dataKey="period" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)" }} />
                  <Bar dataKey="NAV Return" stackId="a" fill="#117DAE" />
                  <Bar dataKey="P/D Effect" stackId="a" fill="#459212" />
                  <Bar dataKey="Distribution" stackId="a" fill="#D4B40A" />
                  <Bar dataKey="Leverage" stackId="a" fill="#CA3A41" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Period</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Total</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">NAV</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">P/D</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Dist.</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Lev.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnDecomposition.map((r) => (
                  <TableRow key={r.period} className="border-border">
                    <TableCell className="text-xs font-medium text-foreground">{r.period}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">{r.totalReturn.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-primary">{r.navReturn.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-success">{r.premiumDiscountEffect > 0 ? "+" : ""}{r.premiumDiscountEffect.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-warning">{r.distributionReturn.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs text-destructive">{r.leverageEffect.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Factor Exposures Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Factor Exposures</CardTitle>
            <CardDescription>Regression-based factor loading estimates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factorBarData} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <XAxis type="number" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} width={110} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                  />
                  <Bar dataKey="exposure" name="Exposure" radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {factorBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.exposure >= 0 ? "#117DAE" : "#CA3A41"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Factor Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Factor Attribution Detail</CardTitle>
            <CardDescription>Exposure, t-statistics, and significance for {overview.ticker}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Factor</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Exposure</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">t-Stat</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-center">Significance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factors.map((f) => (
                  <TableRow key={f.factor} className="border-border">
                    <TableCell className="text-xs font-medium text-foreground">{f.factor}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className={f.exposure >= 0 ? "text-primary" : "text-destructive"}>
                        {f.exposure >= 0 ? "+" : ""}{f.exposure.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {f.tStat >= 0 ? "+" : ""}{f.tStat.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[length:var(--gy-text-xs)] ${f.significance === "high" ? "text-success border-success/30" : f.significance === "medium" ? "text-warning border-warning/30" : "text-muted-foreground border-muted-foreground/30"}`}>
                        {f.significance}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* NAV vs Price Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">NAV vs Market Price (60-Day)</CardTitle>
          <CardDescription>Recent NAV and market price history for {overview.ticker}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={navHistory} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" />
                <XAxis dataKey="date" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} interval={9} />
                <YAxis tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v) => `$${v}`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "16px", color: "oklch(0.60 0.02 250)" }} />
                <Line type="monotone" dataKey="nav" name="NAV" stroke="#117DAE" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="price" name="Market Price" stroke="#459212" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Premium/Discount Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">Premium / Discount History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navPriceWithPremium} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D2C8" />
                <XAxis dataKey="date" tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} interval={9} />
                <YAxis tick={{ fill: "#4A5560", fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D9D2C8", borderRadius: "8px", color: "#1B242C", fontSize: "16px" }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, "Premium/Discount"]}
                />
                <Area type="monotone" dataKey="premium" stroke="#CA3A41" fill="#CA3A41" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
