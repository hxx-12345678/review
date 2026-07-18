"use client"

import { Search, Bell, ChevronDown, CheckCircle2 } from "lucide-react"

export function AppTopbar({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
          <CheckCircle2 className="size-3.5 text-primary" />
          <span className="text-xs font-medium">+91 80 4718 2200</span>
          <span className="hidden rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:inline">
            Connected
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </div>

        <div className="relative ml-auto hidden max-w-xs flex-1 items-center lg:flex">
          <Search className="absolute left-2.5 size-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search conversations, customers…"
            className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        <button
          className="relative flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-1 md:px-6">
        <div>
          <h1 className="text-balance text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="text-pretty text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  )
}
