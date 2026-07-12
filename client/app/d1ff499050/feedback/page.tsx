"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { adminApi } from "@/lib/admin-api"

export default function AdminFeedbackPage() {
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.feedback({ page, limit: 20 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-100">Feedback</h1>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-800" />)}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-zinc-500">
                  <th className="p-3 font-medium">Rating</th>
                  <th className="p-3 font-medium">Business</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Liked</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Reply</th>
                  <th className="p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.feedback.map((fb: any) => (
                  <tr key={fb.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-3 text-amber-400">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</td>
                    <td className="p-3 text-zinc-300">{fb.business?.name || "—"}</td>
                    <td className="p-3 text-zinc-300">{fb.customerName || "Anonymous"}</td>
                    <td className="p-3 max-w-[200px] truncate text-zinc-400">{fb.liked || "—"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        fb.status === "REDIRECTED_TO_GOOGLE" ? "bg-emerald-500/10 text-emerald-400" :
                        fb.status === "PRIVATE_FEEDBACK" ? "bg-blue-500/10 text-blue-400" :
                        "bg-zinc-800 text-zinc-500"
                      }`}>{fb.status}</span>
                    </td>
                    <td className="p-3">
                      {fb.generatedReply ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          fb.generatedReply.status === "REPLIED" ? "bg-emerald-500/10 text-emerald-400" :
                          fb.generatedReply.status === "DRAFT" ? "bg-amber-500/10 text-amber-400" :
                          "bg-zinc-800 text-zinc-500"
                        }`}>{fb.generatedReply.status}</span>
                      ) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="p-3 text-zinc-300">{new Date(fb.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>{data.total} total</span>
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
