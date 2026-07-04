const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("reviewos_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(body.error || "Request failed", res.status);
  }

  return res.json();
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; name?: string }) =>
      request<{ token: string; user: { id: string; email: string; name: string | null } }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: { id: string; email: string; name: string | null } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () =>
      request<{ user: { id: string; email: string; name: string | null; createdAt: string }; businesses: any[] }>("/auth/me"),
    logout: () =>
      request<{ message: string }>("/auth/logout", { method: "POST" }),
  },
  businesses: {
    list: () =>
      request<{ businesses: any[] }>("/businesses"),
    get: (id: string) =>
      request<{ business: any }>(`/businesses/${id}`),
    create: (data: {
      name: string;
      industry: string;
      googleReviewUrl?: string;
      location?: string;
      phoneNumber?: string;
      website?: string;
      promptTopics?: string[];
    }) =>
      request<{ business: any }>("/businesses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<{ business: any }>(`/businesses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  feedback: {
    submit: (data: {
      businessSlug: string;
      rating: number;
      purchaseInfo?: string;
      liked?: string;
      improvement?: string;
      customerName?: string;
      customerEmail?: string;
      privateNote?: string;
      selectedSubOptions?: string[];
    }) =>
      request<{ feedback: any }>("/feedback/submit", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (businessId: string, params?: { page?: number; limit?: number; status?: string; search?: string; minRating?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.status) searchParams.set("status", params.status);
      if (params?.search) searchParams.set("search", params.search);
      if (params?.minRating) searchParams.set("minRating", params.minRating.toString());
      const qs = searchParams.toString();
      return request<{ feedback: any[]; pagination: any }>(`/feedback/business/${businessId}${qs ? `?${qs}` : ""}`);
    },
    public: (slug: string) =>
      request<{ business: { id: string; name: string; slug: string; googleReviewUrl: string | null; industry: string } }>(`/feedback/public/${slug}`),
  },
  reviews: {
    generateDraft: (data: { feedbackId: string; businessId: string }) =>
      request<{ draft: any }>("/reviews/generate-draft", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    saveDraft: (data: { feedbackId: string; businessId: string; content: string }) =>
      request<{ draft: any }>("/reviews/save-draft", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    /**
     * Public — no auth token sent. Called by the customer (not the owner) when
     * they tap "Write your review on Google". The server resolves the business
     * from the feedbackId, so we only send the feedbackId.
     * Also saves the actual review content if provided.
     */
    trackClick: (data: { feedbackId: string; content?: string }) =>
      fetch(`${API_URL}/reviews/track-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: data.feedbackId, content: data.content }),
      }).then((r) => r.json() as Promise<{ success: boolean }>),
    stats: (businessId: string) =>
      request<{ stats: any; recentFeedback: any[]; recentGoogleReviews: any[] }>(`/reviews/stats/${businessId}`),
    trend: (businessId: string) =>
      request<{ trend: { day: string; requests: number; reviews: number }[] }>(`/reviews/trend/${businessId}`),
  },
  googleReviews: {
    oauthUrl: (businessId: string) =>
      request<{ url: string }>(`/google-reviews/oauth/url?businessId=${businessId}`),
    disconnect: (businessId: string) =>
      request<{ success: boolean }>(`/google-reviews/disconnect/${businessId}`, {
        method: "POST",
      }),
    list: (businessId: string) =>
      request<{ reviews: any[] }>(`/google-reviews/reviews/${businessId}`),
    status: (businessId: string) =>
      request<{ connected: boolean; googleAccountId: string | null; reviewCount: number }>(`/google-reviews/status/${businessId}`),
    connect: (data: { businessId: string; googleAccountId: string; accessToken: string; refreshToken?: string; tokenExpiresAt?: string }) =>
      request<{ googleAccount: any }>("/google-reviews/connect", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sync: (businessId: string) =>
      request<{ synced: number; total: number }>(`/google-reviews/sync/${businessId}`, {
        method: "POST",
      }),
    syncPlaces: (businessId: string) =>
      request<{ synced: number; total: number }>(`/google-reviews/sync-places/${businessId}`, {
        method: "POST",
      }),
    reply: (reviewId: string, replyText: string) =>
      request<{ review: any }>(`/google-reviews/reviews/${reviewId}/reply`, {
        method: "POST",
        body: JSON.stringify({ replyText }),
      }),
  },
  qr: {
    list: (businessId: string) =>
      request<{ qrCodes: any[] }>(`/qr/${businessId}`),
    generate: (businessId: string) =>
      request<{ qrCode: any; pngDataUrl: string; svgString: string; reviewUrl: string }>(`/qr/generate/${businessId}`, {
        method: "POST",
      }),
  },
  ai: {
    generateReply: (data: { feedbackId: string; businessId: string; tone: string; content?: string }) =>
      request<{ reply: any }>("/ai/generate-reply", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateReply: (replyId: string, content: string) =>
      request<{ reply: any }>(`/ai/${replyId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }),
    getInsights: (businessId: string, period?: "week" | "month" | "all") =>
      request<{
        summary: string;
        metrics: { averageRating: number; totalReviews: number; positivePercent: number; neutralPercent: number; negativePercent: number; growthRate: number; previousPeriodAvg: number };
        topPraises: { phrase: string; count: number }[];
        topComplaints: { phrase: string; count: number }[];
        trend: { date: string; count: number; avgRating: number }[];
      }>(`/ai/insights/${businessId}${period ? `?period=${period}` : ""}`),
  },
  nextAi: {
    generateReply: (data: { reviewText: string; rating: number; businessName: string; tone?: string }) =>
      fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json() as Promise<{ reply: string; fallback?: boolean }>),
  },
  communications: {
    sendEmail: (data: { businessId: string; toEmail: string; customMessage?: string }) =>
      request<{ success: boolean; message: string }>("/communications/send-email", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sendSms: (data: { businessId: string; toPhone: string; customMessage?: string }) =>
      request<{ success: boolean; message: string }>("/communications/send-sms", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  activity: {
    list: (businessId: string) =>
      request<{ logs: any[] }>(`/activity/${businessId}`),
  },
};
