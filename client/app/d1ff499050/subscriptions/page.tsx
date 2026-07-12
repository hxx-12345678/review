"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState<"subscriptions" | "plans">("subscriptions")
  const [subData, setSubData] = useState<any>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    if (tab === "subscriptions") {
      adminApi.subscriptions({ page, limit: 20 }).then(setSubData).catch(() => {}).finally(() => setLoading(false))
    } else {
      adminApi.plans().then(setPlanData).catch(() => {}).finally(() => setLoading(false))
    }
  }

  useEffect(() => { load() }, [tab, page])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Subscriptions</h1>
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 text-sm">
          <button onClick={() => { setTab("subscriptions"); setPage(1) }} className={`rounded-md px-3 py-1.5 transition-colors ${tab === "subscriptions" ? "bg-amber-500/10 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>Active</button>
          <button onClick={() => setTab("plans")} className={`rounded-md px-3 py-1.5 transition-colors ${tab === "plans" ? "bg-amber-500/10 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>Plans</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />)}</div>
      ) : tab === "subscriptions" && subData ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-zinc-500">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">AI Usage</th>
                  <th className="p-3 font-medium">Period</th>
                </tr>
              </thead>
              <tbody>
                {subData.subscriptions.map((sub: any) => (
                  <tr key={sub.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-3 text-zinc-300">{sub.user.email}</td>
                    <td className="p-3 text-zinc-100">{sub.plan?.name || "—"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        sub.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                        sub.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                        "bg-zinc-800 text-zinc-500"
                      }`}>{sub.status}</span>
                    </td>
                    <td className="p-3 text-zinc-300">{sub.aiCallsUsed}/{sub.aiCallsLimit}</td>
                    <td className="p-3 text-zinc-300">{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : "—"} - {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>{subData.total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              <span>Page {subData.page} of {subData.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(subData.totalPages, p + 1))} disabled={page >= subData.totalPages} className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        </>
      ) : planData ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 font-semibold text-zinc-100">Subscription Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">AI Limit</th>
                  <th className="pb-2 font-medium">Business Limit</th>
                  <th className="pb-2 font-medium">Subscribers</th>
                  <th className="pb-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {planData.plans.map((plan: any) => (
                  <tr key={plan.id} className="border-b border-zinc-800/50">
                    <td className="py-2 text-zinc-100">{plan.name}</td>
                    <td className="py-2 text-zinc-300">₹{(plan.price / 100).toLocaleString()}/mo</td>
                    <td className="py-2 text-zinc-300">{plan.aiCallsLimit.toLocaleString()}</td>
                    <td className="py-2 text-zinc-300">{plan.businessLimit}</td>
                    <td className="py-2 text-zinc-300">{plan._count?.subscriptions || 0}</td>
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
      ) : null}
    </div>
  )
}
