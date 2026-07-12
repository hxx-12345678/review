"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard, Users, Building2, CreditCard, Receipt, Activity, MessageSquare, LogOut, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { ADMIN_BASE } from "@/lib/admin-path"

const ADMIN_NAV = [
  { href: `/${ADMIN_BASE}`, label: "Overview", icon: LayoutDashboard },
  { href: `/${ADMIN_BASE}/users`, label: "Users", icon: Users },
  { href: `/${ADMIN_BASE}/businesses`, label: "Businesses", icon: Building2 },
  { href: `/${ADMIN_BASE}/subscriptions`, label: "Subscriptions", icon: CreditCard },
  { href: `/${ADMIN_BASE}/invoices`, label: "Payments", icon: Receipt },
  { href: `/${ADMIN_BASE}/activity`, label: "Activity", icon: Activity },
  { href: `/${ADMIN_BASE}/feedback`, label: "Feedback", icon: MessageSquare },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem("reviewos_admin_token")
    if (!token) {
      if (pathname !== `/${ADMIN_BASE}/login`) router.replace(`/${ADMIN_BASE}/login`)
      return
    }
    // Verify token is still valid with the server
    if (pathname !== `/${ADMIN_BASE}/login`) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) {
          localStorage.removeItem("reviewos_admin_token")
          router.replace(`/${ADMIN_BASE}/login`)
        }
      }).catch(() => {
        localStorage.removeItem("reviewos_admin_token")
        router.replace(`/${ADMIN_BASE}/login`)
      })
    }
  }, [pathname, router])

  if (!mounted) return null

  const token = localStorage.getItem("reviewos_admin_token")
  if (!token && pathname !== `/${ADMIN_BASE}/login`) return null

  if (pathname === `/${ADMIN_BASE}/login`) return <>{children}</>

  const handleLogout = () => {
    localStorage.removeItem("reviewos_admin_token")
    router.replace(`/${ADMIN_BASE}/login`)
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <Shield className="size-5 text-amber-500" />
          <span className="font-semibold text-zinc-100">Admin Panel</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {ADMIN_NAV.map((item) => {
            const active = pathname === item.href || (item.href !== `/${ADMIN_BASE}` && pathname.startsWith(item.href))
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
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 backdrop-blur">
          <div className="flex items-center gap-2 md:hidden">
            <Shield className="size-5 text-amber-500" />
            <span className="font-semibold text-zinc-100">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "hidden text-sm text-zinc-400 transition-colors hover:text-zinc-200 md:block",
                  pathname === item.href && "text-amber-400",
                )}
              >
                {item.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="text-sm text-zinc-400 hover:text-zinc-200 md:hidden">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
