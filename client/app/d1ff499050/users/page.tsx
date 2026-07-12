"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"

export default function AdminUsersPage() {
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.users({ page, limit: 20, search: search || undefined })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Users</h1>
      </div>

      <div className="relative w-full md:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border-zinc-700 bg-zinc-900 pl-9 text-zinc-100 h-11 md:h-10"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-zinc-500">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">AI Usage</th>
                  <th className="p-3 font-medium">Businesses</th>
                  <th className="p-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((user: any) => (
                  <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-3">
                      <Link href={`/${ADMIN_BASE}/users/${user.id}`} className="font-medium text-amber-400 hover:underline">
                        {user.name || "—"}
                      </Link>
                    </td>
                    <td className="p-3 text-zinc-300">{user.email}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${user.subscriptionStatus === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                        {user.currentPlan || "None"}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300">{user.aiCallsUsed}/{user.aiCallsLimit}</td>
                    <td className="p-3 text-zinc-300">{user.businessCount}</td>
                    <td className="p-3 text-zinc-300">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile user cards */}
          <div className="space-y-2 md:hidden">
            {data?.users.map((user: any) => (
              <Link
                key={user.id}
                href={`/${ADMIN_BASE}/users/${user.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 p-3 active:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-400">{user.name || "—"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${user.subscriptionStatus === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                    {user.currentPlan || "None"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>AI: {user.aiCallsUsed}/{user.aiCallsLimit}</span>
                  <span>Biz: {user.businessCount}</span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>

          {data && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span className="text-xs md:text-sm">{data.total} users total</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md p-2 hover:bg-zinc-800 disabled:opacity-40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs md:text-sm">Page {data.page} of {data.totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="rounded-md p-2 hover:bg-zinc-800 disabled:opacity-40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

