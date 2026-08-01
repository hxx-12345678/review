"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { StatCard, Panel, LoadingCards } from "@/components/admin/stats"
import { ChartCard, DualLineTrend, CHART_COLORS } from "@/components/admin/charts"

function heatColor(v: number | null): string {
  if (v === null) return "transparent"
  if (v >= 70) return "rgba(16,185,129,0.55)"
  if (v >= 45) return "rgba(245,158,11,0.5)"
  if (v >= 20) return "rgba(244,63,94,0.5)"
  return "rgba(244,63,94,0.25)"
}

export default function AdminCohortsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    adminApi.analyticsCohorts()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4"><h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Retention</h1><LoadingCards count={3} /></div>
  if (error) return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</div>

  const cohorts = data?.cohorts || []
  const m1Activated = data?.activatedRetention?.[1]
  const m1NonActivated = data?.nonActivatedRetention?.[1]
  const maxCells = Math.max(1, ...cohorts.map((c: any) => c.retention.length))

  // Build the dual-line curve data (M1..M12) from activated/non-activated averages
  const maxLen = Math.max(data?.activatedRetention?.length || 0, data?.nonActivatedRetention?.length || 0)
  const curves = Array.from({ length: maxLen }).map((_, i) => ({
    month: `M${i + 1}`,
    activated: data?.activatedRetention?.[i] ?? null,
    nonActivated: data?.nonActivatedRetention?.[i] ?? null,
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Retention (Cohorts)</h1>
        <p className="text-sm text-zinc-500">% of each signup cohort still active per month. M1 &lt;80% retention for an activation cohort signals an onboarding failure.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="M1 retention — activated" value={m1Activated === null || m1Activated === undefined ? "n/a" : `${m1Activated}%`} sub="who collected a review in month 1" accent="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="M1 retention — not activated" value={m1NonActivated === null || m1NonActivated === undefined ? "n/a" : `${m1NonActivated}%`} sub="signup but no review" accent="bg-rose-500/10 text-rose-400" />
        <StatCard
          label="Activation gap"
          value={m1Activated === null || m1NonActivated === null || m1Activated === undefined || m1NonActivated === undefined ? "n/a" : `${m1Activated - m1NonActivated}pp`}
          sub="activated retain this much better"
          accent="bg-amber-500/10 text-amber-400"
        />
        <StatCard label="Total cohorts" value={String(cohorts.length)} sub="months with signups tracked" accent="bg-blue-500/10 text-blue-400" />
      </div>

      <Panel title="Retention triangle" subtitle="rows = signup month, columns = month since signup. Green ≥70%, amber 45–69%, red <45%.">
        {cohorts.length === 0 ? (
          <p className="text-sm text-zinc-500">No cohort data yet — needs at least 2 months of signups.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="px-2 pb-1 text-left text-xs uppercase text-zinc-500">Cohort</th>
                  <th className="px-1 pb-1 text-center text-xs uppercase text-zinc-500">Size</th>
                  {Array.from({ length: maxCells }).map((_, i) => (
                    <th key={i} className="px-1 pb-1 text-center text-xs uppercase text-zinc-500">M{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c: any) => (
                  <tr key={c.cohort}>
                    <td className="px-2 py-0.5 text-sm text-zinc-300">{c.cohort}</td>
                    <td className="px-1 py-0.5 text-center text-xs tabular-nums text-zinc-400">{c.size}</td>
                    {Array.from({ length: maxCells }).map((_, i) => {
                      const v = c.retention[i] ?? null
                      return (
                        <td key={i} className="p-0">
                          <div
                            className="flex h-8 w-12 items-center justify-center rounded text-[11px] font-medium tabular-nums text-white"
                            style={{ backgroundColor: heatColor(v), opacity: v === null ? 0 : 1 }}
                          >
                            {v === null ? "" : `${v}%`}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ChartCard title="Retention curve — activated vs non-activated" subtitle="average retention by activation status">
        <DualLineTrend
          data={curves}
          series={[
            { key: "activated", name: "Activated", color: CHART_COLORS.emerald },
            { key: "nonActivated", name: "Not activated", color: CHART_COLORS.rose },
          ]}
        />
      </ChartCard>
    </div>
  )
}
