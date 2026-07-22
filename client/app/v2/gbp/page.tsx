"use client"

import { GbpManager } from "@/components/v2/shared/gbp-manager"
import { Loader2, Globe } from "lucide-react"
import { useBusiness } from "@/lib/business-context"

export default function V2GbpPage() {
  const { currentBusiness, isLoading } = useBusiness()

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-6 animate-spin" /></div>
  if (!currentBusiness) return <div className="p-8 text-center text-muted-foreground">Create a business to get started.</div>

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Globe className="size-5" />
          Google Business Profile Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sync, reply, and manage Google reviews. Bulk reply and analytics.
        </p>
      </div>
      <GbpManager businessId={currentBusiness.id} businessName={currentBusiness.name} />
    </div>
  )
}
