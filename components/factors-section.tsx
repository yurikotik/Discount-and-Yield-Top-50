"use client"

import { factorExposures, navPriceData, returnDecomposition } from "@/lib/utf-data"
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

export function FactorsSection() {
  const factorBarData = factorExposures.map((f) => ({
    name: f.factor,
    exposure: f.exposure,
    contribution: f.contribution,
  }))

  const decompositionBarData = returnDecomposition.map((r) => ({
    period: r.period,
    "NAV Return": r.navReturn,
    "P/D Effect": r.premiumDiscountEffect,
    Distribution: r.distributionReturn,
    Leverage: r.leverageEffect,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* NAV vs Market Return Decomposition */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm text-foreground">NAV vs Market Return Decomposition</CardTitle>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">NEW</Badge>
          </div>
          <CardDescription>Breaking total return into NAV-driven, premium/discount, distribution, and leverage components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decompositionBarData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                  <XAxis dataKey="period" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.018 250)",
                      border: "1px solid oklch(0.25 0.02 250)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 250)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)" }} />
                  <Bar dataKey="NAV Return" stackId="a" fill="#4a9eff" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="P/D Effect" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Distribution" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Leverage" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
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
                  <TableHead className="text-muted-foreground text-xs text-right">Leverage</TableHead>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Factor Exposures Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Factor Exposures</CardTitle>
            <CardDescription>Regression-based factor loading estimates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factorBarData} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <XAxis type="number" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.018 250)",
                      border: "1px solid oklch(0.25 0.02 250)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.01 250)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="exposure" name="Exposure" radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {factorBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.exposure >= 0 ? "#4a9eff" : "#f87171"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Factor Attribution Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Factor Attribution Detail</CardTitle>
            <CardDescription>Return decomposition into NAV-driven vs premium/discount effects</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Factor</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Exposure</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">t-Stat</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factorExposures.map((f) => (
                  <TableRow key={f.factor} className="border-border">
                    <TableCell className="text-xs font-medium text-foreground">{f.factor}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className={f.exposure >= 0 ? "text-primary" : "text-destructive"}>
                        {f.exposure >= 0 ? "+" : ""}{f.exposure.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          Math.abs(f.tStat) >= 2
                            ? "border-success/30 text-success"
                            : "border-muted-foreground/30 text-muted-foreground"
                        }`}
                      >
                        {f.tStat >= 0 ? "+" : ""}{f.tStat.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className={f.contribution >= 0 ? "text-success" : "text-destructive"}>
                        {f.contribution >= 0 ? "+" : ""}{f.contribution.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border bg-secondary/30">
                  <TableCell className="text-xs font-semibold text-foreground">Total Explained</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-mono text-xs font-semibold text-success">
                    +{factorExposures.reduce((sum, f) => sum + f.contribution, 0).toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* NAV vs Price Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">NAV vs Market Price (2-Year)</CardTitle>
          <CardDescription>Decomposing returns into NAV-driven factors vs market-price premium/discount effects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={navPriceData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v) => `$${v}`} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.16 0.018 250)",
                    border: "1px solid oklch(0.25 0.02 250)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 250)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "Premium/Disc") return [`${value.toFixed(2)}%`, name]
                    return [`$${value.toFixed(2)}`, name]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", color: "oklch(0.60 0.02 250)" }} />
                <Line type="monotone" dataKey="nav" name="NAV" stroke="#4a9eff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="price" name="Market Price" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Premium/Discount Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Premium / Discount History</CardTitle>
          <CardDescription>Market price deviation from NAV over 2-year period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navPriceData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.16 0.018 250)",
                    border: "1px solid oklch(0.25 0.02 250)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0.01 250)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, "Premium/Discount"]}
                />
                <Area type="monotone" dataKey="premium" stroke="#f87171" fill="#f87171" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
