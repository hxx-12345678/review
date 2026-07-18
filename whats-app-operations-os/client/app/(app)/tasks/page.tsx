import { AppTopbar } from "@/components/app-topbar"
import { TasksClient } from "@/components/tasks/tasks-client"

export default function TasksPage() {
  return (
    <>
      <AppTopbar
        title="Follow-ups & Reminders"
        description="The promises and to-dos that fall through the cracks — now tracked automatically."
      />
      <TasksClient />
    </>
  )
}
