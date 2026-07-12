"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Calendar, Building2, CreditCard, Activity } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.user(id as string)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="h-48 animate-pulse rounded-lg bg-zinc-800" />
  }

  if (!data) {
    return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">User not found</div>
  }

  const { user } = data

  return (
    <div className="space-y-4 md:space-y-6">
      <Link href={`/${ADMIN_BASE}/users`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="size-4" /> Back to users
      </Link>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{user.name || "Unnamed User"}</h1>
            <div className="mt-1 flex flex-col gap-1 text-sm text-zinc-500 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-1"><Mail className="size-3.5" /> {user.email}</span>
              <span className="flex items-center gap-1"><Calendar className="size-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {user.googleId && (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">Google OAuth</span>
          )}
        </div>
      </div>

      {user.subscriptions?.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-100"><CreditCard className="size-4" /> Subscriptions</h2>
          <div className="space-y-2">
            {user.subscriptions.map((sub: any) => (
              <div key={sub.id} className="rounded-md bg-zinc-800/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-100">{sub.plan?.name || "Unknown Plan"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${sub.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700 text-zinc-400"}`}>
                    {sub.status}
                  </span>
                </div>
                <div className="mt-1 text-zinc-500">
                  AI: {sub.aiCallsUsed}/{sub.aiCallsLimit} | Created: {new Date(sub.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-100"><Building2 className="size-4" /> Businesses ({user.businesses?.length || 0})</h2>
        <div className="space-y-2">
          {user.businesses?.map((biz: any) => (
            <Link key={biz.id} href={`/${ADMIN_BASE}/businesses/${biz.id}`} className="block rounded-md bg-zinc-800/50 p-3 text-sm transition-colors hover:bg-zinc-800 active:bg-zinc-700">
              <div className="font-medium text-amber-400">{biz.name}</div>
              <div className="mt-0.5 text-zinc-500">{biz.industry} | {biz._count.feedback} feedback | {biz.location || "No location"}</div>
            </Link>
          ))}
          {(!user.businesses || user.businesses.length === 0) && (
            <p className="text-sm text-zinc-500">No businesses</p>
          )}
        </div>
      </div>

      {user.activityLogs?.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-100"><Activity className="size-4" /> Recent Activity</h2>
          <div className="space-y-1 text-sm">
            {user.activityLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between rounded px-2 py-1.5 text-zinc-400">
                <span>{log.action}</span>
                <span className="text-xs text-zinc-600">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
