"use client"

import { useEffect, useState } from "react"
import { Users, Building2, CreditCard, Receipt, MessageSquare, Cpu } from "lucide-react"
import { adminApi } from "@/lib/admin-api"

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    adminApi.stats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-100">Overview</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</div>
  }

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400 bg-blue-500/10" },
    { label: "Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-emerald-400 bg-emerald-500/10" },
    { label: "Active Subscriptions", value: stats.activeSubscriptions, icon: CreditCard, color: "text-violet-400 bg-violet-500/10" },
    { label: "Total Revenue", value: `₹${(stats.totalRevenue / 100).toLocaleString()}`, icon: Receipt, color: "text-amber-400 bg-amber-500/10" },
    { label: "AI Calls Used", value: stats.totalAiCalls.toLocaleString(), icon: Cpu, color: "text-cyan-400 bg-cyan-500/10" },
    { label: "Total Feedback", value: stats.totalFeedback.toLocaleString(), icon: MessageSquare, color: "text-rose-400 bg-rose-500/10" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500">Platform-wide statistics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div className={`rounded-md p-2 ${card.color}`}>
                <card.icon className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-zinc-100">{card.value}</p>
            <p className="text-sm text-zinc-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 font-semibold text-zinc-100">Subscription Plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="pb-2 font-medium">Plan</th>
                <th className="pb-2 font-medium">Price</th>
                <th className="pb-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {stats.plans.map((plan: any) => (
                <tr key={plan.id} className="border-b border-zinc-800/50">
                  <td className="py-2 text-zinc-100">{plan.name}</td>
                  <td className="py-2 text-zinc-300">₹{(plan.price / 100).toLocaleString()}/mo</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${plan.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {plan.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
