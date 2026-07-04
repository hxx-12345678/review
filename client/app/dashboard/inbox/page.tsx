"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header"
import { ReviewInbox } from "@/components/dashboard/review-inbox"
import { api } from "@/lib/api"

export default function InboxPage() {
  const [business, setBusiness] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [googleReviews, setGoogleReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const bizRes = await api.businesses.list();
        const biz = bizRes.businesses[0];
        setBusiness(biz);
        if (biz) {
          const [fbRes, googleRes] = await Promise.all([
            api.feedback.list(biz.id),
            api.googleReviews.list(biz.id).catch(() => ({ reviews: [] })),
          ]);
          setFeedback(fbRes.feedback);
          setGoogleReviews(googleRes.reviews || []);

          // Trigger automatic background reviews sync if connected
          api.googleReviews.sync(biz.id)
            .then(async (syncResult) => {
              if (syncResult.synced > 0) {
                const updatedReviews = await api.googleReviews.list(biz.id).catch(() => null);
                if (updatedReviews) {
                  setGoogleReviews(updatedReviews.reviews || []);
                }
              }
            })
            .catch(() => {
              // Silently ignore sync failures (e.g. if google account is not connected)
            });
        }
      } catch {
        // handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Review inbox"
        description="Reply to every review with help from AI — you stay in control of the words."
      />
      <ReviewInbox feedback={feedback} googleReviews={googleReviews} businessName={business?.name || ""} businessId={business?.id} />
    </>
  )
}
