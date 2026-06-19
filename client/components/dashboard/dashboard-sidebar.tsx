"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Inbox, QrCode, Settings, ShieldCheck, ExternalLink, LogOut } from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inbox", label: "Review inbox", icon: Inbox },
  { href: "/dashboard/qr", label: "QR & links", icon: QrCode },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [businessName, setBusinessName] = useState("")
  const [businessSlug, setBusinessSlug] = useState("")

  useEffect(() => {
    api.businesses.list().then((res) => {
      if (res.businesses[0]) {
        setBusinessName(res.businesses[0].name)
        setBusinessSlug(res.businesses[0].slug)
      }
    }).catch(() => {})
  }, [])

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/" aria-label="ReviewOS home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Dashboard">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary/10 text-sidebar-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3">
        <Link
          href={businessSlug ? `/r/${businessSlug}` : "/r/brightsmile"}
          target="_blank"
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          View customer flow
        </Link>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
          <ShieldCheck className="size-4 shrink-0" />
          <span>Compliant mode active</span>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {(businessName || user?.name || "R").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{businessName || user?.name || "ReviewOS"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={logout} aria-label="Log out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
