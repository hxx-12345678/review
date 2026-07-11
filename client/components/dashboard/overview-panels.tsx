import { useState } from "react"
import { QrCode, MessageSquareReply, ShieldCheck, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { StarRating } from "@/components/star-rating"
import { timeAgo } from "@/lib/format"
import { ActivityReviewDialog } from "./activity-review-dialog"

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  REDIRECTED_TO_GOOGLE: { label: "Posted to Google", className: "bg-primary/10 text-primary" },
  PRIVATE_FEEDBACK: { label: "Private feedback", className: "bg-accent text-accent-foreground" },
  ABANDONED: { label: "Did not finish", className: "bg-muted text-muted-foreground" },
}

const GOOGLE_SOURCE = { label: "Google Review", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" }

export function RatingBreakdown({ reviews }: { reviews: { rating: number; count: number }[] }) {
  const counts = [5, 4, 3, 2, 1].map((star) => {
    const found = reviews.find((r) => r.rating === star)
    return { star, count: found?.count || 0 }
  })
  const total = counts.reduce((sum, c) => sum + c.count, 0) || 1

  return (
    <Card className="p-4 sm:p-5">
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

export function RecentActivity({ feedback, googleReviews }: { feedback: any[]; googleReviews?: any[] }) {
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const allItems: any[] = [
    ...(googleReviews || []).map((g: any) => ({
      id: `google-${g.id}`,
      isGoogleReview: true,
      rating: g.starRating,
      createdAt: g.createTime,
      displayName: g.reviewerName || "Google User",
      comment: g.comment || "",
      reviewReply: g.reviewReply,
      replyStatus: g.replyStatus || "NEEDS_REPLY",
    })),
    ...feedback.map((f: any) => ({
      id: f.id,
      isGoogleReview: false,
      rating: f.rating,
      createdAt: f.createdAt,
      displayName: f.customerName || "Anonymous",
      reviewText: f.reviewDraft?.content || "",
      liked: f.liked,
      purchaseInfo: f.purchaseInfo,
      improvement: f.improvement,
      privateNote: f.privateNote,
      status: f.status,
      hasDraft: !!f.reviewDraft,
      reviewReply: f.generatedReply?.content,
      replyStatus: f.generatedReply?.status || "NEEDS_REPLY",
    })),
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15)

  return (
    <Card className="p-5">
      <h2 className="font-medium text-foreground">Recent customer activity</h2>
      <p className="text-sm text-muted-foreground">Latest feedback and Google reviews</p>
      <div className="mt-4 max-h-[400px] overflow-y-auto pr-1 [&::-w-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-track]:bg-transparent">
        <ul className="divide-y divide-border">
          {allItems.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              No activity yet. Share your QR code to start collecting reviews.
            </li>
          )}
          {allItems.map((item: any) => {
            if (item.isGoogleReview) {
              return (
                <li
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 py-3 transition-colors hover:bg-muted/50 -mx-3 px-3 rounded-lg"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Globe className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{item.displayName}</span>
                      <StarRating value={item.rating} readOnly size={14} />
                      <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground line-clamp-2">{item.comment || "No comment text"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${GOOGLE_SOURCE.className}`}>
                    {GOOGLE_SOURCE.label}
                  </span>
                </li>
              )
            }
            const status = STATUS_LABEL[item.status] || STATUS_LABEL.ABANDONED
            return (
              <li
                key={item.id}
                className="flex cursor-pointer items-start gap-3 py-3 transition-colors hover:bg-muted/50 -mx-3 px-3 rounded-lg"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <QrCode className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StarRating value={item.rating} readOnly size={14} />
                    <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                    {item.hasDraft && <span className="text-[10px] font-medium text-primary">Draft saved</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-foreground line-clamp-2">{item.reviewText || item.liked || item.purchaseInfo || item.privateNote || "No details provided"}</p>
                  {item.liked && !item.reviewText && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.liked}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <ActivityReviewDialog
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) setSelectedItem(null) }}
      />
    </Card>
  )
}

export function ComplianceCard() {
  return (
    <Card className="border-primary/30 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:size-9">
          <ShieldCheck className="size-4 sm:size-5" />
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
