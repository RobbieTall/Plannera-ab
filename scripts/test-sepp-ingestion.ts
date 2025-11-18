import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test", override: false });

const PRISMA_DEFAULT_SCHEMA = path.join(process.cwd(), "prisma", "schema.prisma");
const PRISMA_TEST_SCHEMA = path.join(process.cwd(), "prisma", "schema.test.prisma");

const resolveSqlitePath = (databaseUrl: string) => {
  if (!databaseUrl.startsWith("file:")) return null;
  const filePath = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
};

const DATABASE_URL =
  process.env.SEPP_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./dev-legislation-test.db";
const mutableEnv = process.env as NodeJS.ProcessEnv;
mutableEnv.DATABASE_URL = DATABASE_URL;

const resetSqliteDatabase = () => {
  const sqlitePath = resolveSqlitePath(DATABASE_URL);
  if (!sqlitePath) return;

  if (fs.existsSync(sqlitePath)) {
    fs.rmSync(sqlitePath);
  }
};

const generatePrismaClient = (schemaPath: string) => {
  execSync(`npx prisma generate --schema ${schemaPath}`, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });
};

const runPrismaPush = () => {
  generatePrismaClient(PRISMA_TEST_SCHEMA);
  execSync(`npx prisma db push --force-reset --skip-generate --schema ${PRISMA_TEST_SCHEMA}`, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });
};

const runSeppIngestion = async () => {
  const { INSTRUMENT_CONFIG } = await import("../src/lib/legislation/config");
  const { syncInstrument } = await import("../src/lib/legislation/service");

  const seppConfigs = INSTRUMENT_CONFIG.filter((config) => config.instrumentType === "SEPP");
  const results = {
    processed: 0,
    ingested: 0,
    skipped: 0,
    added: 0,
    updated: 0,
    failures: [] as string[],
  };

  for (const config of seppConfigs) {
    results.processed += 1;
    try {
      const result = await syncInstrument(config.slug);
      if (result.status === "ok") {
        results.ingested += 1;
        results.added += result.added;
        results.updated += result.updated;
        continue;
      }

      if (result.status === "skipped") {
        results.skipped += 1;
        continue;
      }

      results.failures.push(`${config.slug}: ${result.error.message}`);
    } catch (error) {
      results.failures.push(`${config.slug}: ${(error as Error).message}`);
    }
  }

  return results;
};

const runCoverageCheck = async () => {
  const { INSTRUMENT_CONFIG } = await import("../src/lib/legislation/config");
  const { prisma } = await import("../src/lib/prisma");

  const seppConfigs = INSTRUMENT_CONFIG.filter((instrument) => instrument.instrumentType === "SEPP");
  const instruments = await prisma.instrument.findMany({
    where: { instrumentType: "SEPP" },
    select: { slug: true, _count: { select: { clauses: true } } },
  });

  return {
    registry: seppConfigs.length,
    ingested: instruments.length,
    withClauses: instruments.filter((record) => record._count.clauses > 0).length,
  };
};

const runSeppRefresh = async () => {
  const { INSTRUMENT_CONFIG } = await import("../src/lib/legislation/config");
  const { syncInstrument } = await import("../src/lib/legislation/service");

  const seppConfigs = INSTRUMENT_CONFIG.filter((config) => config.instrumentType === "SEPP");
  const results = { processed: 0, errors: [] as string[] };

  for (const config of seppConfigs) {
    results.processed += 1;
    try {
      const result = await syncInstrument(config.slug);
      if (result.status === "error") {
        results.errors.push(`${config.slug}: ${result.error.message}`);
      }
    } catch (error) {
      results.errors.push(`${config.slug}: ${(error as Error).message}`);
    }
  }

  return results;
};

const runLepSmokeTest = async () => {
  const TARGET_LEP = "ballina-lep-2012";
  const { syncInstrument } = await import("../src/lib/legislation/service");
  const { prisma } = await import("../src/lib/prisma");

  try {
    await syncInstrument(TARGET_LEP);
  } catch (error) {
    return { clauseCount: 0, instrumentFound: false, error: (error as Error).message };
  }

  const instrument = await prisma.instrument.findUnique({
    where: { slug: TARGET_LEP },
    include: { _count: { select: { clauses: true } } },
  });

  return {
    clauseCount: instrument?._count.clauses ?? 0,
    instrumentFound: Boolean(instrument),
    error: null,
  };
};

const runSmokeTest = async () => {
  const { prisma } = await import("../src/lib/prisma");

  const TARGET_SEPP = "sepp-primary-production-2021";
  const TARGET_PHRASE = "primary production";

  const instrument = await prisma.instrument.findUnique({
    where: { slug: TARGET_SEPP },
    include: {
      clauses: { where: { bodyText: { contains: TARGET_PHRASE }, isCurrent: true }, take: 1 },
      _count: { select: { clauses: true } },
    },
  });

  const clauseCount = instrument?._count.clauses ?? 0;
  const hasMatch = (instrument?.clauses?.length ?? 0) > 0;

  return { clauseCount, hasMatch, instrumentFound: Boolean(instrument) };
};

const main = async () => {
  if (process.env.VERCEL) {
    console.error("[test:sepp-ingestion] This script is for local use only; aborting on Vercel.");
    process.exit(1);
  }

  resetSqliteDatabase();
  runPrismaPush();

  const ingestion = await runSeppIngestion();
  const coverage = await runCoverageCheck();
  const refresh = await runSeppRefresh();
  const smoke = await runSmokeTest();
  const lepSmoke = await runLepSmokeTest();

  console.log("\nSEPP ingestion test summary:");
  console.log(`- SEPP instruments in registry: ${coverage.registry}`);
  console.log(`- SEPP instruments ingested: ${coverage.ingested}`);
  console.log(`- SEPP instruments with clauses: ${coverage.withClauses}`);
  console.log(`- Ingestion added clauses: ${ingestion.added}, updated: ${ingestion.updated}`);
  console.log(`- Ingestion failures: ${ingestion.failures.length}`);
  if (ingestion.failures.length > 0) {
    ingestion.failures.forEach((failure) => console.log(`  • ${failure}`));
  }
  console.log(`- Refresh run: ${refresh.processed} processed, ${refresh.errors.length} errors`);
  if (refresh.errors.length > 0) {
    refresh.errors.forEach((failure) => console.log(`  • ${failure}`));
  }
  console.log(`- Smoke test: ${smoke.instrumentFound && smoke.hasMatch ? "PASS" : "FAIL"}`);
  console.log(`  • Instrument found: ${smoke.instrumentFound ? "yes" : "no"}`);
  console.log(`  • Clauses in DB: ${smoke.clauseCount}`);
  console.log(`  • Contains phrase \"primary production\": ${smoke.hasMatch ? "yes" : "no"}`);
  console.log(`- LEP smoke test (Ballina): ${lepSmoke.instrumentFound && lepSmoke.clauseCount > 0 ? "PASS" : "FAIL"}`);
  console.log(`  • Instrument found: ${lepSmoke.instrumentFound ? "yes" : "no"}`);
  console.log(`  • Clauses in DB: ${lepSmoke.clauseCount}`);
  if (lepSmoke.error) {
    console.log(`  • Error: ${lepSmoke.error}`);
  }

  const shouldFail =
    coverage.withClauses === 0 ||
    ingestion.failures.length > 0 ||
    refresh.errors.length > 0 ||
    !smoke.instrumentFound ||
    !smoke.hasMatch ||
    !lepSmoke.instrumentFound ||
    lepSmoke.clauseCount === 0;

  if (shouldFail) {
    console.log("\n[test:sepp-ingestion] One or more checks failed; exiting with status 1");
    process.exit(1);
  }
};

main()
  .catch((error) => {
    console.error("[test:sepp-ingestion] Fatal error", error);
    process.exit(1);
  })
  .finally(() => {
    try {
      generatePrismaClient(PRISMA_DEFAULT_SCHEMA);
    } catch (error) {
      console.warn("[test:sepp-ingestion] Failed to regenerate default Prisma client", error);
    }
  });
