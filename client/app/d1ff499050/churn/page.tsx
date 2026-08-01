"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { StatCard, Panel, LoadingCards } from "@/components/admin/stats"

const TIER_STYLES: Record<string, { text: string; badge: string; bar: string; ring: string }> = {
  critical: { text: "text-rose-400", badge: "bg-rose-500/15 text-rose-400 border-rose-500/30", bar: "bg-rose-500", ring: "from-rose-500 to-rose-600" },
  red: { text: "text-orange-400", badge: "bg-orange-500/15 text-orange-400 border-orange-500/30", bar: "bg-orange-500", ring: "from-orange-500 to-orange-600" },
  yellow: { text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", bar: "bg-amber-500", ring: "from-amber-500 to-amber-600" },
  green: { text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", bar: "bg-emerald-500", ring: "from-emerald-500 to-emerald-600" },
}

export default function AdminChurnPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    adminApi.analyticsChurn()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4"><h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Churn Risk</h1><LoadingCards count={4} /></div>
  if (error) return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</div>

  const counts = data?.counts || {}
  const users = data?.users || []
  const atRisk = data?.atRisk ?? 0

  const cards = [
    { label: "At risk", value: String(atRisk), cls: "text-rose-400", accent: "bg-rose-500/10 text-rose-400" },
    { label: "Critical", value: String(counts.critical ?? 0), cls: "text-rose-400", accent: "bg-rose-500/10 text-rose-400" },
    { label: "High", value: String(counts.red ?? 0), cls: "text-orange-400", accent: "bg-orange-500/10 text-orange-400" },
    { label: "Medium", value: String(counts.yellow ?? 0), cls: "text-amber-400", accent: "bg-amber-500/10 text-amber-400" },
    { label: "Healthy", value: String(counts.green ?? 0), cls: "text-emerald-400", accent: "bg-emerald-500/10 text-emerald-400" },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Churn Risk</h1>
        <p className="text-sm text-zinc-500">Transparent, weighted health score (0–100) per user. Score &gt;45 = likely to churn this quarter.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} accent={c.accent} />
        ))}
      </div>

      <Panel title="Scoring model" subtitle="how the health score is computed">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {[
            { label: "Login drop", w: "25" },
            { label: "Core-action decline", w: "20" },
            { label: "Feature breadth", w: "15" },
            { label: "Silence", w: "15" },
            { label: "Engagement trend", w: "10" },
            { label: "Billing issues", w: "15" },
            { label: "Activation override", w: "+20" },
          ].map((x) => (
            <div key={x.label} className="rounded-md border border-zinc-800 bg-zinc-800/40 p-2 text-center">
              <p className="text-sm font-bold text-zinc-100">{x.w}</p>
              <p className="text-[11px] leading-tight text-zinc-500">{x.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-600">Tiers: green 0–20 · yellow 21–45 · red 46–70 · critical 71+. A user who signed up &gt;30 days ago with no review collected gets +20 (activation override).</p>
      </Panel>

      <Panel title={`Users by risk (${users.length})`} subtitle="sorted by health score, worst first">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Top drivers</th>
                <th className="py-2">Last active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => {
                const s = TIER_STYLES[u.tier] || TIER_STYLES.green
                return (
                  <tr key={u.id} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-zinc-200">{u.name}</div>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                          <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${u.score}%` }} />
                        </div>
                        <span className={`w-8 tabular-nums font-bold ${s.text}`}>{u.score}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${s.badge}`}>{u.tier}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {u.drivers.slice(0, 3).map((d: any) => (
                          <span key={d.key} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400">
                            {d.label}
                            {d.points > 0 && <span className="ml-1 text-zinc-500">+{d.points}</span>}
                          </span>
                        ))}
                        {u.drivers.length === 0 && <span className="text-xs text-zinc-600">—</span>}
                      </div>
                    </td>
                    <td className="py-2 text-zinc-400">
                      {u.daysSilent === null ? "never" : `${u.daysSilent}d ago`}
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-zinc-500">No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
