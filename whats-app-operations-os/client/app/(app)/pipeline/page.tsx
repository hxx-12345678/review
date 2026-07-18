import { AppTopbar } from "@/components/app-topbar"
import { PipelineBoard } from "@/components/pipeline/pipeline-board"

export default function PipelinePage() {
  return (
    <>
      <AppTopbar
        title="Lead Pipeline"
        description="Drag deals across stages. Every card is a live WhatsApp customer."
      />
      <PipelineBoard />
    </>
  )
}
