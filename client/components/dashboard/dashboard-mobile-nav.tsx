"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Inbox, QrCode, Settings } from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/qr", label: "QR", icon: QrCode },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardMobileNav() {
  const pathname = usePathname()
  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Link href="/" aria-label="ReviewOS home">
          <Logo />
        </Link>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Dashboard"
      >
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
