"use client"

import { WhatsAppFlows } from "@/components/v2/whatsapp/whatsapp-flows"
import { Loader2 } from "lucide-react"
import { useBusiness } from "@/lib/business-context"
import { PageHeader } from "@/components/dashboard/page-header"

export default function DashboardWhatsAppPage() {
  const { currentBusiness, isLoading } = useBusiness()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentBusiness) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select or create a business to manage WhatsApp automations.
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="WhatsApp Automation & Marketing"
        description={`Send Meta-approved festival wishes, offers, review requests, and reminders to ${currentBusiness.name}'s customers.`}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
        <WhatsAppFlows businessId={currentBusiness.id} businessName={currentBusiness.name} />
      </div>
    </>
  )
}
