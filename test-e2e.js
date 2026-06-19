const API = "https://review-ewye.onrender.com/api";
const FRONTEND = "https://review-nine-inky.vercel.app";

let token, userId, businessId, feedbackId, replyId;

function log(label, ok, detail) {
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${label}${detail ? `  (${detail})` : ""}`);
}

async function check(label, fn) {
  try {
    const result = await fn();
    log(label, result.ok, result.detail);
    return result;
  } catch (err) {
    log(label, false, err.message);
    return { ok: false, detail: err.message };
  }
}

function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers }).then(async (r) => {
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(body?.error || `${r.status} ${r.statusText}`);
    return body;
  });
}

async function main() {
  console.log("\n=== REVIEWOS END-TO-END TEST ===\n");
  console.log(`Backend: ${API}`);
  console.log(`Frontend: ${FRONTEND}\n`);

  // 1. Health check
  await check("Health check", async () => {
    const data = await api("/health");
    return { ok: data.status === "ok", detail: data.timestamp };
  });

  // 2. Create a new unique account
  const email = `test${Date.now()}@example.com`;
  const password = "TestPass123!";

  await check("Signup new account", async () => {
    const data = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name: "Test User" }),
    });
    token = data.token;
    userId = data.user.id;
    return { ok: !!data.token && !!data.user.id, detail: `userId=${userId}` };
  });

  // 3. Login with the same credentials
  await check("Login", async () => {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    token = data.token;
    return { ok: !!data.token, detail: `token=${data.token.slice(0, 16)}...` };
  });

  // 4. Get current user (/auth/me)
  await check("GET /auth/me", async () => {
    const data = await api("/auth/me");
    return { ok: data.user.email === email, detail: data.user.email };
  });

  // 5. Create a business
  await check("Create business", async () => {
    const data = await api("/businesses", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Dental Studio",
        slug: `test-dental-${Date.now()}`,
        industry: "DENTAL",
        googleReviewUrl: "https://g.co/kgs/test",
        location: "123 Test Ave",
        phoneNumber: "+1-555-9999",
        website: "https://test.example.com",
        promptTopics: ["Friendly staff", "Clean facility"],
      }),
    });
    businessId = data.business.id;
    return { ok: !!businessId, detail: `businessId=${businessId}` };
  });

  // 6. List businesses
  await check("List businesses", async () => {
    const data = await api("/businesses");
    return { ok: data.businesses.length > 0, detail: `${data.businesses.length} business(es)` };
  });

  // 7. Get single business
  await check("GET /businesses/:id", async () => {
    const data = await api(`/businesses/${businessId}`);
    return { ok: data.business.id === businessId, detail: data.business.name };
  });

  // 8. Update business
  await check("PATCH /businesses/:id", async () => {
    const data = await api(`/businesses/${businessId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Test Dental Studio Updated" }),
    });
    return { ok: data.business.name === "Test Dental Studio Updated" };
  });

  // 9. Submit feedback (no auth required)
  await check("Submit feedback (public)", async () => {
    const data = await api("/feedback/submit", {
      method: "POST",
      body: JSON.stringify({
        businessSlug: (await api(`/businesses/${businessId}`)).business.slug,
        rating: 5,
        purchaseInfo: "Dental cleaning",
        liked: "Very friendly and professional staff",
        improvement: "",
        customerName: "John Doe",
        customerEmail: "john@example.com",
      }),
    });
    feedbackId = data.feedback.id;
    return { ok: !!feedbackId, detail: `feedbackId=${feedbackId}` };
  });

  // 10. Submit low-rating feedback
  await check("Submit low-rating feedback", async () => {
    const slug = (await api(`/businesses/${businessId}`)).business.slug;
    const data = await api("/feedback/submit", {
      method: "POST",
      body: JSON.stringify({
        businessSlug: slug,
        rating: 2,
        purchaseInfo: "Root canal",
        liked: "",
        improvement: "Waiting time was too long and the staff was rude",
        customerName: "Jane Smith",
      }),
    });
    return { ok: !!data.feedback.id };
  });

  // 11. Get public business info (no auth)
  await check("GET /feedback/public/:slug", async () => {
    const slug = (await api(`/businesses/${businessId}`)).business.slug;
    const data = await api(`/feedback/public/${slug}`);
    return { ok: !!data.business.id, detail: data.business.name };
  });

  // 12. List feedback for business (auth required)
  await check("List feedback", async () => {
    const data = await api(`/feedback/business/${businessId}?page=1&limit=10`);
    return {
      ok: data.feedback.length > 0,
      detail: `${data.feedback.length} feedback(s)`,
    };
  });

  // 13. Generate review draft (AI)
  await check("Generate review draft (AI)", async () => {
    const data = await api("/reviews/generate-draft", {
      method: "POST",
      body: JSON.stringify({ feedbackId, businessId }),
    });
    return { ok: !!data.draft, detail: `draft=${data.draft.content?.slice(0, 60)}...` };
  });

  // 14. Save review draft
  await check("Save review draft", async () => {
    const data = await api("/reviews/save-draft", {
      method: "POST",
      body: JSON.stringify({
        feedbackId,
        businessId,
        content: "I had a great experience at this dental clinic. The staff was friendly and professional.",
      }),
    });
    return { ok: !!data.draft, detail: `draftId=${data.draft.id}` };
  });

  // 15. Track review click (no auth)
  await check("Track review click", async () => {
    const data = await api("/reviews/track-click", {
      method: "POST",
      body: JSON.stringify({ feedbackId }),
    });
    return { ok: data.success === true };
  });

  // 16. Get review stats
  await check("GET /reviews/stats/:businessId", async () => {
    const data = await api(`/reviews/stats/${businessId}`);
    return { ok: !!data.stats, detail: `avgRating=${data.stats.avgRating}` };
  });

  // 17. Generate AI reply
  await check("Generate AI reply", async () => {
    const data = await api("/ai/generate-reply", {
      method: "POST",
      body: JSON.stringify({
        feedbackId,
        businessId,
        tone: "professional",
      }),
    });
    replyId = data.reply.id;
    return { ok: !!replyId, detail: `reply=${data.reply.content?.slice(0, 60)}...` };
  });

  // 18. Update AI reply
  await check("PATCH /ai/:replyId", async () => {
    const data = await api(`/ai/${replyId}`, {
      method: "PATCH",
      body: JSON.stringify({ content: "Thank you for your feedback! We appreciate your kind words." }),
    });
    return { ok: !!data.reply };
  });

  // 19. Generate QR code
  await check("Generate QR code", async () => {
    const data = await api(`/qr/generate/${businessId}`, { method: "POST" });
    return { ok: !!data.qrCode?.id, detail: `qrId=${data.qrCode?.id}` };
  });

  // 20. List QR codes
  await check("List QR codes", async () => {
    const data = await api(`/qr/${businessId}`);
    return { ok: data.qrCodes.length > 0, detail: `${data.qrCodes.length} QR code(s)` };
  });

  // 21. Get activity logs
  await check("GET /activity/:businessId", async () => {
    const data = await api(`/activity/${businessId}`);
    return { ok: Array.isArray(data.logs), detail: `${data.logs.length} log(s)` };
  });

  // 22. Send email (if SMTP configured)
  await check("Send email (may fail if no SMTP)", async () => {
    try {
      const data = await api("/communications/send-email", {
        method: "POST",
        body: JSON.stringify({
          businessId,
          toEmail: "test@example.com",
          customMessage: "Please leave us a review!",
        }),
      });
      return { ok: data.success === true, detail: data.message };
    } catch (e) {
      if (e.message.includes("SMTP") || e.message.includes("configured") || e.message.includes("ENOTFOUND")) {
        return { ok: true, detail: `SKIPPED (SMTP not configured): ${e.message}` };
      }
      throw e;
    }
  });

  // 23. Talking points (no auth)
  await check("Talking points (no auth)", async () => {
    const data = await api("/ai/talking-points", {
      method: "POST",
      body: JSON.stringify({
        highlights: "The doctor was very thorough and explained everything. The staff was friendly.",
        businessName: "Test Dental",
        rating: 5,
      }),
    });
    return {
      ok: Array.isArray(data.talkingPoints) && data.talkingPoints.length > 0,
      detail: `${data.talkingPoints.length} point(s)`,
    };
  });

  // 24. Logout
  await check("Logout", async () => {
    const data = await api("/auth/logout", { method: "POST" });
    return { ok: data.message === "Logged out successfully" };
  });

  // 25. Frontend health check
  await check("Frontend loads", async () => {
    const res = await fetch(FRONTEND, { signal: AbortSignal.timeout(10000) });
    return { ok: res.ok, detail: `${res.status} ${res.statusText}` };
  });

  // 26. Test duplicate email rejection
  await check("Duplicate email rejected", async () => {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "AnotherPass1!" }),
    });
    return { ok: res.status === 409, detail: `status=${res.status}` };
  });

  // 27. Test invalid login
  await check("Invalid login rejected", async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "WrongPassword1!" }),
    });
    return { ok: res.status === 401, detail: `status=${res.status}` };
  });

  // Summary
  console.log("\n=== TEST SUMMARY ===");
  console.log(`Account: ${email} / ${password}`);
  console.log(`Business ID: ${businessId}\n`);
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err.message);
  process.exit(1);
});
