import type { ReactNode } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav"
import { SidebarProvider } from "@/lib/sidebar-context"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen min-w-0 bg-background pt-11 md:pt-0">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardMobileNav />
          <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
