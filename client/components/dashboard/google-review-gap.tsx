"use client";

import { useEffect, useState } from "react";
import { Star, TrendingUp, Clock, MessageSquareReply, PieChart, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function daysAgoLabel(days: number | null) {
  if (days == null) return "No reviews yet";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function GoogleReviewGap({ businessId, compact }: { businessId: string; compact?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    setError("");
    api.googlePlaces.reviewGap(businessId)
      .then(setData)
      .catch((e: any) => setError(e.message || "Failed to load review gap"))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <Card className="p-5"><div className="h-6 w-48 animate-pulse rounded bg-muted" /><div className="mt-4 grid gap-3 sm:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div></Card>;
  if (error) {
    if (error.includes("No Google Place ID")) return <Card className="p-5 text-sm text-muted-foreground">Connect your Google listing in onboarding or Settings to see your Review Gap.</Card>;
    return <Card className="p-5 text-sm text-red-600">{error}</Card>;
  }
  if (!data) return null;

  const gapColor = data.gap === "High" ? "bg-red-500" : data.gap === "Medium" ? "bg-amber-500" : data.gap === "Low" ? "bg-emerald-500" : "bg-slate-400";

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Gauge className="size-4 text-primary" /> Google Review Gap — {data.business.name}</h3>
          <p className="text-xs text-muted-foreground">Live Google data · fetched {new Date(data.fetchedAt).toLocaleString()} · no estimates</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${gapColor}`}>Gap: {data.gap}{data.gapDeficit ? ` · behind ${data.gapDeficit}` : ""}</span>
      </div>

      {/* You vs competitors */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Star className="size-3" /> Your rating</div>
          <div className="text-2xl font-black">{data.you.rating ?? "—"} <span className="text-sm font-normal text-muted-foreground">/ 5</span></div>
          <div className="text-xs text-muted-foreground">{data.you.totalRatings ?? 0} reviews · DB avg {data.rating?.dbAvg ?? "—"}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Recency</div>
          <div className="text-2xl font-black">{data.recency?.daysSinceLastReview ?? "—"}<span className="text-sm font-normal text-muted-foreground">{data.recency?.daysSinceLastReview != null ? " days" : ""}</span></div>
          <div className="text-xs text-muted-foreground">Last: {data.recency?.lastReviewAt ? daysAgoLabel(data.recency.daysSinceLastReview) : "never"} · 30d: {data.recency?.last30 ?? 0} · 90d: {data.recency?.last90 ?? 0}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><TrendingUp className="size-3" /> Velocity</div>
          <div className="text-2xl font-black">{data.velocityHistory?.avgPerWeek ?? 0}<span className="text-sm font-normal text-muted-foreground">/week</span></div>
          <div className="text-xs text-muted-foreground">Target: {data.velocity?.perWeek ?? 2}/week · {data.velocity?.perMonth ?? 8}/mo</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><MessageSquareReply className="size-3" /> Responses</div>
          <div className="text-2xl font-black">{data.responseBehavior?.replyRate ?? "—"}{data.responseBehavior?.replyRate != null ? <span className="text-sm font-normal text-muted-foreground">%</span> : null}</div>
          <div className="text-xs text-muted-foreground">{data.responseBehavior?.replied ?? 0}/{data.responseBehavior?.googleTotal ?? 0} replied · {data.responseBehavior?.needsReply ?? 0} need reply</div>
        </div>
      </div>

      {/* Sentiment */}
      {data.sentiment && (
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2"><PieChart className="size-3" /> Sentiment — {data.sentiment.sample} reviews (Google + feedback)</div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500" style={{ width: `${data.sentiment.positive}%` }} />
            <div className="bg-amber-400" style={{ width: `${data.sentiment.neutral}%` }} />
            <div className="bg-red-500" style={{ width: `${data.sentiment.negative}%` }} />
          </div>
          <div className="mt-1.5 flex gap-4 text-xs"><span className="text-emerald-600 font-medium">{data.sentiment.positive}% positive</span><span className="text-amber-600">{data.sentiment.neutral}% neutral</span><span className="text-red-600">{data.sentiment.negative}% negative</span></div>
        </div>
      )}

      {/* Competitors */}
      <div>
        <div className="text-xs font-semibold mb-2">Nearby competitors — live Places data</div>
        {data.competitors?.length === 0 ? (
          <p className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">No nearby competitors found for this query. Your gap is from recency/velocity, not competition.</p>
        ) : (
          <div className="space-y-1.5">
            {data.competitors.map((c: any) => (
              <div key={c.placeId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0"><div className="font-medium truncate">{c.name}</div><div className="text-xs text-muted-foreground truncate">{c.address}</div></div>
                <div className="text-right shrink-0"><span className="font-bold">{c.rating}</span> <span className="text-muted-foreground">/ {c.totalRatings?.toLocaleString()} reviews</span></div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Avg competitor: {data.competitorAverages?.avgRating} / {data.competitorAverages?.avgTotal?.toLocaleString()} reviews</p>
          </div>
        )}
      </div>

      {/* Velocity guidance */}
      {data.velocity && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <p className="font-semibold">Review opportunity: {data.gap}</p>
          <p className="mt-1">{data.velocity.message}</p>
          {!compact && <p className="mt-1 text-blue-700">Safe ceiling 2–5/week (Localo: 1–2/wk lasts 594 days, 100+/wk deleted in 6 days). Feb 2026 policy bans unusual volumes — steady beats spike.</p>}
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => window.location.href = "/dashboard/qr"}>Get QR code</Button>
          <Button size="sm" variant="outline" onClick={() => window.location.href = "/dashboard/settings"}>Sync Google reviews</Button>
        </div>
      )}
    </Card>
  );
}
