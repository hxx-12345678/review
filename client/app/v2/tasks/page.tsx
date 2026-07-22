"use client"

import { ReviewTasks } from "@/components/v2/tasks/review-tasks"
import { Loader2, ListChecks } from "lucide-react"
import { useBusiness } from "@/lib/business-context"

export default function V2TasksPage() {
  const { currentBusiness, isLoading } = useBusiness()

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-6 animate-spin" /></div>
  if (!currentBusiness) return <div className="p-8 text-center text-muted-foreground">Create a business to get started.</div>

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ListChecks className="size-5" />
          Auto-Generated Follow-up Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks auto-created from negative reviews, pending replies, and overdue actions.
        </p>
      </div>
      <ReviewTasks businessId={currentBusiness.id} />
    </div>
  )
}
