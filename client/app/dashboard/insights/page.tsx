"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, TrendingUp, TrendingDown, Minus, Star, ThumbsUp, ThumbsDown, AlertCircle, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
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

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
]

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#f59e0b",
  negative: "#ef4444",
}

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [business, setBusiness] = useState<any>(null)
  const [period, setPeriod] = useState<Period>("month")
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAllPraises, setShowAllPraises] = useState(false)
  const [showAllComplaints, setShowAllComplaints] = useState(false)

  useEffect(() => {
    if (!user || authLoading) return
    let cancelled = false

    async function load() {
      try {
        const bizRes = await api.businesses.list()
        const biz = bizRes.businesses[0]
        if (cancelled || !biz) return
        setBusiness(biz)
        loadInsights(biz.id, period)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user, authLoading])

  useEffect(() => {
    if (business) {
      setLoading(true)
      loadInsights(business.id, period)
    }
  }, [period, business?.id])

  async function loadInsights(businessId: string, p: Period) {
    try {
      const res = await api.ai.getInsights(businessId, p)
      setData(res)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return <InsightsSkeleton />
  }

  if (!user) {
    router.replace("/login")
    return null
  }

  const hasData = data && data.metrics.totalReviews > 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="AI Insights"
        description="Deep analysis of what your customers are saying."
      />

      <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 pb-24 sm:pb-8">
        {/* Period selector + Export row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs w-fit overflow-x-auto">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "rounded-md px-2.5 sm:px-3 py-1.5 font-medium transition-colors whitespace-nowrap",
                  period === p.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {hasData && (
            <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => window.print()}>
              <Download className="size-3.5 mr-1.5" />
              Export Report
            </Button>
          )}
        </div>

        {hasData && data ? (
          <>
            {/* Summary */}
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-accent/20 p-4 sm:p-6">
              <div className="absolute right-0 top-0 size-48 sm:size-64 translate-x-12 sm:translate-x-16 -translate-y-12 sm:-translate-y-16 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex size-8 sm:size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Sparkles className="size-4 sm:size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-sm sm:text-base text-foreground">AI Summary</h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Generated from {data.metrics.totalReviews} reviews</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-foreground/85 bg-primary/[0.03] rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                  {data.summary}
                </p>
              </div>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Star}
                label="Avg Rating"
                value={data.metrics.averageRating.toFixed(1)}
                subtitle={`${data.metrics.totalReviews} reviews`}
              />
              <MetricCard
                icon={data.metrics.growthRate > 0 ? TrendingUp : data.metrics.growthRate < 0 ? TrendingDown : Minus}
                label="Trend"
                value={`${data.metrics.growthRate > 0 ? "+" : ""}${data.metrics.growthRate}%`}
                subtitle={`Prev: ${data.metrics.previousPeriodAvg.toFixed(1)}`}
                accent={data.metrics.growthRate > 0 ? "text-emerald-600 dark:text-emerald-400" : data.metrics.growthRate < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
              />
              <MetricCard
                icon={ThumbsUp}
                label="Positive"
                value={`${data.metrics.positivePercent}%`}
                subtitle={`${data.metrics.neutralPercent}% neutral`}
                accent="text-emerald-600 dark:text-emerald-400"
              />
              <MetricCard
                icon={ThumbsDown}
                label="Needs Work"
                value={`${data.metrics.negativePercent}%`}
                subtitle="of all reviews"
                accent={data.metrics.negativePercent > 20 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
              />
            </div>

            {/* Sentiment Distribution — deeply improved */}
            <Card className="p-4 sm:p-6">
              <h3 className="font-medium text-sm sm:text-base text-foreground mb-1">Sentiment Distribution</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-4 sm:mb-5">Breakdown of positive, neutral, and negative reviews</p>

              {/* Horizontal stacked bar — mobile friendly */}
              <div className="mb-4 sm:mb-6">
                <div className="flex h-8 sm:h-10 w-full overflow-hidden rounded-lg">
                  {data.metrics.positivePercent > 0 && (
                    <div
                      className="flex items-center justify-center text-xs font-bold text-white transition-all"
                      style={{ width: `${data.metrics.positivePercent}%`, backgroundColor: SENTIMENT_COLORS.positive }}
                    >
                      {data.metrics.positivePercent > 15 ? `${data.metrics.positivePercent}%` : ""}
                    </div>
                  )}
                  {data.metrics.neutralPercent > 0 && (
                    <div
                      className="flex items-center justify-center text-xs font-bold text-white transition-all"
                      style={{ width: `${data.metrics.neutralPercent}%`, backgroundColor: SENTIMENT_COLORS.neutral }}
                    >
                      {data.metrics.neutralPercent > 15 ? `${data.metrics.neutralPercent}%` : ""}
                    </div>
                  )}
                  {data.metrics.negativePercent > 0 && (
                    <div
                      className="flex items-center justify-center text-xs font-bold text-white transition-all"
                      style={{ width: `${data.metrics.negativePercent}%`, backgroundColor: SENTIMENT_COLORS.negative }}
                    >
                      {data.metrics.negativePercent > 15 ? `${data.metrics.negativePercent}%` : ""}
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed sentiment breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Positive", pct: data.metrics.positivePercent, color: SENTIMENT_COLORS.positive, icon: ThumbsUp, desc: "Happy customers who loved their experience" },
                  { label: "Neutral", pct: data.metrics.neutralPercent, color: SENTIMENT_COLORS.neutral, icon: Minus, desc: "Satisfied but not impressed" },
                  { label: "Negative", pct: data.metrics.negativePercent, color: SENTIMENT_COLORS.negative, icon: ThumbsDown, desc: "Unhappy customers who had issues" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/60 bg-card/50 p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="size-4" style={{ color: item.color }} />
                      <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: item.color }}>
                      {item.pct}%
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                    </div>
                    <p className="mt-2 text-[10px] sm:text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Trend Chart */}
            {data.trend.length > 0 && (
              <Card className="p-4 sm:p-6">
                <h3 className="font-medium text-sm sm:text-base text-foreground mb-1">Review Trend</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">Daily review count and avg rating</p>
                <div className="space-y-1 max-h-64 sm:max-h-80 overflow-y-auto pr-1">
                  {data.trend.filter((d) => d.count > 0 || d.avgRating > 0).slice(-14).map((point) => (
                    <div key={point.date} className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                      <span className="w-16 sm:w-24 shrink-0 text-muted-foreground truncate">
                        {new Date(point.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                      </span>
                      <div className="flex-1 flex items-center gap-1.5 sm:gap-2">
                        <div className="flex-1 h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${Math.min(100, (point.count / Math.max(1, ...data.trend.map((t) => t.count))) * 100)}%` }}
                          />
                        </div>
                        <span className="w-5 sm:w-6 text-right font-medium text-foreground tabular-nums">{point.count}</span>
                      </div>
                      <span className={cn(
                        "w-6 sm:w-8 text-right font-medium tabular-nums",
                        point.avgRating >= 4 ? "text-emerald-600" : point.avgRating >= 3 ? "text-amber-600" : "text-red-600"
                      )}>
                        {point.avgRating.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Top Praises & Areas to Improve side by side on desktop */}
            <div className="grid gap-4 sm:grid-cols-2">
              {data.topPraises.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-foreground">Top Praises</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">What customers love most</p>
                    </div>
                    <ThumbsUp className="size-4 sm:size-5 text-emerald-500 shrink-0" />
                  </div>
                  <div className="space-y-2">
                    {(showAllPraises ? data.topPraises : data.topPraises.slice(0, 4)).map((p) => (
                      <PraisesBar key={p.phrase} phrase={p.phrase} count={p.count} maxCount={data.topPraises[0].count} />
                    ))}
                    {data.topPraises.length > 4 && (
                      <button
                        onClick={() => setShowAllPraises(!showAllPraises)}
                        className="flex items-center gap-1 text-[10px] sm:text-xs text-primary hover:text-primary/80 mt-2"
                      >
                        {showAllPraises ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        {showAllPraises ? "Show less" : `Show all ${data.topPraises.length}`}
                      </button>
                    )}
                  </div>
                </Card>
              )}

              {data.topComplaints.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-foreground">Areas to Improve</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">What customers want improved</p>
                    </div>
                    <ThumbsDown className="size-4 sm:size-5 text-red-500 shrink-0" />
                  </div>
                  <div className="space-y-2">
                    {(showAllComplaints ? data.topComplaints : data.topComplaints.slice(0, 4)).map((c) => (
                      <PraisesBar key={c.phrase} phrase={c.phrase} count={c.count} maxCount={data.topComplaints[0].count} color="red" />
                    ))}
                    {data.topComplaints.length > 4 && (
                      <button
                        onClick={() => setShowAllComplaints(!showAllComplaints)}
                        className="flex items-center gap-1 text-[10px] sm:text-xs text-primary hover:text-primary/80 mt-2"
                      >
                        {showAllComplaints ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        {showAllComplaints ? "Show less" : `Show all ${data.topComplaints.length}`}
                      </button>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </>
        ) : error || !hasData ? (
          <Card className="p-6 sm:p-8 text-center">
            <AlertCircle className="size-6 sm:size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {error
                ? "Unable to load insights. Make sure you have active AI credits."
                : "No reviews collected yet. Share your QR code to start gathering feedback."}
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => router.push("/dashboard/billing")}>
              View Plan & Credits
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Insights" description="Deep analysis of what your customers are saying." />
      <div className="px-3 sm:px-6 lg:px-8 space-y-4 pb-24 sm:pb-8">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 sm:h-56 w-full rounded-lg" />
        <Skeleton className="h-32 sm:h-40 w-full rounded-lg" />
      </div>
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
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
        <Icon className={cn("size-3 sm:size-3.5", accent)} />
        <span>{label}</span>
      </div>
      <div className={cn("mt-0.5 text-xl sm:text-2xl font-semibold tracking-tight text-foreground", accent)}>
        {value}
      </div>
      <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{subtitle}</div>
    </Card>
  )
}

function PraisesBar({ phrase, count, maxCount, color = "emerald" }: { phrase: string; count: number; maxCount: number; color?: "emerald" | "red" }) {
  const barColor = color === "emerald" ? "bg-emerald-500/60" : "bg-red-500/60"
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm" title={`Mentioned in ${count} review${count !== 1 ? "s" : ""}`}>
      <div className="h-1.5 sm:h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(100, (count / Math.max(1, maxCount)) * 100)}%` }}
        />
      </div>
      <span className="w-24 sm:w-32 truncate text-right text-muted-foreground">{phrase}</span>
      <span className="w-4 sm:w-5 text-right font-mono text-[10px] sm:text-xs font-medium text-foreground">{count}</span>
    </div>
  )
}
