const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("beyondvyu_admin_token") : null;
}

const ADMIN_BASE = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_PATH) || "d1ff499050";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("beyondvyu_admin_token")
      window.location.href = `/${ADMIN_BASE}/login`
    }
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ token: string; admin: { email: string; role: string } }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  stats: () =>
    request<{
      totalUsers: number;
      totalBusinesses: number;
      totalSubscriptions: number;
      activeSubscriptions: number;
      totalFeedback: number;
      totalInvoices: number;
      totalRevenue: number;
      totalAiCalls: number;
      plans: { id: string; name: string; slug: string; price: number; active: boolean; subscriberCount: number }[];
    }>("/admin/stats"),

  users: (params?: { page?: number; limit?: number; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    if (params?.search) sp.set("search", params.search);
    const qs = sp.toString();
    return request<{ users: any[]; total: number; page: number; totalPages: number }>(`/admin/users${qs ? `?${qs}` : ""}`);
  },

  user: (id: string) =>
    request<{ user: any }>(`/admin/users/${id}`),

  businesses: (params?: { page?: number; limit?: number; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    if (params?.search) sp.set("search", params.search);
    const qs = sp.toString();
    return request<{ businesses: any[]; total: number; page: number; totalPages: number }>(`/admin/businesses${qs ? `?${qs}` : ""}`);
  },

  business: (id: string) =>
    request<{ business: any }>(`/admin/businesses/${id}`),

  subscriptions: (params?: { page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    const qs = sp.toString();
    return request<{ subscriptions: any[]; total: number; page: number; totalPages: number }>(`/admin/subscriptions${qs ? `?${qs}` : ""}`);
  },

  plans: () =>
    request<{ plans: any[] }>("/admin/plans"),

  createPlan: (data: any) =>
    request<{ plan: any }>("/admin/plans", { method: "POST", body: JSON.stringify(data) }),

  updatePlan: (id: string, data: any) =>
    request<{ plan: any }>(`/admin/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  invoices: (params?: { page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    const qs = sp.toString();
    return request<{ invoices: any[]; total: number; page: number; totalPages: number }>(`/admin/invoices${qs ? `?${qs}` : ""}`);
  },

  activity: (params?: { page?: number; limit?: number; action?: string; search?: string; days?: number }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    if (params?.action) sp.set("action", params.action);
    if (params?.search) sp.set("search", params.search);
    if (params?.days) sp.set("days", params.days.toString());
    const qs = sp.toString();
    return request<{ logs: any[]; total: number; totalAll: number; page: number; totalPages: number; actionBreakdown: { action: string; _count: number }[] }>(`/admin/activity${qs ? `?${qs}` : ""}`);
  },

  analyticsOverview: () =>
    request<{
      nsm: { value: number; delta: number | null; trend: { month: string; value: number }[] };
      mrr: { value: number; trend: { month: string; value: number }[] };
      activationRate: number;
      stickiness: number;
      mau: number;
      avgDau: number;
      users: { total: number; trend: { day: string; value: number }[] };
      activeUsers: { trend: { day: string; value: number }[] };
      reviews: { trend: { day: string; value: number }[] };
      deltas: {
        signups: { current: number; previous: number; pct: number | null };
        active: { current: number; previous: number; pct: number | null };
        reviews: { current: number; previous: number; pct: number | null };
      };
    }>("/admin/analytics/overview"),

  analyticsFunnel: () =>
    request<{
      steps: { key: string; label: string; value: number; pctOfPrev: number | null }[];
      activationRate: number;
    }>("/admin/analytics/funnel"),

  analyticsEngagement: () =>
    request<{
      dau: { day: string; value: number }[];
      mau: number;
      wau: number;
      avgDau: number;
      stickiness: number;
      weeklyStickiness: number;
      weeklyStickinessTrend: { week: string; value: number }[];
      actionsPerUser: number;
      actionsTrend: { day: string; value: number }[];
      featureAdoption: { action: string; count: number; users: number; adoptionRate: number }[];
      powerUsers: { userId: string; email: string; name: string | null; count: number }[];
    }>("/admin/analytics/engagement"),

  analyticsCohorts: () =>
    request<{
      cohorts: { cohort: string; size: number; activated: number; retention: (number | null)[] }[];
      activatedRetention: (number | null)[];
      nonActivatedRetention: (number | null)[];
    }>("/admin/analytics/cohorts"),

  analyticsChurn: () =>
    request<{
      users: {
        id: string;
        email: string;
        name: string | null;
        showLitePlan: boolean;
        createdAt: string;
        score: number;
        tier: string;
        drivers: { key: string; label: string; points: number }[];
        lastSeen: string;
        daysSilent: number;
        planName: string;
        sessions30: number;
        coreActions30: number;
      }[];
      counts: { green: number; yellow: number; red: number; critical: number };
      total: number;
      atRisk: number;
    }>("/admin/analytics/churn"),

  suspendUser: (id: string, reason?: string) =>
    request<{ user: any }>(`/admin/users/${id}/suspend`, { method: "PUT", body: JSON.stringify({ reason }) }),

  unsuspendUser: (id: string) =>
    request<{ user: any }>(`/admin/users/${id}/unsuspend`, { method: "PUT" }),

  deleteUser: (id: string) =>
    request<{ user: any }>(`/admin/users/${id}`, { method: "DELETE" }),

  restoreUser: (id: string) =>
    request<{ user: any }>(`/admin/users/${id}/restore`, { method: "PUT" }),

  cancelSubscription: (userId: string, issueRefund?: boolean) =>
    request<{ subscription: any; refunded?: boolean }>(`/admin/users/${userId}/subscription/cancel`, {
      method: "PUT",
      body: JSON.stringify({ issueRefund: issueRefund || false }),
    }),

  updateUserSubscription: (userId: string, planId: string, immediate?: boolean) =>
    request<{ subscription: any; immediate: boolean }>(`/admin/users/${userId}/subscription/update`, {
      method: "PUT",
      body: JSON.stringify({ planId, immediate: immediate ?? true }),
    }),

  refundInvoice: (paymentId: string) =>
    request<{ success: boolean; amount: number }>(`/admin/invoices/${paymentId}/refund`, { method: "POST" }),

  toggleLitePlan: (userId: string, showLitePlan: boolean) =>
    request<{ user: any }>(`/admin/users/${userId}/lite-plan`, {
      method: "PUT",
      body: JSON.stringify({ showLitePlan }),
    }),
};
