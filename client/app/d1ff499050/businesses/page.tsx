"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"

export default function AdminBusinessesPage() {
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.businesses({ page, limit: 20, search: search || undefined })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Businesses</h1>

      <div className="relative w-full md:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Search by name or slug..."
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
                  <th className="p-3 font-medium">Owner</th>
                  <th className="p-3 font-medium">Industry</th>
                  <th className="p-3 font-medium">Feedback</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.businesses.map((biz: any) => (
                  <tr key={biz.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-3">
                      <Link href={`/${ADMIN_BASE}/businesses/${biz.id}`} className="font-medium text-amber-400 hover:underline">
                        {biz.name}
                      </Link>
                    </td>
                    <td className="p-3 text-zinc-300">
                      <Link href={`/${ADMIN_BASE}/users/${biz.user.id}`} className="hover:underline">{biz.user.email}</Link>
                    </td>
                    <td className="p-3 text-zinc-300">{biz.industry}</td>
                    <td className="p-3 text-zinc-300">{biz._count.feedback}</td>
                    <td className="p-3 text-zinc-300">{biz.location || "—"}</td>
                    <td className="p-3 text-zinc-300">{new Date(biz.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile business cards */}
          <div className="space-y-2 md:hidden">
            {data?.businesses.map((biz: any) => (
              <Link
                key={biz.id}
                href={`/${ADMIN_BASE}/businesses/${biz.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 p-3 active:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-400">{biz.name}</span>
                  <span className="text-xs text-zinc-500">{biz.industry}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{biz.user.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>Feedback: {biz._count.feedback}</span>
                  <span>{biz.location || "—"}</span>
                  <span>{new Date(biz.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>

          {data && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span className="text-xs md:text-sm">{data.total} businesses total</span>
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
