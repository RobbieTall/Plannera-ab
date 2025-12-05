import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.developmentControlPlanLink.upsert({
    where: { lgaCode: "BYRON" },
    update: {
      name: "Byron Shire Development Control Plan 2014",
      url: "https://www.byron.nsw.gov.au/Services/Building-Development/Development-Control-Plans/Byron-Shire-Development-Control-Plan-2014",
    },
    create: {
      lgaCode: "BYRON",
      name: "Byron Shire Development Control Plan 2014",
      url: "https://www.byron.nsw.gov.au/Services/Building-Development/Development-Control-Plans/Byron-Shire-Development-Control-Plan-2014",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded Development Control Plan links");
  })
  .catch(async (error) => {
    console.error("Failed to seed Development Control Plan links", error);
    await prisma.$disconnect();
    process.exit(1);
  });
