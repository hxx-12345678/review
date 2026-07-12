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

  activity: (params?: { page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    const qs = sp.toString();
    return request<{ logs: any[]; total: number; page: number; totalPages: number }>(`/admin/activity${qs ? `?${qs}` : ""}`);
  },

  feedback: (params?: { page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    const qs = sp.toString();
    return request<{ feedback: any[]; total: number; page: number; totalPages: number }>(`/admin/feedback${qs ? `?${qs}` : ""}`);
  },
};
