"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Users, Building2, CreditCard, Receipt, Target, TriangleAlert, Timer, Activity as ActivityIcon, ArrowUpRight } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"
import { StatCard, Panel, Delta, LoadingCards } from "@/components/admin/stats"
import { ChartCard, AreaTrend, BarTrend, CHART_COLORS } from "@/components/admin/charts"

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<any>(null)
  const [churn, setChurn] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.allSettled([adminApi.analyticsOverview(), adminApi.analyticsChurn(), adminApi.stats()])
      .then(([o, c, s]) => {
        if (o.status === "fulfilled") setOverview(o.value)
        if (c.status === "fulfilled") setChurn(c.value)
        if (s.status === "fulfilled") setStats(s.value)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Overview</h1>
        <LoadingCards count={6} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-56 animate-pulse rounded-lg bg-zinc-800" />
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</div>
  }

  const nsm = overview?.nsm
  const mrr = overview?.mrr
  const deltas = overview?.deltas

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Overview</h1>
        <p className="text-sm text-zinc-500">Platform health — monitored, predictive, actionable</p>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Weekly active businesses (NSM)"
          value={String(nsm?.value ?? 0)}
          sub="businesses that collected a review this week"
          delta={nsm?.delta}
          icon={<Target className="size-4 md:size-5" />}
          accent="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          label="Monthly recurring revenue"
          value={`₹${(mrr?.value ?? 0).toLocaleString("en-IN")}`}
          sub="from active subscriptions"
          icon={<Receipt className="size-4 md:size-5" />}
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="Activation rate"
          value={`${overview?.activationRate ?? 0}%`}
          sub={`${overview?.users?.total ?? 0} signups · target 40–55% (AI-native)`}
          icon={<Timer className="size-4 md:size-5" />}
          accent="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          label="Stickiness (DAU/MAU)"
          value={`${overview?.stickiness ?? 0}%`}
          sub={`${overview?.avgDau ?? 0} avg DAU · ${overview?.mau ?? 0} MAU · below 8% = crisis`}
          icon={<ActivityIcon className="size-4 md:size-5" />}
          accent="bg-cyan-500/10 text-cyan-400"
        />
        <StatCard
          label="Users at churn risk"
          value={String(churn?.atRisk ?? 0)}
          sub={`${churn?.counts?.critical ?? 0} critical · ${churn?.counts?.red ?? 0} high`}
          icon={<TriangleAlert className="size-4 md:size-5" />}
          accent="bg-rose-500/10 text-rose-400"
        />
        <StatCard
          label="Total users"
          value={String(stats?.totalUsers ?? overview?.users?.total ?? 0)}
          sub={`${stats?.activeSubscriptions ?? 0} active subscriptions`}
          icon={<Users className="size-4 md:size-5" />}
          accent="bg-blue-500/10 text-blue-400"
        />
      </div>

      {/* WoW deltas */}
      {deltas && (
        <Panel title="Week-over-week momentum" subtitle="last 7 days vs previous 7 days">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "New signups", d: deltas.signups },
              { label: "Active sessions", d: deltas.active },
              { label: "Reviews collected", d: deltas.reviews },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-zinc-800/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">{x.label}</p>
                  <Delta pct={x.d.pct} />
                </div>
                <p className="mt-1 text-lg font-bold text-zinc-100">
                  {x.d.current}
                  <span className="ml-2 text-xs font-normal text-zinc-500">vs {x.d.previous}</span>
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Signups" subtitle="last 30 days">
          <AreaTrend data={overview?.users?.trend || []} label="signups" color={CHART_COLORS.blue} />
        </ChartCard>
        <ChartCard title="Active sessions" subtitle="daily unique users logging in">
          <AreaTrend data={overview?.activeUsers?.trend || []} label="active" color={CHART_COLORS.cyan} />
        </ChartCard>
        <ChartCard title="Reviews collected" subtitle="feedback submitted per day">
          <AreaTrend data={overview?.reviews?.trend || []} label="reviews" color={CHART_COLORS.emerald} />
        </ChartCard>
        <ChartCard title="Monthly recurring revenue" subtitle="captured revenue per month (₹)">
          <BarTrend data={mrr?.trend || []} label="mrr" color={CHART_COLORS.amber} formatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`} />
        </ChartCard>
      </div>

      {/* Bottom row: plans + quick links */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Subscription Plans" subtitle="active plans and subscriber counts">
          <div className="space-y-2">
            {stats?.plans?.map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between rounded-md bg-zinc-800/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{plan.name}</p>
                  <p className="text-xs text-zinc-500">₹{(plan.price / 100).toLocaleString("en-IN")}/{plan.interval || "mo"}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-zinc-200">{plan.subscriberCount} subs</span>
              </div>
            ))}
            {(!stats?.plans || stats.plans.length === 0) && <p className="text-sm text-zinc-500">No plans configured.</p>}
          </div>
        </Panel>

        <Panel title="Deep-dive" subtitle="jump into the analytics">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { href: `/${ADMIN_BASE}/funnel`, label: "Activation funnel", desc: "Signup → first review" },
              { href: `/${ADMIN_BASE}/engagement`, label: "Engagement", desc: "DAU/MAU, feature adoption" },
              { href: `/${ADMIN_BASE}/cohorts`, label: "Retention", desc: "Cohort curves" },
              { href: `/${ADMIN_BASE}/churn`, label: "Churn risk", desc: "Health scores & drivers" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="group rounded-md border border-zinc-800 bg-zinc-800/30 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-amber-400 group-hover:underline">{l.label}</p>
                  <ArrowUpRight className="size-4 text-zinc-500 transition-colors group-hover:text-amber-400" />
                </div>
                <p className="text-xs text-zinc-500">{l.desc}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
