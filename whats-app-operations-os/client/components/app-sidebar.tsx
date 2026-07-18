"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Inbox,
  Users,
  KanbanSquare,
  BellRing,
  Sparkles,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { conversations, followUpTasks } from "@/lib/mock-data"

const openCount = conversations.filter(
  (c) => c.status === "open" || c.status === "follow_up",
).length
const overdueCount = followUpTasks.filter((t) => t.status === "overdue").length

const nav = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/inbox", label: "Shared Inbox", icon: Inbox, badge: openCount },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tasks", label: "Follow-ups", icon: BellRing, badge: overdueCount, badgeTone: "danger" as const },
  { href: "/copilot", label: "Ops Copilot", icon: Sparkles },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="size-4" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold tracking-tight">Relay</span>
        <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          OPS OS
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    item.badgeTone === "danger"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}

        <p className="px-2 pb-1 pt-5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Account
        </p>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
          )}
        >
          <Settings className="size-4 shrink-0" />
          <span className="flex-1">Settings</span>
        </Link>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 p-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
            PN
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">Priya Nair</p>
            <p className="truncate text-[10px] text-muted-foreground">Owner</p>
          </div>
          <span className="size-2 rounded-full bg-primary" aria-label="online" />
        </div>
      </div>
    </aside>
  )
}
