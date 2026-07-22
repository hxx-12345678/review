import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // Always upsert subscription plans — independent of demo data
  const plans = [
    { name: "Free", slug: "free", price: 0, sortOrder: 0, aiCallsLimit: 10, businessLimit: 1, features: ["1 business", "10 AI review replies/mo", "Review collection (email + QR code)", "Review inbox (Google)", "Basic analytics"], description: "For businesses just getting started." },
    { name: "Starter", slug: "starter", price: 24900, sortOrder: 1, aiCallsLimit: 50, businessLimit: 1, features: ["1 business", "50 AI review replies/mo", "Review collection (email + QR code)", "Review inbox (Google + Facebook)", "Basic analytics", "Unlimited QR codes"], description: "For single-location businesses." },
    { name: "Growth", slug: "growth", price: 49900, sortOrder: 2, aiCallsLimit: 500, businessLimit: 3, features: ["Up to 3 businesses", "500 AI review replies/mo", "Everything in Starter", "SMS review collection", "AI review insights & sentiment", "Review widgets for website", "Priority support"], description: "For growing businesses." },
    { name: "Pro", slug: "pro", price: 69900, sortOrder: 3, aiCallsLimit: 2000, businessLimit: 10, features: ["Up to 10 businesses", "2,000 AI review replies/mo", "Everything in Growth", "WhatsApp review collection", "Team roles (3 users)", "Custom branding", "Google Business Profile sync", "Dedicated support"], description: "For multi-location businesses." },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      create: p,
      update: p,
    });
  }

  // Skip demo data if already seeded
  const existingUser = await prisma.user.findUnique({
    where: { email: "demo@beyondvyu.com" },
  });
  if (existingUser) {
    console.log("Plans upserted. Demo data already exists, skipping demo creation.");
    return;
  }

  // Auto-activate free plan for existing demo user
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });

  const user = await prisma.user.create({
    data: {
      email: "demo@beyondvyu.com",
      passwordHash: "$2a$12$8nrvklsCUXOam.PmQTy1rO4xikKqz8hABNEgXkjKF2q1sVi1iZu4G",
      name: "Demo User",
    },
  });

  const business = await prisma.business.create({
    data: {
      userId: user.id,
      name: "Brightsmile Dental Studio",
      slug: "brightsmile-dental-studio",
      industry: "DENTAL",
      googleReviewUrl: "https://g.co/kgs/demo123",
      location: "123 Healthcare Ave, Suite 100",
      phoneNumber: "+1-555-0123",
      website: "https://brightsmile.example.com",
      promptTopics: ["Friendly staff", "Clean facility", "Wait time", "Pain management"],
    },
  });

  // Second business for multi-business demo testing
  const business2 = await prisma.business.create({
    data: {
      userId: user.id,
      name: "Brightsmile Dental Studio - Northside",
      slug: "brightsmile-northside",
      industry: "DENTAL",
      googleReviewUrl: "https://g.co/kgs/demo456",
      location: "456 Health Park Blvd, Suite 50",
      phoneNumber: "+1-555-0456",
      website: "https://brightsmile.example.com",
      promptTopics: ["Friendly staff", "Clean facility", "Wait time", "Pain management"],
    },
  });

  const allBusinesses = [business, business2];

  // Spread feedback across the last 14 days so the trend chart has realistic data
  const feedbackEntries = [
    { rating: 5, purchaseInfo: "Dental cleaning and checkup", liked: "The staff was incredibly friendly and made me feel at ease throughout the procedure", improvement: "", customerName: "Sarah Johnson", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 13, bizIdx: 0 },
    { rating: 4, purchaseInfo: "Root canal treatment", liked: "The doctor explained everything clearly before starting", improvement: "Waiting time could be reduced", customerName: "Mike Chen", status: "PRIVATE_FEEDBACK" as const, daysAgo: 11, bizIdx: 0 },
    { rating: 3, purchaseInfo: "Teeth whitening", liked: "Good results from the treatment", improvement: "The appointment scheduling process was confusing", customerName: "Emily Davis", status: "ABANDONED" as const, daysAgo: 9, bizIdx: 0 },
    { rating: 5, purchaseInfo: "Annual dental exam", liked: "Very thorough examination and the hygienist was amazing", improvement: "", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 7, bizIdx: 0 },
    { rating: 5, purchaseInfo: " braces consultation", liked: "Dr. Patel explained all options clearly without pushing any particular treatment", improvement: "", customerName: "Anna Kim", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 6, bizIdx: 0 },
    { rating: 2, purchaseInfo: "Filling replacement", liked: "", improvement: "The numbing wore off too quickly and I felt discomfort", customerName: "James Wilson", status: "PRIVATE_FEEDBACK" as const, daysAgo: 5, bizIdx: 0 },
    { rating: 4, purchaseInfo: "Teeth cleaning", liked: "The hygienist was gentle and thorough", improvement: "Would like evening appointment slots", customerName: "Lisa Park", status: "PRIVATE_FEEDBACK" as const, daysAgo: 4, bizIdx: 0 },
    { rating: 5, purchaseInfo: "Emergency tooth extraction", liked: "They got me in same day and took care of the pain immediately", improvement: "", customerName: "Tom Harris", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 3, bizIdx: 0 },
    { rating: 4, purchaseInfo: "Regular checkup", liked: "Very clean office and friendly front desk", improvement: "", customerName: "Rachel Green", status: "ABANDONED" as const, daysAgo: 2, bizIdx: 1 },
    { rating: 5, purchaseInfo: "Crown replacement", liked: "The crown matches my teeth perfectly, you can't even tell", improvement: "", customerName: "David Brown", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 1, bizIdx: 1 },
    { rating: 1, purchaseInfo: "Consultation for implants", liked: "", improvement: "The quote was double what other places charge and the receptionist was rude", customerName: "Karen White", status: "PRIVATE_FEEDBACK" as const, daysAgo: 0, bizIdx: 1 },
    { rating: 5, purchaseInfo: "Kids dental visit", liked: "My 4-year-old was scared but the staff made it fun for her", improvement: "", customerName: "Maria Garcia", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 0, bizIdx: 1 },
  ];

  const feedbacks = await Promise.all(
    feedbackEntries.map((entry) =>
      prisma.feedback.create({
        data: {
          businessId: allBusinesses[entry.bizIdx].id,
          rating: entry.rating,
          purchaseInfo: entry.purchaseInfo,
          liked: entry.liked,
          improvement: entry.improvement,
          customerName: entry.customerName,
          status: entry.status,
          createdAt: daysAgo(entry.daysAgo),
        },
      })
    )
  );

  const feedbackWithBiz = feedbackEntries.map((entry, i) => ({
    ...entry,
    feedbackId: feedbacks[i].id,
    resolvedBusinessId: allBusinesses[entry.bizIdx].id,
  }));

  const draftable = feedbackWithBiz.filter((_, i) => i < 6);
  await Promise.all(
    draftable.map((f) =>
      prisma.reviewDraft.create({
        data: {
          feedbackId: f.feedbackId,
          businessId: f.resolvedBusinessId,
          content: "I recently visited and had a wonderful experience. The staff was professional and caring. I highly recommend their services.",
        },
      })
    )
  );

  const clickable = feedbackWithBiz.filter((f) => f.status === "REDIRECTED_TO_GOOGLE");
  await Promise.all(
    clickable.map((f, i) =>
      prisma.reviewClick.create({
        data: {
          feedbackId: f.feedbackId,
          businessId: f.resolvedBusinessId,
          type: "google_redirect",
          createdAt: daysAgo(Math.max(0, 13 - i * 3)),
        },
      })
    )
  );

  await prisma.generatedReply.create({
    data: {
      feedbackId: feedbacks[1].id,
      businessId: business.id,
      content: "Thank you for your feedback. We appreciate your kind words about our team and will work on improving wait times.",
      tone: "professional",
      status: "DRAFT",
    },
  });

  // Activate free subscription for demo user
  if (freePlan) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: "active",
        aiCallsLimit: freePlan.aiCallsLimit,
        businessLimit: freePlan.businessLimit,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });
  }

  console.log("Seed data created successfully!");
  console.log(`Created ${feedbacks.length} feedback entries across 14 days`);
  console.log(`Created ${clickable.length} review clicks`);
  console.log("Demo login: demo@beyondvyu.com / password: demo123456");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

