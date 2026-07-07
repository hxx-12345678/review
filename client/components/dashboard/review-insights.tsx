"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Sparkles, TrendingUp, TrendingDown, Minus, Star, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
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

const CACHE_TTL = 10 * 60 * 1000

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#f59e0b",
  negative: "#ef4444",
}

export function ReviewInsights({ businessId }: Props) {
  const [period, setPeriod] = useState<Period>("month")
  const [currentData, setCurrentData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const cacheRef = useRef<Map<string, { data: InsightsData; expiresAt: number }>>(new Map())
  const fetchPromisesRef = useRef<Map<string, Promise<InsightsData | null>>>(new Map())
  const currentPeriodRef = useRef<Period>("month")
  const dataRef = useRef<InsightsData | null>(null)

  const fetchInsights = useCallback(async (p: Period) => {
    const cacheKey = `${businessId}:${p}`
    const cached = cacheRef.current.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      if (currentPeriodRef.current === p) {
        setCurrentData(cached.data)
        dataRef.current = cached.data
        setLoading(false)
        setError(false)
      }
      return cached.data
    }

    const existing = fetchPromisesRef.current.get(cacheKey)
    if (existing) {
      const res = await existing
      if (currentPeriodRef.current === p && res) {
        setCurrentData(res)
        dataRef.current = res
        setLoading(false)
        setError(false)
      }
      return res
    }

    const promise = api.ai.getInsights(businessId, p)
      .then((res) => {
        cacheRef.current.set(cacheKey, { data: res, expiresAt: Date.now() + CACHE_TTL })
        return res
      })
      .catch(() => {
        if (!dataRef.current) setError(true)
        return null
      })
      .finally(() => {
        fetchPromisesRef.current.delete(cacheKey)
      })

    fetchPromisesRef.current.set(cacheKey, promise)
    const result = await promise

    if (currentPeriodRef.current === p && result) {
      setCurrentData(result)
      dataRef.current = result
      setLoading(false)
      setError(false)
    }
    return result
  }, [businessId])

  useEffect(() => {
    currentPeriodRef.current = period
    const cacheKey = `${businessId}:${period}`
    const cached = cacheRef.current.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      setCurrentData(cached.data)
      dataRef.current = cached.data
      setLoading(false)
      setError(false)
    } else {
      setLoading(true)
    }

    fetchInsights(period)

    const otherPeriods = PERIODS.filter((p) => p.key !== period).map((p) => p.key)
    for (const op of otherPeriods) {
      const ck = `${businessId}:${op}`
      const oc = cacheRef.current.get(ck)
      if (!oc || oc.expiresAt <= Date.now()) {
        fetchInsights(op)
      }
    }
  }, [period, fetchInsights, businessId])

  const data = currentData

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

      {loading && !data ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="mt-2 h-[120px] w-full rounded-lg" />
        </div>
      ) : error && !data ? (
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

          {/* Metric cards + Sentiment Donut */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="grid grid-cols-2 gap-3 sm:col-span-3 sm:grid-cols-2">
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
            <div className="flex items-center justify-center sm:col-span-2">
              <SentimentDonut
                positive={data.metrics.positivePercent}
                neutral={data.metrics.neutralPercent}
                negative={data.metrics.negativePercent}
                totalReviews={data.metrics.totalReviews}
              />
            </div>
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
                    <PraisesBar key={p.phrase} phrase={p.phrase} count={p.count} maxCount={data.topPraises[0].count} />
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
                    <PraisesBar key={c.phrase} phrase={c.phrase} count={c.count} maxCount={data.topComplaints[0].count} color="red" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function SentimentDonut({ positive, neutral, negative, totalReviews }: { positive: number; neutral: number; negative: number; totalReviews: number }) {
  const donutData = [
    { name: "Positive", value: positive, color: SENTIMENT_COLORS.positive },
    { name: "Neutral", value: neutral, color: SENTIMENT_COLORS.neutral },
    { name: "Negative", value: negative, color: SENTIMENT_COLORS.negative },
  ].filter((d) => d.value > 0)

  const dominant = donutData.length > 0 ? donutData.reduce((a, b) => (a.value > b.value ? a : b)) : null

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative size-[100px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={46}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {donutData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold leading-none text-foreground">{dominant?.value ?? 0}%</span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            {dominant?.name ?? "N/A"}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        <h3 className="text-xs font-medium text-foreground">Sentiment</h3>
        <div className="space-y-1">
          {donutData.map((d) => (
            <div key={d.name} className="flex items-center gap-2" title={`${d.value}% of ${totalReviews} reviews`}>
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-muted-foreground shrink-0">{d.name}</span>
              <span className="ml-auto text-xs font-medium text-foreground tabular-nums">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PraisesBar({ phrase, count, maxCount, color = "emerald" }: { phrase: string; count: number; maxCount: number; color?: "emerald" | "red" }) {
  const barColor = color === "emerald" ? "bg-emerald-500/60" : "bg-red-500/60"
  return (
    <div className="flex items-center gap-2 text-sm" title={`Mentioned in ${count} review${count !== 1 ? "s" : ""}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(100, (count / Math.max(1, maxCount)) * 100)}%` }}
        />
      </div>
      <span className="w-28 truncate text-right text-muted-foreground">{phrase}</span>
      <span className="w-5 text-right font-mono text-xs text-foreground">{count}</span>
    </div>
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
