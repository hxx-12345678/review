import { cn } from "@/lib/utils"

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/logo-mark.png"
        alt="BEYONDVYU logo"
        width={32}
        height={32}
        className="size-8 rounded-[9px] shadow-sm"
      />
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
