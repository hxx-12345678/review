import { toast } from "sonner"

export function handleAiError(err: any): boolean {
  // Public review pages are used by the business's *customers*, not the owner.
  // "Upgrade your plan" would be nonsense there — keep it neutral and let them
  // continue writing their own review.
  if (err?.code === "OUT_OF_CREDITS") {
    toast.error("AI suggestions are temporarily unavailable", {
      description: "You can still write your review in your own words.",
      duration: 8000,
    })
    return true
  }
  if (err?.code === "LIMIT_REACHED" || err?.message?.includes("AI call limit")) {
    toast.error("AI credits exhausted", {
      description: "You've used all your AI credits. Upgrade your plan to continue.",
      action: { label: "Upgrade", onClick: () => window.location.href = "/dashboard/billing" },
      duration: 10000,
    })
    return true
  }
  return false
}
