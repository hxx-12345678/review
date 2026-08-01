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
  const [action, setAction] = useState("")
  const [search, setSearch] = useState("")
  const [days, setDays] = useState("30")

  const refresh = (nextAction: string, nextDays: string, nextSearch: string) => {
    setLoading(true)
    setPage(1)
    adminApi.activity({ page: 1, limit: 30, action: nextAction || undefined, days: Number(nextDays), search: nextSearch || undefined })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    adminApi.activity({ page, limit: 30, action: action || undefined, days: Number(days), search: search || undefined })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  const breakdown = data?.breakdown || []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Activity Log</h1>
        <p className="text-sm text-zinc-500">Every tracked event across the platform.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user or business"
          className="h-9 w-56 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none"
        >
          <option value="">All actions</option>
          {[...new Set(breakdown.map((b: any) => b.action))].map((a) => (
            <option key={String(a)} value={String(a)}>{String(a)}</option>
          ))}
        </select>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
        <button
          onClick={() => refresh(action, days, search)}
          disabled={loading}
          className="h-9 rounded-md bg-amber-500 px-4 text-sm font-medium text-zinc-900 hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="space-y-1">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-zinc-800" />)}</div>
      ) : (
        <>
          <div className="space-y-1 text-sm">
            {data?.logs.map((log: any) => (
              <div key={log.id} className="flex flex-col gap-1 rounded-md bg-zinc-900/50 px-3 py-2.5 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-zinc-300 shrink-0">{log.user?.email || "Unknown"}</span>
                  <span className="text-zinc-500 hidden md:inline">→</span>
                  <span className="text-zinc-100">{log.action}</span>
                  {log.business && (
                    <Link href={`/${ADMIN_BASE}/businesses/${log.business.id}`} className="text-amber-400 hover:underline shrink-0">
                      {log.business.name}
                    </Link>
                  )}
                </div>
                <span className="text-xs text-zinc-600">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {data?.logs.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No events match the current filters.</p>}
          </div>

          {breakdown.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-100">Action breakdown</h2>
              <div className="space-y-2">
                {breakdown.map((b: any) => {
                  const max = Math.max(1, ...breakdown.map((x: any) => x._count))
                  return (
                    <div key={b.action} className="flex items-center gap-3">
                      <span className="w-52 truncate text-xs text-zinc-400">{b.action}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${(b._count / max) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums text-zinc-300">{b._count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {data && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span className="text-xs md:text-sm">{data.total} events</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md p-2 hover:bg-zinc-800 disabled:opacity-40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"><ChevronLeft className="size-4" /></button>
                <span className="text-xs md:text-sm">Page {data.page} of {data.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="rounded-md p-2 hover:bg-zinc-800 disabled:opacity-40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"><ChevronRight className="size-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
