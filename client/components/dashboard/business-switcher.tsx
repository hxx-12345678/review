"use client"

import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBusiness } from "@/lib/business-context"
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function BusinessSwitcher() {
  const { businesses, currentBusiness, switchBusiness, canAddBusiness, businessLimit } = useBusiness()
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground data-pressed:bg-accent data-pressed:text-accent-foreground">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">{currentBusiness?.name || "Select business"}</span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          {businesses.map((biz) => (
            <DropdownMenuItem key={biz.id} onSelect={() => switchBusiness(biz.id)}>
              <Building2 className="size-4 mr-2 text-muted-foreground" />
              <span className="flex-1 truncate">{biz.name}</span>
              {biz.id === currentBusiness?.id && (
                <Check className="size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => {
            if (canAddBusiness) {
              setAddDialogOpen(true)
            } else {
              router.push("/dashboard/billing")
            }
          }}>
            <Plus className="size-4 mr-2 text-muted-foreground" />
            {canAddBusiness ? "Add business" : `Upgrade (${businesses.length}/${businessLimit} used)`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <OnboardingDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  )
}
