"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Plus, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export function AiCreditsBar() {
  const [balance, setBalance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.payments.creditBalance()
      .then((res) => setBalance(res.balance))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !balance) return null

  const monthlyUsed = balance.creditsUsed ?? 0
  const monthlyLimit = balance.creditsLimit ?? 0
  const topUpBalance = balance.creditsTopUpBalance ?? 0
  const monthlyPct = monthlyLimit > 0 ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0
  const totalRemaining = balance.totalRemaining ?? 0
  const exhausted = monthlyUsed >= monthlyLimit && topUpBalance <= 0
  const warning = monthlyPct >= 80 && !exhausted && topUpBalance <= 0
  const hasTopUp = topUpBalance > 0

  return (
    <Link href="/dashboard/billing" className="block">
      <Card className={cn(
        "p-4 hover:shadow-md transition-shadow",
        exhausted && "border-red-500/40 bg-red-500/5",
        warning && "border-amber-500/40 bg-amber-500/5"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className={cn(
              "size-4",
              exhausted ? "text-red-500" : warning ? "text-amber-500" : "text-primary"
            )} />
            <span className="text-sm font-medium text-foreground">Credits</span>
          </div>
          <span className={cn(
            "text-xs tabular-nums",
            exhausted ? "text-red-600 dark:text-red-400 font-semibold" : warning ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}>
            {monthlyUsed}/{monthlyLimit}
            {hasTopUp && <span className="ml-1 text-green-600">+{topUpBalance}</span>}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              exhausted ? "bg-red-500" : warning ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${monthlyPct}%` }}
          />
        </div>
        {hasTopUp && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
            <Zap className="size-3" />
            <span>{topUpBalance} top-up credits available</span>
          </div>
        )}
        {exhausted && (
          <div className="mt-3 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors">
            <Plus className="size-3.5" />
            Buy more credits
          </div>
        )}
        {totalRemaining > 0 && totalRemaining <= 10 && !exhausted && (
          <div className="mt-2 text-xs text-amber-600 font-medium text-center">
            Only {totalRemaining} credits remaining
          </div>
        )}
      </Card>
    </Link>
  )
}