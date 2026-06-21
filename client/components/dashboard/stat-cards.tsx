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
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="gap-0 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground sm:text-sm">{s.label}</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-8">
              <s.icon className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:mt-3 sm:text-2xl">{s.value}</div>
          <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{s.delta}</div>
        </Card>
      ))}
    </div>
  )
}
