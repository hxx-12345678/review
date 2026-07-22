"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OnboardingWizard } from "./onboarding-wizard"
import { useBusiness } from "@/lib/business-context"

export function OnboardingDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { refreshBusinesses } = useBusiness()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a business</DialogTitle>
        </DialogHeader>
        <OnboardingWizard
          embedded
          onComplete={() => {
            onOpenChange(false)
            refreshBusinesses()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
