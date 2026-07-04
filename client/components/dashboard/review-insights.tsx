"use client"

import { useEffect, useState, useCallback } from "react"
import { Sparkles, TrendingUp, TrendingDown, Minus, Star, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

type Period = "week" | "month" | "all"

interface InsightsData {
  summary: string
  metrics: {
    averageRating: number
    totalReviews: number
    positivePercent: number
    neutralPercent: number
    negativePercent: number
    growthRate: number
    previousPeriodAvg: number
  }
  topPraises: { phrase: string; count: number }[]
  topComplaints: { phrase: string; count: number }[]
  trend: { date: string; count: number; avgRating: number }[]
}

interface Props {
  businessId: string
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
]

export function ReviewInsights({ businessId }: Props) {
  const [period, setPeriod] = useState<Period>("month")
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchInsights = useCallback(async (p: Period) => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.ai.getInsights(businessId, p)
      setData(res)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchInsights(period)
  }, [period, fetchInsights])

  const chartData = (data?.trend || []).map((d) => ({
    date: d.date.slice(5),
    count: d.count,
    avgRating: d.avgRating,
  }))

  const totalTrendReviews = chartData.reduce((s, d) => s + d.count, 0)

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-accent/20 p-5">
      <div className="absolute right-0 top-0 size-48 translate-x-12 -translate-y-12 rounded-full bg-primary/5 blur-3xl" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">AI Review Insights</h2>
            <p className="text-sm text-muted-foreground">
              What your customers are saying
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                period === p.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="mt-2 h-[80px] w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="size-4" />
          <span>Unable to load insights right now.</span>
        </div>
      ) : data ? (
        <div className="mt-4 space-y-4">
          {/* Summary */}
          <div className="rounded-lg bg-primary/[0.03] px-4 py-3">
            <p className="text-sm leading-relaxed text-foreground/85">{data.summary}</p>
          </div>

          {/* Mini metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              icon={Star}
              label="Avg Rating"
              value={data.metrics.averageRating.toFixed(1)}
              subtitle={`out of 5 (${data.metrics.totalReviews} reviews)`}
            />
            <MetricCard
              icon={data.metrics.growthRate > 0 ? TrendingUp : data.metrics.growthRate < 0 ? TrendingDown : Minus}
              label="Rating Trend"
              value={`${data.metrics.growthRate > 0 ? "+" : ""}${data.metrics.growthRate}%`}
              subtitle={`prev: ${data.metrics.previousPeriodAvg.toFixed(1)}`}
              accent={data.metrics.growthRate > 0 ? "text-emerald-600 dark:text-emerald-400" : data.metrics.growthRate < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
            />
            <MetricCard
              icon={ThumbsUp}
              label="Positive"
              value={`${data.metrics.positivePercent}%`}
              subtitle={`${data.metrics.neutralPercent}% neutral`}
            />
            <MetricCard
              icon={ThumbsDown}
              label="Needs Improvement"
              value={`${data.metrics.negativePercent}%`}
              subtitle={`of all reviews`}
              accent={data.metrics.negativePercent > 20 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
            />
          </div>

          {/* Praises and Complaints */}
          <div className="grid gap-4 sm:grid-cols-2">
            {data.topPraises.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Top Praises
                </h3>
                <div className="space-y-1.5">
                  {data.topPraises.map((p) => (
                    <div key={p.phrase} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{ width: `${Math.min(100, (p.count / Math.max(1, data.topPraises[0].count)) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 truncate text-right text-muted-foreground">{p.phrase}</span>
                      <span className="w-5 text-right font-mono text-xs text-foreground">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.topComplaints.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">
                  Areas to Improve
                </h3>
                <div className="space-y-1.5">
                  {data.topComplaints.map((c) => (
                    <div key={c.phrase} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-red-500/60"
                          style={{ width: `${Math.min(100, (c.count / Math.max(1, data.topComplaints[0].count)) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 truncate text-right text-muted-foreground">{c.phrase}</span>
                      <span className="w-5 text-right font-mono text-xs text-foreground">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mini trend chart */}
          {totalTrendReviews > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                Daily review activity ({period === "week" ? "Last 7 days" : period === "month" ? "Last 30 days" : "Last 90 days"})
              </h3>
              <div className="h-[80px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} maxBarSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: typeof Star
  label: string
  value: string
  subtitle: string
  accent?: string
}) {
  return (
    <div className="rounded-lg bg-background/60 p-3 ring-1 ring-foreground/5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("size-3.5", accent)} />
        <span>{label}</span>
      </div>
      <div className={cn("mt-1 text-lg font-semibold tracking-tight text-foreground", accent)}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>
    </div>
  )
}
