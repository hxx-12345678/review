"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Inbox, ListChecks, AtSign, Globe, Menu } from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/lib/sidebar-context"

const NAV = [
  { href: "/v2/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/v2/inbox", label: "Inbox", icon: Inbox },
  { href: "/v2/tasks", label: "Tasks", icon: ListChecks },
  { href: "/v2/instagram", label: "Instagram", icon: AtSign },
  { href: "/v2/gbp", label: "GBP", icon: Globe },
]

export function DashboardMobileNav() {
  const pathname = usePathname()
  const { setMobileOpen } = useSidebar()
  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b border-border bg-background px-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
        <Link href="/" aria-label="BEYONDVYU home">
          <Logo />
        </Link>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Dashboard"
      >
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
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
