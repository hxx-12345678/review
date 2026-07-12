"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function AdminActivityPage() {
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.activity({ page, limit: 30 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-100">Activity Log</h1>

      {loading ? (
        <div className="space-y-1">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-zinc-800" />)}</div>
      ) : (
        <>
          <div className="space-y-1 text-sm">
            {data?.logs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between rounded-md bg-zinc-900/50 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-300 shrink-0">{log.user?.email || "Unknown"}</span>
                  <span className="text-zinc-500">→</span>
                  <span className="text-zinc-100">{log.action}</span>
                  {log.business && (
                    <Link href={`/${ADMIN_BASE}/businesses/${log.business.id}`} className="text-amber-400 hover:underline shrink-0">
                      {log.business.name}
                    </Link>
                  )}
                </div>
                <span className="text-xs text-zinc-600 shrink-0 ml-4">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {data && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>{data.total} events</span>
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
