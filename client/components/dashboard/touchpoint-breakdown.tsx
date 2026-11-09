"use client"

import { MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"

const LABELS: Record<string, string> = {
  table: "Table stand",
  bill: "Bill / checkout",
  packaging: "Packaging",
  reception: "Reception",
  takeaway: "Takeaway counter",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  link: "Shared link",
  other: "Other",
  unattributed: "Not attributed",
}

export interface TouchpointStat {
  touchpoint: string
  feedback: number
  clicks: number
  conversionRate: number
}

export function TouchpointBreakdown({ data }: { data: TouchpointStat[] }) {
  const rows = [...data].sort((a, b) => b.feedback - a.feedback).slice(0, 6)
  const max = Math.max(...rows.map((row) => row.feedback), 1)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium text-foreground">
            <MapPin className="size-4 text-primary" />
            Touchpoint performance
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Where guests scanned or opened your review flow (last 90 days).
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No touchpoint data yet. Choose a placement in{" "}
          <a href="/dashboard/qr" className="text-primary underline underline-offset-2">
            QR &amp; links
          </a>{" "}
          so you can see which spot converts best.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.touchpoint}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">
                  {LABELS[row.touchpoint] || row.touchpoint}
                </span>
                <span className="text-muted-foreground">
                  {row.feedback} feedback · {row.clicks} Google taps · {row.conversionRate}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.max(4, Math.round((row.feedback / max) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
