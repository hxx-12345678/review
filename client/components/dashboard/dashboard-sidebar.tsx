"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, QrCode, Settings, ShieldCheck, ExternalLink, LogOut, CreditCard, BarChart3, MessageSquare, Inbox, ListChecks, AtSign, Globe, X } from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useSidebar } from "@/lib/sidebar-context"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/insights", label: "AI Insights", icon: BarChart3 },
  { href: "/dashboard/qr", label: "QR & links", icon: QrCode },
  { href: "/dashboard/billing", label: "Plan", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

const V2_NAV = [
  { href: "/v2", label: "v2 Overview", icon: LayoutDashboard },
  { href: "/v2/whatsapp", label: "WhatsApp Flows", icon: MessageSquare },
  { href: "/v2/multi-platform", label: "Multi-Platform", icon: Inbox },
  { href: "/v2/inbox", label: "Unified Inbox", icon: Inbox },
  { href: "/v2/tasks", label: "Tasks", icon: ListChecks },
  { href: "/v2/instagram", label: "Instagram", icon: AtSign },
  { href: "/v2/gbp", label: "GBP Manager", icon: Globe },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { mobileOpen, setMobileOpen } = useSidebar()
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

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link href="/" aria-label="BEYONDVYU home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Dashboard">
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
        <div className="my-2 border-t border-border" />
        <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">v2 Features</p>
        {V2_NAV.map((item) => {
          const active = pathname.startsWith(item.href) && (item.href === "/v2" ? pathname === "/v2" : true)
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

      <div className="shrink-0 p-3">
        <Link
          href={businessSlug ? `/r/${businessSlug}?demo=true` : "/r/brightsmile?demo=true"}
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

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {(businessName || user?.name || "R").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{businessName || user?.name || "BEYONDVYU"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={logout} aria-label="Log out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Logo />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Dashboard">
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
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
          <div className="my-2 border-t border-border" />
          <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">v2 Features</p>
          {V2_NAV.map((item) => {
            const active = pathname.startsWith(item.href) && (item.href === "/v2" ? pathname === "/v2" : true)
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
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary">
                {(businessName || user?.name || "R").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{businessName || user?.name || "BEYONDVYU"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={logout} aria-label="Log out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar sticky top-0 h-screen overflow-y-auto md:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
