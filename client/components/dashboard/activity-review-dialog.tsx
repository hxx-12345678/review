"use client"

import { Globe, QrCode, Check, Clock, Sparkles, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StarRating } from "@/components/star-rating"
import { timeAgo } from "@/lib/format"

function getInitial(name: string) {
  return (name || "?").charAt(0).toUpperCase()
}

interface ActivityReview {
  id: string
  isGoogleReview: boolean
  rating: number
  createdAt: string
  displayName: string
  comment?: string
  reviewText?: string
  liked?: string
  purchaseInfo?: string
  improvement?: string
  privateNote?: string
  status?: string
  hasDraft?: boolean
  replyStatus?: string
  reviewReply?: string
}

export function ActivityReviewDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ActivityReview | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!item) return null

  const replyStatus = item.isGoogleReview
    ? (item.replyStatus || "NEEDS_REPLY")
    : (item.replyStatus || "NEEDS_REPLY")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-medium">Review details</DialogTitle>
          <DialogClose className="rounded-full p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] p-5 space-y-4">
          {/* Header: avatar, name, rating, time, badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Avatar className={`size-10 shrink-0 ${item.isGoogleReview ? "bg-blue-500/10 text-blue-600" : "bg-secondary text-secondary-foreground"}`}>
                <AvatarFallback className={item.isGoogleReview ? "bg-blue-500/10 text-blue-600" : "bg-secondary text-secondary-foreground"}>
                  {item.isGoogleReview ? <Globe className="size-4" /> : getInitial(item.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="truncate font-medium text-foreground">{item.displayName}</span>
                  {item.isGoogleReview && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs border-blue-200 dark:border-blue-800">
                      <Globe className="size-3" />
                      Google Review
                    </Badge>
                  )}
                  {!item.isGoogleReview && item.hasDraft && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                      <Sparkles className="size-3" />
                      Draft ready
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <StarRating value={item.rating} readOnly size={14} />
                  <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </div>
              </div>
            </div>
            <ReplyStatusBadge status={replyStatus} />
          </div>

          {/* Google review comment */}
          {item.isGoogleReview && item.comment && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-foreground">
              <p className="whitespace-pre-wrap leading-relaxed">{item.comment}</p>
            </div>
          )}

          {/* Local feedback details */}
          {!item.isGoogleReview && (
            <div className="space-y-3">
              {(item.liked || item.privateNote || item.purchaseInfo || item.improvement) && (
                <div className="rounded-lg border border-dashed border-border/80 bg-card p-3 space-y-1.5 text-xs sm:text-sm">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer Input Details</div>
                  {item.purchaseInfo && (
                    <p><span className="font-semibold text-muted-foreground">Visited for:</span> {item.purchaseInfo}</p>
                  )}
                  {item.liked && (
                    <p><span className="font-semibold text-muted-foreground">Topics & Highlights:</span> {item.liked}</p>
                  )}
                  {item.improvement && (
                    <p><span className="font-semibold text-muted-foreground">Improvement suggestion:</span> {item.improvement}</p>
                  )}
                  {item.privateNote && item.status === "PRIVATE_FEEDBACK" && (
                    <p className="border-t border-border/50 pt-1.5 mt-1.5"><span className="font-semibold text-muted-foreground">Private message:</span> {item.privateNote}</p>
                  )}
                </div>
              )}

              {item.reviewText && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs sm:text-sm text-foreground">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Copied Draft Suggestion</div>
                  <p className="whitespace-pre-wrap leading-relaxed">{item.reviewText}</p>
                </div>
              )}

              {item.reviewReply && (
                <div className="rounded-lg border border-blue-200/50 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 text-xs sm:text-sm text-foreground">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Your Reply</div>
                  <p className="whitespace-pre-wrap leading-relaxed">{item.reviewReply}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReplyStatusBadge({ status }: { status: string }) {
  if (status === "REPLIED") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        <Check className="size-3" />
        Replied
      </span>
    )
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
        Draft saved
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Clock className="size-3" />
      Needs reply
    </span>
  )
}
