"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Subscriptions</h1>
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 text-sm">
          <button onClick={() => { setTab("subscriptions"); setPage(1) }} className={`rounded-md px-3 py-1.5 transition-colors ${tab === "subscriptions" ? "bg-amber-500/10 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>Active</button>
          <button onClick={() => setTab("plans")} className={`rounded-md px-3 py-1.5 transition-colors ${tab === "plans" ? "bg-amber-500/10 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>Plans</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-800" />)}</div>
      ) : tab === "subscriptions" && subData ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-800">
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
          {/* Mobile subscription cards */}
          <div className="space-y-2 md:hidden">
            {subData.subscriptions.map((sub: any) => (
              <div key={sub.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-100">{sub.user.email}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    sub.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                    sub.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                    "bg-zinc-800 text-zinc-500"
                  }`}>{sub.status}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>Plan: {sub.plan?.name || "—"}</span>
                  <span>AI: {sub.aiCallsUsed}/{sub.aiCallsLimit}</span>
                  <span>{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : "—"} - {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span className="text-xs md:text-sm">{subData.total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md p-2 hover:bg-zinc-800 disabled:opacity-40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"><ChevronLeft className="size-4" /></button>
              <span className="text-xs md:text-sm">Page {subData.page} of {subData.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(subData.totalPages, p + 1))} disabled={page >= subData.totalPages} className="rounded-md p-2 hover:bg-zinc-800 disabled:opacity-40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        </>
      ) : planData ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="font-semibold text-zinc-100">Subscription Plans</h2>
          </div>
          {/* Desktop plans table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Price</th>
                  <th className="p-3 font-medium">AI Limit</th>
                  <th className="p-3 font-medium">Business Limit</th>
                  <th className="p-3 font-medium">Subscribers</th>
                  <th className="p-3 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {planData.plans.map((plan: any) => (
                  <tr key={plan.id} className="border-b border-zinc-800/50">
                    <td className="p-3 text-zinc-100">{plan.name}</td>
                    <td className="p-3 text-zinc-300">₹{(plan.price / 100).toLocaleString()}/mo</td>
                    <td className="p-3 text-zinc-300">{plan.aiCallsLimit.toLocaleString()}</td>
                    <td className="p-3 text-zinc-300">{plan.businessLimit}</td>
                    <td className="p-3 text-zinc-300">{plan._count?.subscriptions || 0}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${plan.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {plan.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile plan cards */}
          <div className="divide-y divide-zinc-800 md:hidden">
            {planData.plans.map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{plan.name}</p>
                  <p className="text-xs text-zinc-500">₹{(plan.price / 100).toLocaleString()}/mo</p>
                  <p className="text-xs text-zinc-500">AI: {plan.aiCallsLimit.toLocaleString()} | Biz: {plan.businessLimit} | Subs: {plan._count?.subscriptions || 0}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${plan.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {plan.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
