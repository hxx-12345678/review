import { AppTopbar } from "@/components/app-topbar"
import { InboxClient } from "@/components/inbox/inbox-client"

export default function InboxPage() {
  return (
    <>
      <AppTopbar
        title="Shared Team Inbox"
        description="One queue for the whole team — with ownership, notes, and collision detection."
      />
      <InboxClient />
    </>
  )
}
