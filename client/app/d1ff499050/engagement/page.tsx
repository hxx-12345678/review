"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { StatCard, Panel, LoadingCards } from "@/components/admin/stats"
import { ChartCard, AreaTrend, BarTrend, CHART_COLORS } from "@/components/admin/charts"

const ACTION_LABELS: Record<string, string> = {
  feedback_submitted: "Reviews submitted",
  review_request_email_sent: "Email review requests",
  review_request_sms_sent: "SMS review requests",
  qr_generated: "QR codes generated",
  draft_generated: "Draft replies",
  reply_generated: "Replies generated",
  insights_generated: "Insights generated",
  google_review_replied: "Google replies",
  google_click: "Google link clicks",
  gbp_reply_posted: "GBP replies",
  cross_platform_reply: "Cross-platform replies",
  whatsapp_flow_sent: "WhatsApp flows",
  review_task_created: "Review tasks",
}

export default function AdminEngagementPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    adminApi.analyticsEngagement()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4"><h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Engagement</h1><LoadingCards count={5} /></div>
  if (error) return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</div>

  const avgDau = data?.avgDau ?? 0
  const mau = data?.mau ?? 0
  const wau = data?.wau ?? 0
  const stickiness = data?.stickiness ?? 0
  const weeklyStickiness = data?.weeklyStickiness ?? 0
  const actionsPerUser = data?.actionsPerUser ?? 0
  const powerUsers = data?.powerUsers || []
  const adoption = data?.featureAdoption || []
  const weekly = data?.weeklyStickinessTrend || []

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Engagement</h1>
        <p className="text-sm text-zinc-500">Daily activity and feature adoption. Stickiness benchmark: 31% average across SaaS, &lt;8% is a red flag.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Avg DAU" value={String(avgDau)} sub="avg unique users/day (30d)" accent="bg-cyan-500/10 text-cyan-400" />
        <StatCard label="WAU" value={String(wau)} sub="unique users this week" accent="bg-blue-500/10 text-blue-400" />
        <StatCard label="MAU" value={String(mau)} sub="unique users this month" accent="bg-violet-500/10 text-violet-400" />
        <StatCard label="Stickiness" value={`${stickiness}%`} sub="DAU/MAU · 31% avg · <8% red flag" accent="bg-amber-500/10 text-amber-400" />
        <StatCard label="Power users" value={String(powerUsers.length)} sub="top 10 by activity volume" accent="bg-emerald-500/10 text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Daily active users" subtitle="last 30 days">
          <AreaTrend data={data?.dau || []} label="dau" color={CHART_COLORS.cyan} />
        </ChartCard>
        <ChartCard title="Actions per day" subtitle={`total tracked actions · ${actionsPerUser} per active user`}>
          <AreaTrend data={data?.actionsTrend || []} label="actions" color={CHART_COLORS.violet} />
        </ChartCard>
      </div>

      {weekly.length > 0 && (
        <ChartCard title="Weekly stickiness" subtitle="rolling WAU/MAU per week">
          <BarTrend data={weekly} label="weekly" color={CHART_COLORS.amber} formatter={(v) => `${v}%`} />
        </ChartCard>
      )}

      <Panel title="Feature adoption" subtitle="% of MAU who performed each core action in the last 30 days. Benchmark: 24.5% core-feature adoption.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Users</th>
                <th className="py-2">Adoption %</th>
              </tr>
            </thead>
            <tbody>
              {adoption.map((a: any) => (
                <tr key={a.action} className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 text-zinc-200">{ACTION_LABELS[a.action] || a.action}</td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-300">{a.users}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, a.adoptionRate)}%` }} />
                      </div>
                      <span className="w-10 tabular-nums text-zinc-300">{a.adoptionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {adoption.length === 0 && <tr><td colSpan={3} className="py-3 text-zinc-500">No core actions recorded in the last 30 days.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {powerUsers.length > 0 && (
        <Panel title="Top users by activity" subtitle="last 30 days">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {powerUsers.map((u: any) => (
              <div key={u.userId} className="flex items-center justify-between rounded-md bg-zinc-800/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{u.name || u.email}</p>
                  <p className="truncate text-xs text-zinc-500">{u.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">{u.count} actions</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
