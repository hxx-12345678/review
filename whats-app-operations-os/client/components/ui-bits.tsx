import { cn } from "@/lib/utils"

export function StatusDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  )
}

export function Pill({
  color,
  label,
  className,
}: {
  color: string
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{ backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
    >
      <StatusDot color={color} />
      {label}
    </span>
  )
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  )
}

export function Avatar({
  initials,
  color,
  size = 28,
}: {
  initials: string
  color?: string
  size?: number
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: color
          ? `color-mix(in oklch, ${color} 22%, transparent)`
          : "var(--secondary)",
        color: color ?? "var(--foreground)",
      }}
    >
      {initials}
    </span>
  )
}
