const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const businesses = await p.business.findMany({
    select: { name: true, googleReviewUrl: true, slug: true },
  });
  console.log(JSON.stringify(businesses, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
