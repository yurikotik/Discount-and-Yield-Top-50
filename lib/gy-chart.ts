/** Game of Yield chart / heat helpers — logo flavor only */

export const GY_CHART = {
  grid: "#D9D2C8",
  tick: "#4A5560",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#D9D2C8",
  tooltipText: "#1B242C",
  blue: "#117DAE",
  green: "#459212",
  gold: "#D4B40A",
  red: "#CA3A41",
  muted: "#6B7280",
} as const

export const GY_RADAR_COLORS = [
  GY_CHART.blue,
  GY_CHART.green,
  GY_CHART.gold,
  GY_CHART.red,
  GY_CHART.muted,
] as const

export const gyTooltipStyle = {
  backgroundColor: GY_CHART.tooltipBg,
  border: `1px solid ${GY_CHART.tooltipBorder}`,
  borderRadius: "8px",
  color: GY_CHART.tooltipText,
  fontSize: "16px",
} as const

export const gyTick = { fill: GY_CHART.tick, fontSize: 13 }

/** Heat scale: green → yellow → red (yellow uses dark ink via CSS) */
export function heatChipClass(score01: number): string {
  if (score01 >= 0.7) return "gy-chip-green"
  if (score01 >= 0.4) return "gy-chip-yellow"
  return "gy-chip-red"
}

export function heatTextClass(score01: number): string {
  if (score01 >= 0.7) return "text-[var(--gy-success)]"
  if (score01 >= 0.4) return "text-[var(--gy-gold)]"
  return "text-[var(--gy-danger)]"
}
