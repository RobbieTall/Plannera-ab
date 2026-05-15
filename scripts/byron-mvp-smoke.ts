import "dotenv/config";

import { InstrumentType, LepZonePermission, WorkspaceSourceType } from "@prisma/client";

import { searchDcpClauses } from "../src/lib/dcp/search";
import { prisma } from "../src/lib/prisma";

type CheckState = "green" | "amber" | "red";

type Check = {
  area: string;
  state: CheckState;
  detail: string;
};

const TARGET_ZONES = ["R2", "R3"];
const TARGET_DCP_QUERY = "dual occupancy setbacks parking Chapter D1 Chapter B4";

const checks: Check[] = [];

const record = (area: string, state: CheckState, detail: string) => {
  checks.push({ area, state, detail });
};

const formatCount = (value: number, label: string) => `${value.toLocaleString()} ${label}`;

const formatPermissionCounts = (counts: Record<LepZonePermission, number>) =>
  `without=${counts.WITHOUT_CONSENT}, with=${counts.WITH_CONSENT}, prohibited=${counts.PROHIBITED}`;

const main = async () => {
  if (!process.env.DATABASE_URL) {
    record("database", "red", "DATABASE_URL is not set; cannot verify the Byron MVP data loop.");
    return;
  }

  let byronLepInstrumentId: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    record("database", "green", "Connected to the configured PostgreSQL database.");
  } catch (error) {
    record("database", "red", `Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const byronLeps = await prisma.instrument.findMany({
    where: {
      instrumentType: InstrumentType.LEP,
      OR: [
        { slug: { contains: "byron" } },
        { name: { contains: "Byron" } },
        { shortName: { contains: "Byron" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { clauses: true, lepZoneLandUses: true, lepZoneObjectives: true } },
    },
    orderBy: { name: "asc" },
  });

  const primaryByronLep = byronLeps[0] ?? null;
  byronLepInstrumentId = primaryByronLep?.id ?? null;

  if (!primaryByronLep) {
    record("LEP", "red", "No Byron LEP instrument was found in the Instrument table.");
  } else if (primaryByronLep._count.clauses === 0) {
    record("LEP", "red", `${primaryByronLep.name} exists but has no clauses ingested.`);
  } else {
    record(
      "LEP",
      "green",
      `${primaryByronLep.name} (${primaryByronLep.slug}) has ${formatCount(primaryByronLep._count.clauses, "clauses")}.`,
    );
  }

  if (byronLepInstrumentId) {
    const [objectives, landUses] = await Promise.all([
      prisma.lepZoneObjective.findMany({
        where: { instrumentId: byronLepInstrumentId, zoneCode: { in: TARGET_ZONES } },
        select: { zoneCode: true },
      }),
      prisma.lepZoneLandUse.findMany({
        where: { instrumentId: byronLepInstrumentId, zoneCode: { in: TARGET_ZONES } },
        select: { zoneCode: true, permission: true },
      }),
    ]);

    for (const zone of TARGET_ZONES) {
      const objectiveCount = objectives.filter((entry) => entry.zoneCode === zone).length;
      const permissionCounts = landUses
        .filter((entry) => entry.zoneCode === zone)
        .reduce<Record<LepZonePermission, number>>(
          (acc, entry) => {
            acc[entry.permission] += 1;
            return acc;
          },
          {
            WITHOUT_CONSENT: 0,
            WITH_CONSENT: 0,
            PROHIBITED: 0,
          },
        );
      const landUseCount = Object.values(permissionCounts).reduce((sum, count) => sum + count, 0);

      if (!objectiveCount || !landUseCount) {
        record(
          `LEP zone ${zone}`,
          "red",
          `Missing Byron ${zone} zone objectives or land-use permissions (objectives=${objectiveCount}, ${formatPermissionCounts(permissionCounts)}).`,
        );
      } else {
        record(
          `LEP zone ${zone}`,
          "green",
          `Byron ${zone} has ${objectiveCount} objectives and ${formatPermissionCounts(permissionCounts)} land-use rows.`,
        );
      }
    }
  }

  const dcpClauseCount = await prisma.dCPClause.count({ where: { lgaCode: "BYRON" } });
  if (!dcpClauseCount) {
    record("DCP clauses", "red", "No Byron DCPClause rows were found.");
  } else {
    record("DCP clauses", "green", `Found ${formatCount(dcpClauseCount, "Byron DCP clauses")}.`);
  }

  const dcpResults = await searchDcpClauses({ query: TARGET_DCP_QUERY, lgaCode: "BYRON", limit: 5 });
  if (!dcpResults.length) {
    record("DCP search", "red", `No results for '${TARGET_DCP_QUERY}'.`);
  } else {
    const topResult = dcpResults[0];
    record(
      "DCP search",
      "green",
      `Top result: ${topResult.ref ?? "unreferenced"} ${topResult.title ?? topResult.headingPath.at(-1) ?? "Untitled"} (score=${topResult.score}).`,
    );
  }

  const [councilDocuments, councilChunks, uploadChunks] = await Promise.all([
    prisma.councilDocument.count({ where: { lgaCode: "BYRON" } }),
    prisma.workspaceSourceChunk.count({
      where: { lgaCode: "BYRON", sourceType: { in: [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp] } },
    }),
    prisma.workspaceSourceChunk.count({ where: { sourceType: WorkspaceSourceType.upload } }),
  ]);

  if (!councilDocuments && !councilChunks) {
    record(
      "workspace sources",
      "amber",
      "No Byron CouncilDocument or council DCP source chunks found; chat can still use DCPClause search but source-grounded prompt excerpts may be thin.",
    );
  } else {
    record(
      "workspace sources",
      "green",
      `Found ${formatCount(councilDocuments, "Byron council documents")} and ${formatCount(councilChunks, "Byron council DCP chunks")}.`,
    );
  }

  record("uploads", uploadChunks ? "green" : "amber", `${formatCount(uploadChunks, "workspace upload source chunks")} currently indexed.`);
};

main()
  .catch((error) => {
    record("smoke", "red", error instanceof Error ? error.message : String(error));
  })
  .finally(async () => {
    console.log("\n[byron:mvp:smoke] Byron MVP data readiness\n");
    for (const check of checks) {
      const icon = check.state === "green" ? "✅" : check.state === "amber" ? "⚠️" : "❌";
      console.log(`${icon} ${check.area}: ${check.detail}`);
    }

    const redCount = checks.filter((check) => check.state === "red").length;
    const amberCount = checks.filter((check) => check.state === "amber").length;
    console.log(`\nSummary: ${checks.length - redCount - amberCount} green, ${amberCount} amber, ${redCount} red.`);

    await prisma.$disconnect().catch(() => {});
    if (redCount) {
      process.exit(1);
    }
  });
