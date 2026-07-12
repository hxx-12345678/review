import { cn } from "@/lib/utils"

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn(
        "flex size-8 items-center justify-center rounded-lg shadow-sm",
        dark
          ? "bg-white/20 text-white shadow-white/10"
          : "bg-gradient-to-br from-primary to-violet-500 text-white"
      )}>
        <svg viewBox="0 0 24 24" fill="none" className="size-4.5" aria-hidden="true">
          <path
            d="M4 12L9 4L15 12L20 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 16L9 8L15 16L20 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
        </svg>
      </div>
      <span className={cn(
        "flex items-baseline gap-0 font-heading text-lg font-bold tracking-tight",
        dark ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" : "text-foreground"
      )}>
        <span>BEYOND</span>
        <span className={cn(
          dark
            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
            : "bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent"
        )}>VYU</span>
      </span>
    </div>
  )
}
