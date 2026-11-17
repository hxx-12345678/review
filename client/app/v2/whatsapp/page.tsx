"use client"

import { WhatsAppFlows } from "@/components/v2/whatsapp/whatsapp-flows"
import { Loader2 } from "lucide-react"
import { useBusiness } from "@/lib/business-context"

export default function V2WhatsAppPage() {
  const { currentBusiness, isLoading } = useBusiness()

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-6 animate-spin" /></div>
  if (!currentBusiness) return <div className="p-8 text-center text-muted-foreground">Create a business to get started.</div>

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">WhatsApp automation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your own WhatsApp Business number and send Meta-approved templates for review requests,
          payment reminders, offers, and customer follow-ups. Your business pays Meta directly for
          delivered messages.
        </p>
      </div>
      <WhatsAppFlows businessId={currentBusiness.id} businessName={currentBusiness.name} />
    </div>
  )
}
