"use client"

import { useEffect, useState } from "react"

export function TunnelOverlay() {
  const [depth, setDepth] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setDepth(Math.min(window.scrollY / 300, 1))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-20 h-32 transition-opacity duration-200 md:hidden"
      style={{ opacity: depth }}
    >
      <div
        className="h-full w-full"
        style={{
          background: `linear-gradient(to bottom,
            hsl(var(--background)) 0%,
            hsl(var(--background) / 0.85) ${10 + depth * 30}%,
            transparent ${35 + depth * 40}%)`,
        }}
      />
    </div>
  )
}
