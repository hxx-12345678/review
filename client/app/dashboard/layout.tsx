import type { ReactNode } from "react"
import type { Metadata } from "next"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav"
import { SidebarProvider } from "@/lib/sidebar-context"
import { TunnelOverlay } from "@/components/dashboard/tunnel-overlay"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <div className="min-h-screen bg-background overflow-x-hidden w-full md:w-[calc(100vw-16rem)] md:ml-64">
        <div className="flex min-h-screen min-w-0 flex-col">
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
