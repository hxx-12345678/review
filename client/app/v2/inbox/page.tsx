"use client"

import { useState, useEffect } from "react"
import { UnifiedInbox } from "@/components/v2/inbox/unified-inbox"
import { Loader2, Inbox } from "lucide-react"
import { useBusiness } from "@/lib/business-context"
import { api } from "@/lib/api"

export default function V2InboxPage() {
  const { currentBusiness, isLoading } = useBusiness()
  const [stats, setStats] = useState<{ total: number; unread: number; byPlatform: any[] } | null>(null)

  useEffect(() => {
    if (!currentBusiness) return
    api.v2.inbox.stats(currentBusiness.id).then(setStats).catch(() => {})
  }, [currentBusiness])

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-6 animate-spin" /></div>
  if (!currentBusiness) return <div className="p-8 text-center text-muted-foreground">Create a business to get started.</div>

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Inbox className="size-5" />
              Cross-Platform Inbox
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Google Reviews · Instagram @mentions · WhatsApp · SMS · Email
            </p>
          </div>
          {stats && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{stats.total} total</span>
              {stats.unread > 0 && <span className="font-medium text-primary">{stats.unread} unread</span>}
            </div>
          )}
        </div>
      </div>
      <div className="h-[70vh]">
        <UnifiedInbox businessId={currentBusiness.id} />
      </div>
    </div>
  )
}
