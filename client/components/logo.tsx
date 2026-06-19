import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
          <path
            d="M12 2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15.8 6.6 18.5l1.2-6L3.3 8.3l6.1-.7L12 2z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight text-foreground">
        Review<span className="text-primary">OS</span>
      </span>
    </div>
  )
}
