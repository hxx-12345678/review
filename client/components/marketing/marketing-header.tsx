"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Menu, X, LayoutDashboard, LogOut, User } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { InstallPWA } from "@/components/install-pwa"

export function MarketingHeader() {
  const { user, loading, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 30)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
      <header
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-500",
          scrolled
            ? "bg-white shadow-sm border-b border-zinc-200 py-3"
            : "bg-black py-4"
        )}
      >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="BEYONDVYU home" className="relative z-10">
          <Logo dark={!scrolled} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {[
            { href: "/#how", label: "How it works" },
            { href: "/#compliance", label: "Compliance" },
            { href: "/pricing", label: "Pricing" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                scrolled
                  ? "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 relative z-10">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  scrolled
                    ? "text-zinc-700 hover:bg-zinc-100"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user.name || user.email}</span>
              </button>
              {userMenuOpen && (
                <div className={cn(
                  "absolute right-0 top-full mt-2 w-48 rounded-xl border p-1.5 shadow-lg backdrop-blur-xl",
                  scrolled ? "border-zinc-200 bg-white" : "border-zinc-700 bg-black/90"
                )}>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className={cn(
                  "hidden relative overflow-hidden rounded-lg px-5 py-2 text-sm font-medium sm:inline-flex",
                  "before:absolute before:inset-0 before:rounded-lg before:transition-transform before:duration-500 before:-translate-x-full hover:before:translate-x-0",
                  scrolled
                    ? "border border-zinc-300 text-zinc-700 before:bg-gradient-to-r before:from-zinc-200 before:to-zinc-100"
                    : "border border-zinc-700 text-zinc-300 before:bg-gradient-to-r before:from-white/15 before:to-white/5"
                )}
              >
                <span className="relative z-10">Log in</span>
              </Button>
              <InstallPWA variant="header" />
              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                size="sm"
                className="relative overflow-hidden rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-md hover:shadow-lg squishy before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-white/25 before:to-transparent before:transition-transform before:duration-500 before:-translate-x-full hover:before:translate-x-0"
              >
                <span className="relative z-10">Get started</span>
              </Button>
            </>
          )}
          <button
              className={cn(
                "flex size-9 items-center justify-center rounded-lg transition-colors md:hidden",
                scrolled
                  ? "text-foreground/80 hover:bg-white/5 hover:text-foreground"
                  : "text-white/95 hover:bg-white/10 hover:text-white"
              )}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="mx-4 mt-2 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-xl backdrop-blur-xl gradient-border md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {[
              { href: "/#how", label: "How it works" },
              { href: "/#compliance", label: "Compliance" },
              { href: "/pricing", label: "Pricing" },
              ...(user ? [] : [{ href: "/login", label: "Log in" as const }]),
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-400 transition-all duration-200 hover:bg-white/10 hover:text-red-300"
                >
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
