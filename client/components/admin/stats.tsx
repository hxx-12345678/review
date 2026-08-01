"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export function Delta({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-zinc-500">
        <Minus className="size-3" /> n/a
      </span>
    )
  }
  const up = pct >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
        pct === 0
          ? "bg-zinc-800 text-zinc-400"
          : up
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400",
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {pct}%
    </span>
  )
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  delta?: number | null
  icon?: React.ReactNode
  accent: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 md:p-4">
      <div className="flex items-center justify-between">
        {icon ? <div className={cn("inline-flex rounded-md p-1.5 md:p-2", accent)}>{icon}</div> : null}
        {delta !== undefined ? <Delta pct={delta} /> : null}
      </div>
      <p className="mt-2 text-lg font-bold text-zinc-100 md:mt-3 md:text-2xl">{value}</p>
      <p className="text-xs text-zinc-500 md:text-sm">{label}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-zinc-600">{sub}</p> : null}
    </div>
  )
}

export function Panel({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900", className)}>
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="font-semibold text-zinc-100">{title}</h2>
          {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function LoadingCards({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-800" />
      ))}
    </div>
  )
}
