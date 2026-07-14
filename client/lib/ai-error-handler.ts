import { toast } from "sonner"

export function handleAiError(err: any): boolean {
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
