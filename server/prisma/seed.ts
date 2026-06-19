import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  const feedbacks = await Promise.all([
    prisma.feedback.create({
      data: {
        businessId: business.id,
        rating: 5,
        purchaseInfo: "Dental cleaning and checkup",
        liked: "The staff was incredibly friendly and made me feel at ease throughout the procedure",
        improvement: "",
        customerName: "Sarah Johnson",
        status: "REDIRECTED_TO_GOOGLE",
      },
    }),
    prisma.feedback.create({
      data: {
        businessId: business.id,
        rating: 4,
        purchaseInfo: "Root canal treatment",
        liked: "The doctor explained everything clearly before starting",
        improvement: "Waiting time could be reduced",
        customerName: "Mike Chen",
        status: "PRIVATE_FEEDBACK",
      },
    }),
    prisma.feedback.create({
      data: {
        businessId: business.id,
        rating: 3,
        purchaseInfo: "Teeth whitening",
        liked: "Good results from the treatment",
        improvement: "The appointment scheduling process was confusing",
        customerName: "Emily Davis",
        status: "ABANDONED",
      },
    }),
    prisma.feedback.create({
      data: {
        businessId: business.id,
        rating: 5,
        purchaseInfo: "Annual dental exam",
        liked: "Very thorough examination and the hygienist was amazing",
        improvement: "",
        status: "REDIRECTED_TO_GOOGLE",
      },
    }),
  ]);

  await Promise.all(
    feedbacks.map((f) =>
      prisma.reviewDraft.create({
        data: {
          feedbackId: f.id,
          businessId: business.id,
          content: `I recently visited and had a wonderful experience. The staff was professional and caring. I highly recommend their services.`,
        },
      })
    )
  );

  await prisma.reviewClick.create({
    data: {
      feedbackId: feedbacks[0].id,
      businessId: business.id,
      type: "google_redirect",
    },
  });

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
