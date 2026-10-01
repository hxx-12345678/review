"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, MessageSquare, QrCode, Globe, Star } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"

const INDUSTRIES = ["RESTAURANT", "DENTAL", "SALON", "MEDICAL", "AUTO", "AUTO_DEALER", "FITNESS", "ELECTRONICS", "HOME_SERVICES", "OTHER"]

export default function AdminBusinessDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [industry, setIndustry] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState("")

  function reload() {
    setLoading(true)
    adminApi.business(id as string)
      .then((d) => {
        setData(d)
        setIndustry(d.business.industry)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function saveIndustry() {
    if (!industry || industry === data?.business?.industry) return
    setSaving(true)
    setSavedMsg("")
    try {
      const res = await adminApi.updateBusiness(id as string, { industry })
      setData({ business: res.business })
      setSavedMsg(`Industry allotted: ${industry}. Review flow topics follow this industry.`)
    } catch (e: any) {
      setSavedMsg(`Failed: ${e.message || "unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-zinc-800" />
  if (!data) return <div className="rounded-lg bg-red-500/10 p-4 text-red-400">Business not found</div>

  const { business } = data

  return (
    <div className="space-y-4 md:space-y-6">
      <Link href={`/${ADMIN_BASE}/businesses`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="size-4" /> Back to businesses
      </Link>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{business.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {business.industry} | {business.location || "No location"} | Slug: {business.slug}
          </p>
          {/* Industry allotment — customers never pick industry (food-only onboarding) */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="admin-industry" className="text-xs text-zinc-500">Allot industry:</label>
            <select
              id="admin-industry"
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); setSavedMsg("") }}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            <button
              onClick={saveIndustry}
              disabled={saving || !industry || industry === business.industry}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-black disabled:opacity-40"
            >
              {saving ? "Saving…" : "Allot"}
            </button>
          </div>
          {savedMsg && <p className="mt-2 text-xs text-zinc-400">{savedMsg}</p>}
          <p className="text-sm text-zinc-500">
            Owner: <Link href={`/${ADMIN_BASE}/users/${business.user.id}`} className="text-amber-400 hover:underline">{business.user.email}</Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-2 text-emerald-400"><MessageSquare className="size-4" /> <span className="text-xs text-zinc-500">Feedback</span></div>
          <p className="mt-1 text-lg font-bold text-zinc-100 md:text-xl">{business._count.feedback}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-2 text-blue-400"><Star className="size-4" /> <span className="text-xs text-zinc-500">Google Reviews</span></div>
          <p className="mt-1 text-lg font-bold text-zinc-100 md:text-xl">{business._count.googleReviews}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-2 text-violet-400"><Globe className="size-4" /> <span className="text-xs text-zinc-500">Replies</span></div>
          <p className="mt-1 text-lg font-bold text-zinc-100 md:text-xl">{business._count.generatedReplies}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-2 text-amber-400"><QrCode className="size-4" /> <span className="text-xs text-zinc-500">QR Codes</span></div>
          <p className="mt-1 text-lg font-bold text-zinc-100 md:text-xl">{business._count.qrCodes}</p>
        </div>
      </div>

      {business.feedback?.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 font-semibold text-zinc-100">Recent Feedback</h2>
          <div className="space-y-2 text-sm">
            {business.feedback.map((fb: any) => (
              <div key={fb.id} className="rounded-md bg-zinc-800/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-100">Rating: {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
                  <span className="text-xs text-zinc-600">{new Date(fb.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-zinc-400">{fb.liked ? `Liked: ${fb.liked}` : "No details"}</p>
                <p className="text-zinc-600 text-xs">{fb.status} {fb.customerName ? `| ${fb.customerName}` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
