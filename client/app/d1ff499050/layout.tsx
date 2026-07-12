"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard, Users, Building2, CreditCard, Receipt, Activity, LogOut, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { ADMIN_BASE } from "@/lib/admin-path"

const ADMIN_NAV = [
  { href: `/${ADMIN_BASE}`, label: "Overview", icon: LayoutDashboard },
  { href: `/${ADMIN_BASE}/users`, label: "Users", icon: Users },
  { href: `/${ADMIN_BASE}/businesses`, label: "Businesses", icon: Building2 },
  { href: `/${ADMIN_BASE}/subscriptions`, label: "Subscriptions", icon: CreditCard },
  { href: `/${ADMIN_BASE}/invoices`, label: "Payments", icon: Receipt },
  { href: `/${ADMIN_BASE}/activity`, label: "Activity", icon: Activity },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem("beyondvyu_admin_token")
    if (!token) {
      if (pathname !== `/${ADMIN_BASE}/login`) router.replace(`/${ADMIN_BASE}/login`)
      return
    }
    if (pathname !== `/${ADMIN_BASE}/login`) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) {
          localStorage.removeItem("beyondvyu_admin_token")
          router.replace(`/${ADMIN_BASE}/login`)
        }
      }).catch(() => {
        localStorage.removeItem("beyondvyu_admin_token")
        router.replace(`/${ADMIN_BASE}/login`)
      })
    }
  }, [pathname, router])

  if (!mounted) return null

  const token = localStorage.getItem("beyondvyu_admin_token")
  if (!token && pathname !== `/${ADMIN_BASE}/login`) return null

  if (pathname === `/${ADMIN_BASE}/login`) return <>{children}</>

  const handleLogout = () => {
    localStorage.removeItem("beyondvyu_admin_token")
    router.replace(`/${ADMIN_BASE}/login`)
  }

  const isActive = (href: string) =>
    pathname === href || (href !== `/${ADMIN_BASE}` && pathname.startsWith(href))

  return (
    <div className="flex min-h-screen bg-zinc-950 pb-16 md:pb-0">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <Shield className="size-5 text-amber-500" />
          <span className="font-semibold text-zinc-100">Admin Panel</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {ADMIN_NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-zinc-800 p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-amber-500" />
            <span className="font-semibold text-zinc-100">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950 md:hidden">
        <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0px)]">
          {ADMIN_NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors min-w-0 flex-1",
                  active
                    ? "text-amber-400"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                <item.icon className="size-5" />
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
