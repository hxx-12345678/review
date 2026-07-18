const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("beyondvyu_token") : null;

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
    throw new ApiError(body.error || "Request failed", res.status, body.code);
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
      request<{ user: { id: string; email: string; name: string | null; createdAt: string; googleId?: string | null }; businesses: any[] }>("/auth/me"),
    logout: () =>
      request<{ message: string }>("/auth/logout", { method: "POST" }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    googleUrl: () =>
      request<{ url: string }>("/auth/google"),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
      googlePlaceId?: string;
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
    whatsappReport: (data: { businessId: string; frequency: "weekly" | "monthly" | "none"; test?: boolean }) =>
      request<{ success: boolean; message: string }>("/communications/whatsapp-report", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  activity: {
    list: (businessId: string) =>
      request<{ logs: any[] }>(`/activity/${businessId}`),
  },
  googlePlaces: {
    search: (query: string) =>
      request<{ results: { placeId: string; name: string; address: string; rating: number | null; totalRatings: number | null }[] }>(`/google-places/search?query=${encodeURIComponent(query)}`),
  },
  v2: {
    // WhatsApp Flows
    whatsappFlows: {
      sendFlow: (data: { businessId: string; phoneNumber: string; customerName?: string }) =>
        request<{ success: boolean; flow: any; messageId?: string }>("/v2/whatsapp-flows/send-flow", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      sendDirectFlow: (data: { businessId: string; phoneNumber: string; flowToken: string; customerName?: string }) =>
        request<{ success: boolean; flow: any; messageId?: string }>("/v2/whatsapp-flows/send-direct-flow", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      list: (businessId: string) =>
        request<{ flows: any[] }>(`/v2/whatsapp-flows/flows/${businessId}`),
      stats: (businessId: string) =>
        request<{ totalFlows: number; completedFlows: number; completionRate: number; averageRating: number | null }>(`/v2/whatsapp-flows/stats/${businessId}`),
    },
    // Multi-Platform Review Automation
    multiPlatform: {
      send: (data: { businessId: string; channels: string[]; phoneNumber?: string; email?: string; customerName?: string; customMessage?: string }) =>
        request<{ success: boolean; results: any; channelsSent: number }>("/v2/multi-platform/send", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      sendSequential: (data: { businessId: string; phoneNumber?: string; email?: string; customerName?: string; delayMinutes?: number }) =>
        request<{ success: boolean; schedule: any[]; message: string }>("/v2/multi-platform/send-sequential", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      logs: (businessId: string) =>
        request<{ logs: any[] }>(`/v2/multi-platform/logs/${businessId}`),
    },
    // Cross-Platform Unified Inbox
    inbox: {
      messages: (businessId: string, params?: { platform?: string; status?: string }) => {
        const qs = new URLSearchParams();
        if (params?.platform) qs.set("platform", params.platform);
        if (params?.status) qs.set("status", params.status);
        const query = qs.toString();
        return request<{ messages: any[] }>(`/v2/inbox/messages/${businessId}${query ? `?${query}` : ""}`);
      },
      conversations: (businessId: string) =>
        request<{ conversations: any[] }>(`/v2/inbox/conversations/${businessId}`),
      reply: (data: { messageId: string; replyText: string }) =>
        request<{ success: boolean; message: any }>("/v2/inbox/reply", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      markRead: (messageId: string) =>
        request<{ success: boolean }>(`/v2/inbox/messages/${messageId}/read`, { method: "PATCH" }),
      stats: (businessId: string) =>
        request<{ total: number; unread: number; byPlatform: { platform: string; count: number }[] }>(`/v2/inbox/stats/${businessId}`),
    },
    // Review Tasks
    tasks: {
      list: (businessId: string, params?: { status?: string; taskType?: string }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.taskType) qs.set("taskType", params.taskType);
        const query = qs.toString();
        return request<{ tasks: any[] }>(`/v2/tasks/tasks/${businessId}${query ? `?${query}` : ""}`);
      },
      create: (data: { businessId: string; title: string; description?: string; taskType?: string; priority?: string; source?: string; referenceId?: string; dueAt?: string; assignedTo?: string }) =>
        request<{ success: boolean; task: any }>("/v2/tasks/tasks", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (taskId: string, data: { title?: string; description?: string; priority?: string; status?: string; assignedTo?: string; dueAt?: string }) =>
        request<{ success: boolean; task: any }>(`/v2/tasks/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      delete: (taskId: string) =>
        request<{ success: boolean }>(`/v2/tasks/tasks/${taskId}`, { method: "DELETE" }),
      autoGenerate: (businessId: string) =>
        request<{ success: boolean; created: number; tasks: any[] }>(`/v2/tasks/auto-generate/${businessId}`, { method: "POST" }),
      stats: (businessId: string) =>
        request<{ total: number; pending: number; overdue: number; done: number; highPriority: number }>(`/v2/tasks/stats/${businessId}`),
    },
    // Instagram @Mentions
    instagram: {
      sync: (businessId: string) =>
        request<{ success: boolean; synced: number; mentions: any[] }>(`/v2/instagram/sync/${businessId}`, { method: "POST" }),
      mentions: (businessId: string, replied?: string) =>
        request<{ mentions: any[] }>(`/v2/instagram/mentions/${businessId}${replied ? `?replied=${replied}` : ""}`),
      reply: (data: { mentionId: string; replyText: string }) =>
        request<{ success: boolean; mention: any }>("/v2/instagram/reply", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      stats: (businessId: string) =>
        request<{ total: number; unreplied: number; positive: number; negative: number }>(`/v2/instagram/stats/${businessId}`),
    },
    // Google GBP
    gbp: {
      reviews: (businessId: string, params?: { status?: string; minRating?: number; sort?: string }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.minRating) qs.set("minRating", params.minRating.toString());
        if (params?.sort) qs.set("sort", params.sort);
        const query = qs.toString();
        return request<{ reviews: any[]; total: number }>(`/v2/gbp/reviews/${businessId}${query ? `?${query}` : ""}`);
      },
      reply: (data: { reviewId: string; replyText: string }) =>
        request<{ success: boolean; review: any; postedToGoogle: boolean }>("/v2/gbp/reviews/reply", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      bulkReply: (data: { reviewIds: string[]; replyText: string }) =>
        request<{ success: boolean; updatedCount: number }>("/v2/gbp/reviews/bulk-reply", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      deleteReview: (reviewId: string) =>
        request<{ success: boolean }>(`/v2/gbp/reviews/${reviewId}`, { method: "DELETE" }),
      sync: (businessId: string) =>
        request<{ success: boolean; synced: number }>(`/v2/gbp/sync/${businessId}`, { method: "POST" }),
      stats: (businessId: string) =>
        request<{ total: number; needsReply: number; replied: number; averageRating: number | null; ratingDistribution: { rating: number; count: number }[] }>(`/v2/gbp/stats/${businessId}`),
    },
  },
  payments: {
    plans: () =>
      request<{ plans: any[] }>("/payments/plans"),
    subscription: () =>
      request<{ subscription: any | null }>("/payments/subscription"),
    createSubscription: (planId: string) =>
      request<{ subscription: any; shortUrl: string | null; keyId?: string; razorpaySubscriptionId?: string }>("/payments/create-subscription", {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    cancel: () =>
      request<{ success: boolean }>("/payments/cancel", {
        method: "POST",
      }),
  },
};
