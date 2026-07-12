"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Calendar, Building2, CreditCard, Activity, Ban, CheckCircle, Trash2, RotateCcw, XCircle } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  const loadUser = () => {
    setLoading(true)
    adminApi.user(id as string)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUser() }, [id])

  const handleAction = async (action: string) => {
    setActionLoading(action)
    try {
      if (action === "suspend") await adminApi.suspendUser(id as string, "Suspended by admin")
      else if (action === "unsuspend") await adminApi.unsuspendUser(id as string)
      else if (action === "delete") await adminApi.deleteUser(id as string)
      else if (action === "restore") await adminApi.restoreUser(id as string)
      else if (action === "cancel_sub") await adminApi.cancelSubscription(id as string)
      loadUser()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(null)
      setConfirmAction(null)
    }
  }

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-100">{user.name || "Unnamed User"}</h1>
              {user.deletedAt ? (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Deleted</span>
              ) : user.suspended ? (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">Suspended</span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">Active</span>
              )}
            </div>
            <div className="mt-1 flex flex-col gap-1 text-sm text-zinc-500 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-1"><Mail className="size-3.5" /> {user.email}</span>
              <span className="flex items-center gap-1"><Calendar className="size-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            {user.suspendedReason && (
              <p className="mt-1 text-xs text-amber-400">Reason: {user.suspendedReason}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user.googleId && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">Google OAuth</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {user.deletedAt ? (
          <button
            onClick={() => setConfirmAction("restore")}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <RotateCcw className="size-4" /> Restore User
          </button>
        ) : (
          <>
            {user.suspended ? (
              <button
                onClick={() => setConfirmAction("unsuspend")}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle className="size-4" /> Unsuspend User
              </button>
            ) : (
              <button
                onClick={() => setConfirmAction("suspend")}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <Ban className="size-4" /> Suspend User
              </button>
            )}
            {user.subscriptions?.some((s: any) => s.status === "active") && (
              <button
                onClick={() => setConfirmAction("cancel_sub")}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <XCircle className="size-4" /> Cancel Subscription
              </button>
            )}
            {user.deletedAt ? (
              <button
                onClick={() => setConfirmAction("restore")}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <RotateCcw className="size-4" /> Restore User
              </button>
            ) : (
              <button
                onClick={() => setConfirmAction("delete")}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="size-4" /> Delete User
              </button>
            )}
          </>
        )}
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

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-100">Confirm Action</h3>
            <p className="mt-2 text-sm text-zinc-400">
              {confirmAction === "suspend" && `Are you sure you want to suspend "${user.name || user.email}"? They will be unable to log in.`}
              {confirmAction === "unsuspend" && `Restore access for "${user.name || user.email}"?`}
              {confirmAction === "delete" && `Are you sure you want to delete "${user.name || user.email}"? This will soft-delete their account. They will be unable to log in.`}
              {confirmAction === "restore" && `Restore "${user.name || user.email}"? Their account will be reactivated.`}
              {confirmAction === "cancel_sub" && `Cancel the active subscription for "${user.name || user.email}"? They will lose access to premium features.`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmAction)}
                disabled={actionLoading === confirmAction}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  confirmAction === "delete" || confirmAction === "cancel_sub"
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : confirmAction === "suspend"
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                }`}
              >
                {actionLoading === confirmAction ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
