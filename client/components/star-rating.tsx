"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
  className?: string
  readOnly?: boolean
}

export function StarRating({ value, onChange, size = 24, className, readOnly }: StarRatingProps) {
  const interactive = !readOnly && typeof onChange === "function"

  return (
    <div className={cn("flex items-center gap-1", className)} role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value
        const StarEl = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              filled ? "fill-accent text-accent" : "fill-transparent text-muted-foreground/40",
            )}
            strokeWidth={1.5}
          />
        )
        if (!interactive) {
          return <span key={star}>{StarEl}</span>
        }
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            className="rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {StarEl}
          </button>
        )
      })}
    </div>
  )
}

// Large, interactive star input with hover feedback for the public feedback flow.
export function StarRatingInput({ onRate }: { onRate: (value: number) => void }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Rate your visit">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= hover
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={false}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            onClick={() => onRate(star)}
            className="rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Star
              className={cn(
                "size-10 transition-colors",
                active ? "fill-accent text-accent" : "fill-transparent text-muted-foreground/40",
              )}
              strokeWidth={1.5}
            />
          </button>
        )
      })}
    </div>
  )
}
