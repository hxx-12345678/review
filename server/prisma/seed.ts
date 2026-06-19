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

  const existingUser = await prisma.user.findUnique({
    where: { email: "demo@reviewos.app" },
  });

  if (existingUser) {
    console.log("Seed data already exists, skipping...");
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: "demo@reviewos.app",
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

  // Spread feedback across the last 14 days so the trend chart has realistic data
  const feedbackEntries = [
    { rating: 5, purchaseInfo: "Dental cleaning and checkup", liked: "The staff was incredibly friendly and made me feel at ease throughout the procedure", improvement: "", customerName: "Sarah Johnson", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 13 },
    { rating: 4, purchaseInfo: "Root canal treatment", liked: "The doctor explained everything clearly before starting", improvement: "Waiting time could be reduced", customerName: "Mike Chen", status: "PRIVATE_FEEDBACK" as const, daysAgo: 11 },
    { rating: 3, purchaseInfo: "Teeth whitening", liked: "Good results from the treatment", improvement: "The appointment scheduling process was confusing", customerName: "Emily Davis", status: "ABANDONED" as const, daysAgo: 9 },
    { rating: 5, purchaseInfo: "Annual dental exam", liked: "Very thorough examination and the hygienist was amazing", improvement: "", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 7 },
    { rating: 5, purchaseInfo: " braces consultation", liked: "Dr. Patel explained all options clearly without pushing any particular treatment", improvement: "", customerName: "Anna Kim", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 6 },
    { rating: 2, purchaseInfo: "Filling replacement", liked: "", improvement: "The numbing wore off too quickly and I felt discomfort", customerName: "James Wilson", status: "PRIVATE_FEEDBACK" as const, daysAgo: 5 },
    { rating: 4, purchaseInfo: "Teeth cleaning", liked: "The hygienist was gentle and thorough", improvement: "Would like evening appointment slots", customerName: "Lisa Park", status: "PRIVATE_FEEDBACK" as const, daysAgo: 4 },
    { rating: 5, purchaseInfo: "Emergency tooth extraction", liked: "They got me in same day and took care of the pain immediately", improvement: "", customerName: "Tom Harris", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 3 },
    { rating: 4, purchaseInfo: "Regular checkup", liked: "Very clean office and friendly front desk", improvement: "", customerName: "Rachel Green", status: "ABANDONED" as const, daysAgo: 2 },
    { rating: 5, purchaseInfo: "Crown replacement", liked: "The crown matches my teeth perfectly, you can't even tell", improvement: "", customerName: "David Brown", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 1 },
    { rating: 1, purchaseInfo: "Consultation for implants", liked: "", improvement: "The quote was double what other places charge and the receptionist was rude", customerName: "Karen White", status: "PRIVATE_FEEDBACK" as const, daysAgo: 0 },
    { rating: 5, purchaseInfo: "Kids dental visit", liked: "My 4-year-old was scared but the staff made it fun for her", improvement: "", customerName: "Maria Garcia", status: "REDIRECTED_TO_GOOGLE" as const, daysAgo: 0 },
  ];

  const feedbacks = await Promise.all(
    feedbackEntries.map((entry) =>
      prisma.feedback.create({
        data: {
          businessId: business.id,
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

  // Create drafts for a subset of feedback
  const draftable = feedbacks.filter((_, i) => i < 6);
  await Promise.all(
    draftable.map((f) =>
      prisma.reviewDraft.create({
        data: {
          feedbackId: f.id,
          businessId: business.id,
          content: "I recently visited and had a wonderful experience. The staff was professional and caring. I highly recommend their services.",
        },
      })
    )
  );

  // Create clicks for feedback that was redirected to Google
  const clickable = feedbacks.filter((f) => f.status === "REDIRECTED_TO_GOOGLE");
  await Promise.all(
    clickable.map((f, i) =>
      prisma.reviewClick.create({
        data: {
          feedbackId: f.id,
          businessId: business.id,
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

  console.log("Seed data created successfully!");
  console.log(`Created ${feedbacks.length} feedback entries across 14 days`);
  console.log(`Created ${clickable.length} review clicks`);
  console.log("Demo login: demo@reviewos.app / password: demo123456");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
