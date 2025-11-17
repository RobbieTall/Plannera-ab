import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const TARGET_SEPP = "sepp-primary-production-2021";
const TARGET_PHRASE = "primary production";

const main = async () => {
  const instrument = await prisma.instrument.findUnique({
    where: { slug: TARGET_SEPP },
    include: {
      clauses: {
        where: { bodyText: { contains: TARGET_PHRASE, mode: "insensitive" }, isCurrent: true },
        take: 1,
      },
      _count: { select: { clauses: true } },
    },
  });

  if (!instrument) {
    console.log(`[sepp:smoke] Instrument ${TARGET_SEPP} not found. Has ingestion run?`);
    return;
  }

  const clauseCount = instrument._count.clauses;
  const hasMatchingClause = instrument.clauses.length > 0;

  console.log(`[sepp:smoke] ${instrument.name}`);
  console.log(`  - Clauses in DB: ${clauseCount}`);
  console.log(`  - Contains phrase \"${TARGET_PHRASE}\": ${hasMatchingClause ? "yes" : "no"}`);

  if (!hasMatchingClause) {
    console.log("  - No matching clause found; run ingestion and try again.");
  } else {
    const clause = instrument.clauses[0];
    console.log(`  - Example clause: ${clause.clauseKey} – ${clause.title ?? "(no title)"}`);
  }
};

main()
  .catch((error) => {
    console.error("[sepp:smoke] Failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
