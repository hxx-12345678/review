"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, TrendingUp, TrendingDown, Minus, Star, ThumbsUp, ThumbsDown, AlertCircle, MessageSquare, Calendar, ChevronDown, ChevronUp, Download } from "lucide-react"
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
    } catch (err: any) {
      if (err?.code === "LIMIT_REACHED" || err?.message?.includes("AI call limit")) {
        setError(true)
      } else {
        setError(true)
      }
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="Deep analysis of what your customers are saying."
      />

      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Period selector */}
        <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs w-fit">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                period === p.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {data && (
          <>
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-accent/20 p-6">
              <div className="absolute right-0 top-0 size-64 translate-x-16 -translate-y-16 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">AI Summary</h2>
                    <p className="text-xs text-muted-foreground">Generated from {data.metrics.totalReviews} reviews</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground/85 bg-primary/[0.03] rounded-lg px-4 py-3">
                  {data.summary}
                </p>
              </div>
            </Card>

            {/* Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Star}
                label="Average Rating"
                value={data.metrics.averageRating.toFixed(1)}
                subtitle={`out of 5 (${data.metrics.totalReviews} reviews)`}
              />
              <MetricCard
                icon={data.metrics.growthRate > 0 ? TrendingUp : data.metrics.growthRate < 0 ? TrendingDown : Minus}
                label="Rating Trend"
                value={`${data.metrics.growthRate > 0 ? "+" : ""}${data.metrics.growthRate}%`}
                subtitle={`Previous period: ${data.metrics.previousPeriodAvg.toFixed(1)}`}
                accent={data.metrics.growthRate > 0 ? "text-emerald-600 dark:text-emerald-400" : data.metrics.growthRate < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
              />
              <MetricCard
                icon={ThumbsUp}
                label="Positive Reviews"
                value={`${data.metrics.positivePercent}%`}
                subtitle={`${data.metrics.neutralPercent}% neutral`}
                accent="text-emerald-600 dark:text-emerald-400"
              />
              <MetricCard
                icon={ThumbsDown}
                label="Needs Improvement"
                value={`${data.metrics.negativePercent}%`}
                subtitle={`of all reviews`}
                accent={data.metrics.negativePercent > 20 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
              />
            </div>

            {/* Sentiment Distribution */}
            <Card className="p-6">
              <h3 className="font-medium text-foreground mb-4">Sentiment Distribution</h3>
              <div className="flex items-end gap-2 h-32">
                {[
                  { label: "Positive", pct: data.metrics.positivePercent, color: SENTIMENT_COLORS.positive },
                  { label: "Neutral", pct: data.metrics.neutralPercent, color: SENTIMENT_COLORS.neutral },
                  { label: "Negative", pct: data.metrics.negativePercent, color: SENTIMENT_COLORS.negative },
                ].map((item) => (
                  <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{item.pct}%</span>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(item.pct, 4)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Trend Chart */}
            {data.trend.length > 0 && (
              <Card className="p-6">
                <h3 className="font-medium text-foreground mb-1">Review Trend</h3>
                <p className="text-xs text-muted-foreground mb-4">Daily review count and average rating over time</p>
                <div className="space-y-1">
                  {data.trend.filter((d) => d.count > 0 || d.avgRating > 0).slice(-14).map((point) => (
                    <div key={point.date} className="flex items-center gap-3 text-xs">
                      <span className="w-24 shrink-0 text-muted-foreground">
                        {new Date(point.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${Math.min(100, (point.count / Math.max(1, ...data.trend.map((t) => t.count))) * 100)}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-medium text-foreground">{point.count}</span>
                      </div>
                      <span className={cn(
                        "w-8 text-right font-medium",
                        point.avgRating >= 4 ? "text-emerald-600" : point.avgRating >= 3 ? "text-amber-600" : "text-red-600"
                      )}>
                        {point.avgRating.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Top Praises */}
            {data.topPraises.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-foreground">Top Praises</h3>
                    <p className="text-xs text-muted-foreground">What customers love most</p>
                  </div>
                  <ThumbsUp className="size-5 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  {(showAllPraises ? data.topPraises : data.topPraises.slice(0, 4)).map((p) => (
                    <PraisesBar key={p.phrase} phrase={p.phrase} count={p.count} maxCount={data.topPraises[0].count} />
                  ))}
                  {data.topPraises.length > 4 && (
                    <button
                      onClick={() => setShowAllPraises(!showAllPraises)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
                    >
                      {showAllPraises ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      {showAllPraises ? "Show less" : `Show all ${data.topPraises.length} praises`}
                    </button>
                  )}
                </div>
              </Card>
            )}

            {/* Areas to Improve */}
            {data.topComplaints.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-foreground">Areas to Improve</h3>
                    <p className="text-xs text-muted-foreground">What customers want improved</p>
                  </div>
                  <ThumbsDown className="size-5 text-red-500" />
                </div>
                <div className="space-y-2">
                  {(showAllComplaints ? data.topComplaints : data.topComplaints.slice(0, 4)).map((c) => (
                    <PraisesBar key={c.phrase} phrase={c.phrase} count={c.count} maxCount={data.topComplaints[0].count} color="red" />
                  ))}
                  {data.topComplaints.length > 4 && (
                    <button
                      onClick={() => setShowAllComplaints(!showAllComplaints)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
                    >
                      {showAllComplaints ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      {showAllComplaints ? "Show less" : `Show all ${data.topComplaints.length} complaints`}
                    </button>
                  )}
                </div>
              </Card>
            )}

            {/* Export / Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
                <Download className="size-4 mr-2" />
                Export Report
              </Button>
              {business && (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const text = [
                      `BEYONDVYU Insights Report — ${business.name}`,
                      `Period: ${period}`,
                      `Average Rating: ${data.metrics.averageRating.toFixed(1)}/5`,
                      `Total Reviews: ${data.metrics.totalReviews}`,
                      `Positive: ${data.metrics.positivePercent}% | Neutral: ${data.metrics.neutralPercent}% | Negative: ${data.metrics.negativePercent}%`,
                      ``,
                      `Summary: ${data.summary}`,
                      ``,
                      `Top Praises:`,
                      ...data.topPraises.map((p) => `  - ${p.phrase} (${p.count})`),
                      ``,
                      `Areas to Improve:`,
                      ...data.topComplaints.map((c) => `  - ${c.phrase} (${c.count})`),
                    ].join("\n")
                    navigator.clipboard.writeText(text)
                  }}
                >
                  <MessageSquare className="size-4 mr-2" />
                  Copy Report
                </Button>
              )}
            </div>
          </>
        )}

        {error && !data && (
          <Card className="p-8 text-center">
            <AlertCircle className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Unable to load insights. Make sure you have reviews collected and active AI credits.
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => router.push("/dashboard/billing")}>
              View Plan & Credits
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Insights" description="Deep analysis of what your customers are saying." />
      <div className="px-4 sm:px-6 lg:px-8 space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
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
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("size-3.5", accent)} />
        <span>{label}</span>
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight text-foreground", accent)}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>
    </Card>
  )
}

function PraisesBar({ phrase, count, maxCount, color = "emerald" }: { phrase: string; count: number; maxCount: number; color?: "emerald" | "red" }) {
  const barColor = color === "emerald" ? "bg-emerald-500/60" : "bg-red-500/60"
  return (
    <div className="flex items-center gap-2 text-sm" title={`Mentioned in ${count} review${count !== 1 ? "s" : ""}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(100, (count / Math.max(1, maxCount)) * 100)}%` }}
        />
      </div>
      <span className="w-32 truncate text-right text-muted-foreground">{phrase}</span>
      <span className="w-6 text-right font-mono text-xs font-medium text-foreground">{count}</span>
    </div>
  )
}
