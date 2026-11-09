"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { FeedbackInbox } from "@/components/dashboard/feedback-inbox"
import { useAuth } from "@/lib/auth-context"
import { useBusiness } from "@/lib/business-context"

export default function InboxPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentBusiness, isLoading: bizLoading } = useBusiness()
  const router = useRouter()

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace("/login")
    }
  }, [user, authLoading, router])

  if (!user) return null

  return (
    <div>
      <PageHeader
        title="Feedback inbox"
        description="Every guest report, searchable by rating and touchpoint. This is the raw evidence behind the owner report."
      />

      <div className="p-4 sm:p-8">
        {authLoading || bizLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : currentBusiness ? (
          <FeedbackInbox businessId={currentBusiness.id} />
        ) : (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">No business yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your restaurant in settings to start collecting guest feedback.
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open settings
            </Link>
          </Card>
        )}
      </div>
    </div>
  )
}
