"use client"

import { useState, useEffect } from "react"
import { MultiPlatformSender } from "@/components/v2/shared/multi-platform-sender"
import { Loader2, Smartphone } from "lucide-react"
import { api } from "@/lib/api"

export default function V2MultiPlatformPage() {
  const [business, setBusiness] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth.me().then((res) => {
      if (res.businesses?.[0]) setBusiness(res.businesses[0])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-6 animate-spin" /></div>
  if (!business) return <div className="p-8 text-center text-muted-foreground">Create a business to get started.</div>

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Smartphone className="size-5" />
          Multi-Platform Review Automation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send review requests via SMS, WhatsApp, and Email — individually or in sequence.
        </p>
      </div>
      <MultiPlatformSender businessId={business.id} businessName={business.name} />
    </div>
  )
}
