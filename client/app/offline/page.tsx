import Link from "next/link"
import { Logo } from "@/components/logo"
import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />

      <div className="flex flex-col items-center gap-2">
        <WifiOff className="size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Check your connection and try again. Previously viewed pages may still be available.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </Link>
    </div>
  )
}
