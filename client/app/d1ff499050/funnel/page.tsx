"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { StatCard, Panel, LoadingCards } from "@/components/admin/stats"
import { FunnelBars } from "@/components/admin/charts"

export default function AdminFunnelPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    adminApi.analyticsFunnel()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4"><h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Activation Funnel</h1><LoadingCards count={4} /></div>
  if (error) return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</div>

  const steps = data?.steps || []
  const activationRate = data?.activationRate ?? 0
  const overall = steps.length >= 5 ? Math.round((steps[4].value / Math.max(1, steps[0].value)) * 100) : 0

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Activation Funnel</h1>
        <p className="text-sm text-zinc-500">How many users reach each value milestone. Benchmark: 40–55% activation for AI-native SMB tools.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Activation rate" value={`${activationRate}%`} sub="users who collected a review" accent="bg-violet-500/10 text-violet-400" />
        <StatCard label="Overall conversion" value={`${overall}%`} sub="signup → clicked to Google" accent="bg-cyan-500/10 text-cyan-400" />
        <StatCard label="Biggest drop-off" value={biggestDropoff(steps)} sub="stage losing the most users" accent="bg-rose-500/10 text-rose-400" />
        <StatCard label="Signed up" value={String(steps[0]?.value ?? 0)} sub="total signups tracked" accent="bg-blue-500/10 text-blue-400" />
      </div>

      <Panel title="Funnel stages" subtitle="each stage's conversion vs the previous stage">
        <FunnelBars steps={steps} />
      </Panel>

      <Panel title="What this tells you" subtitle="research-backed interpretation">
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>• <span className="text-zinc-100">Activation &lt; 30%:</span> onboarding leak — users sign up but never reach first review.</li>
          <li>• Activated users retain <span className="text-zinc-100">2–3× better</span> than non-activated at month 3 — activation is the highest-leverage investment.</li>
          <li>• Non-activated users churn at <span className="text-zinc-100">3–5×</span> the rate of activated ones.</li>
          <li>• If "business created" drops sharply vs signups, first-run experience or empty state is the blocker.</li>
          <li>• If "QR generated" drops, the friction is between business setup and QR generation.</li>
        </ul>
      </Panel>
    </div>
  )
}

function biggestDropoff(steps: { key: string; label: string; value: number; pctOfPrev: number | null }[]): string {
  let worst = -1
  let worstIdx = -1
  for (let i = 1; i < steps.length; i++) {
    const pct = steps[i].pctOfPrev ?? 0
    if (pct < worst || worst === -1) {
      worst = pct
      worstIdx = i
    }
  }
  if (worstIdx < 0) return "n/a"
  const loss = (steps[worstIdx - 1].value - steps[worstIdx].value)
  return `${steps[worstIdx].label} (−${loss})`
}
