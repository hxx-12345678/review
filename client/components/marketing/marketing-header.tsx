import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="ReviewOS home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          <Link href="/#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link
            href="/#compliance"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Compliance
          </Link>
          <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link
            href="/r/brightsmile"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Live demo
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="sm" className="hidden sm:inline-flex">
            Log in
          </Button>
          <Button render={<Link href="/signup" />} nativeButton={false} size="sm">
            Get started
          </Button>
        </div>
      </div>
    </header>
  )
}
