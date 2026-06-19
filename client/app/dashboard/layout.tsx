import type { ReactNode } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileNav />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  )
}
