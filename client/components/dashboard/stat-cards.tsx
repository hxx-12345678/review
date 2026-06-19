import { Star, TrendingUp, MessageSquare, Send, FileText, MousePointerClick } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Stat {
  label: string
  value: string
  delta: string
  icon: typeof Star
}

export function StatCards({
  rating,
  reviewCount,
  totalDrafts,
  totalClicks,
  conversionRate,
}: {
  rating: number
  reviewCount: number
  totalDrafts: number
  totalClicks: number
  conversionRate: number
}) {
  const stats: Stat[] = [
    { label: "Average rating", value: rating.toFixed(1), delta: "Across all feedback", icon: Star },
    { label: "Total feedback", value: reviewCount.toString(), delta: "All submissions", icon: MessageSquare },
    { label: "Drafts generated", value: totalDrafts.toString(), delta: "AI review drafts", icon: FileText },
    { label: "Google clicks", value: totalClicks.toString(), delta: `${conversionRate}% conversion rate`, icon: MousePointerClick },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="gap-0 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <s.icon className="size-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{s.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{s.delta}</div>
        </Card>
      ))}
    </div>
  )
}
