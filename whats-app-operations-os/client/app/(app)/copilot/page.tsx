import { AppTopbar } from "@/components/app-topbar"
import { CopilotClient } from "@/components/copilot/copilot-client"

export default function CopilotPage() {
  return (
    <>
      <AppTopbar
        title="Ops Copilot"
        description="Natural-language answers from your live business data."
      />
      <CopilotClient />
    </>
  )
}
