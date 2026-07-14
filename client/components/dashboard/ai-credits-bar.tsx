"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export function AiCreditsBar() {
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.payments.subscription()
      .then((res) => setSubscription(res.subscription))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !subscription) return null

  const used = subscription.aiCallsUsed ?? 0
  const limit = subscription.aiCallsLimit ?? 0
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const exhausted = used >= limit
  const warning = pct >= 80 && !exhausted

  return (
    <Card className={cn(
      "p-4",
      exhausted && "border-red-500/40 bg-red-500/5",
      warning && "border-amber-500/40 bg-amber-500/5"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className={cn(
            "size-4",
            exhausted ? "text-red-500" : warning ? "text-amber-500" : "text-primary"
          )} />
          <span className="text-sm font-medium text-foreground">AI Credits</span>
        </div>
        <span className={cn(
          "text-xs tabular-nums",
          exhausted ? "text-red-600 dark:text-red-400 font-semibold" : warning ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}>
          {used}/{limit} used
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            exhausted ? "bg-red-500" : warning ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {exhausted && (
        <Link
          href="/dashboard/billing"
          className="mt-3 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
        >
          <Sparkles className="size-3.5" />
          Buy more credits
        </Link>
      )}
    </Card>
  )
}
