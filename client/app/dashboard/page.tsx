"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCards } from "@/components/dashboard/stat-cards";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RatingBreakdown, RecentActivity, ComplianceCard } from "@/components/dashboard/overview-panels";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [trend, setTrend] = useState<{ day: string; requests: number; reviews: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const bizRes = await api.businesses.list();
        const biz = bizRes.businesses[0];
        setBusiness(biz);

        if (biz) {
          const [statsRes, feedbackRes, trendRes] = await Promise.all([
            api.reviews.stats(biz.id),
            api.feedback.list(biz.id, { limit: 10 }),
            api.reviews.trend(biz.id),
          ]);
          setStats(statsRes.stats);
          setFeedback(feedbackRes.feedback);
          setTrend(trendRes.trend);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="mt-6 h-[260px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const avgRating = stats?.ratingDistribution?.reduce((acc: number, r: any) => acc + r.rating * r.count, 0) /
    (stats?.ratingDistribution?.reduce((acc: number, r: any) => acc + r.count, 0) || 1) || 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Welcome back — here's how ${business?.name || "your business"} is doing.`}
      >
        <Button render={<Link href="/dashboard/qr" />} nativeButton={false}>
          <QrCode className="size-4" />
          Get QR code
        </Button>
      </PageHeader>

      <div className="space-y-6 p-4 sm:p-8">
        <StatCards
          rating={avgRating}
          reviewCount={stats?.totalFeedback || 0}
          totalDrafts={stats?.totalDrafts || 0}
          totalClicks={stats?.totalClicks || 0}
          conversionRate={stats?.conversionRate || 0}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart data={trend} />
          </div>
          <RatingBreakdown
            reviews={(stats?.ratingDistribution || []).map((r: any) => ({ rating: r.rating, count: r.count }))}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity feedback={feedback} />
          </div>
          <ComplianceCard />
        </div>
      </div>
    </>
  );
}
