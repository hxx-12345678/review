import type { ReactNode } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav"
import { SidebarProvider } from "@/lib/sidebar-context"
import { TunnelOverlay } from "@/components/dashboard/tunnel-overlay"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen min-w-0 bg-background overflow-x-hidden">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardMobileNav />
          <main className="flex-1 min-w-0 pb-20 md:pb-0 pt-14 md:pt-0 relative">
            <TunnelOverlay />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
