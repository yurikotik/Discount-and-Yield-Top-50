"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

type TextScale = "A" | "A+" | "A++"

const SCALE_MAP: Record<TextScale, number> = {
  A: 1,
  "A+": 1.08,
  "A++": 1.16,
}

export function GyA11yToolbar() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [scale, setScale] = useState<TextScale>("A")

  useEffect(() => {
    setMounted(true)
    const saved = window.localStorage.getItem("gy-text-scale") as TextScale | null
    if (saved && SCALE_MAP[saved]) {
      setScale(saved)
      document.documentElement.style.setProperty("--gy-scale", String(SCALE_MAP[saved]))
    }
  }, [])

  function applyScale(next: TextScale) {
    setScale(next)
    document.documentElement.style.setProperty("--gy-scale", String(SCALE_MAP[next]))
    window.localStorage.setItem("gy-text-scale", next)
  }

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark")

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Accessibility controls"
    >
      <div className="flex overflow-hidden rounded-md border border-border">
        {(["A", "A+", "A++"] as TextScale[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => applyScale(level)}
            aria-pressed={scale === level}
            className={`min-h-11 min-w-11 px-3 text-base font-semibold transition-colors ${
              scale === level
                ? "bg-[var(--gy-blue)] text-white"
                : "bg-card text-foreground hover:bg-secondary"
            }`}
            title={`Text size ${level}`}
          >
            {level}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {mounted ? (
          isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
        ) : (
          <span className="h-5 w-5" />
        )}
      </button>
    </div>
  )
}
