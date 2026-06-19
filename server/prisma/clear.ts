const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.reviewClick.deleteMany();
  await prisma.generatedReply.deleteMany();
  await prisma.reviewDraft.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();
  console.log("All data cleared");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
