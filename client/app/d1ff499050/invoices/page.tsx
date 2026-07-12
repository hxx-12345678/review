"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function AdminInvoicesPage() {
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.invoices({ page, limit: 20 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-100">Payments</h1>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />)}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-zinc-500">
                  <th className="p-3 font-medium">ID</th>
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-3 font-mono text-xs text-zinc-500">{inv.id.slice(0, 8)}</td>
                    <td className="p-3 text-zinc-300">{inv.subscription?.user?.email || "—"}</td>
                    <td className="p-3 text-zinc-100">{inv.subscription?.plan?.name || "—"}</td>
                    <td className="p-3 text-zinc-100">₹{(inv.amount / 100).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        inv.status === "captured" ? "bg-emerald-500/10 text-emerald-400" :
                        inv.status === "created" ? "bg-blue-500/10 text-blue-400" :
                        inv.status === "failed" ? "bg-red-500/10 text-red-400" :
                        "bg-zinc-800 text-zinc-500"
                      }`}>{inv.status}</span>
                    </td>
                    <td className="p-3 text-zinc-300">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>Total revenue: <strong className="text-zinc-300">₹{(data.invoices.reduce((sum: number, i: any) => sum + (i.status === "captured" ? i.amount : 0), 0) / 100).toLocaleString()}</strong></span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                <span>Page {data.page} of {data.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40"><ChevronRight className="size-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
