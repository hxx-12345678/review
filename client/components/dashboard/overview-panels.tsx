import { QrCode, MessageSquareReply, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { StarRating } from "@/components/star-rating"
import { timeAgo } from "@/lib/format"

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  REDIRECTED_TO_GOOGLE: { label: "Posted to Google", className: "bg-primary/10 text-primary" },
  PRIVATE_FEEDBACK: { label: "Private feedback", className: "bg-accent text-accent-foreground" },
  ABANDONED: { label: "Did not finish", className: "bg-muted text-muted-foreground" },
}

export function RatingBreakdown({ reviews }: { reviews: { rating: number; count: number }[] }) {
  const counts = [5, 4, 3, 2, 1].map((star) => {
    const found = reviews.find((r) => r.rating === star)
    return { star, count: found?.count || 0 }
  })
  const total = counts.reduce((sum, c) => sum + c.count, 0) || 1

  return (
    <Card className="p-5">
      <h2 className="font-medium text-foreground">Rating breakdown</h2>
      <p className="text-sm text-muted-foreground">Across collected feedback</p>
      <div className="mt-4 space-y-2.5">
        {counts.map(({ star, count }) => (
          <div key={star} className="flex items-center gap-3">
            <span className="w-3 text-sm text-muted-foreground">{star}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-sm text-muted-foreground">{count}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function RecentActivity({ feedback }: { feedback: any[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-medium text-foreground">Recent customer activity</h2>
      <p className="text-sm text-muted-foreground">Latest feedback submissions</p>
      <ul className="mt-4 divide-y divide-border">
        {feedback.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No feedback yet. Share your QR code to start collecting reviews.
          </li>
        )}
        {feedback.map((f: any) => {
          const status = STATUS_LABEL[f.status] || STATUS_LABEL.ABANDONED
          return (
            <li key={f.id} className="flex items-start gap-3 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <QrCode className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StarRating value={f.rating} readOnly size={14} />
                  <span className="text-xs text-muted-foreground">{timeAgo(f.createdAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-foreground">
                  {f.liked || f.purchaseInfo || "No details provided"}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function ComplianceCard() {
  return (
    <Card className="border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="font-medium text-foreground">Your reviews stay compliant</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            ReviewOS never writes or pre-fills reviews, and never hides unhappy customers. That keeps your Google
            profile safe from filtering and FTC penalties.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Tag icon={MessageSquareReply} label="Reminders, not reviews" />
            <Tag icon={ShieldCheck} label="No gating" />
          </div>
        </div>
      </div>
    </Card>
  )
}

function Tag({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-muted-foreground">
      <Icon className="size-3.5 text-primary" />
      {label}
    </span>
  )
}
