import "dotenv/config";

import { INSTRUMENT_CONFIG } from "../src/lib/legislation/config";
import { syncInstrument } from "../src/lib/legislation/service";

const main = async () => {
  if (process.env.VERCEL) {
    console.error("[ingest:sepps] This script is for local use only; aborting on Vercel.");
    process.exit(1);
  }

  const seppConfigs = INSTRUMENT_CONFIG.filter((config) => config.instrumentType === "SEPP");
  console.log(`[ingest:sepps] Found ${seppConfigs.length} SEPP instruments.`);

  let ingested = 0;
  let created = 0;
  let updated = 0;
  const failures: string[] = [];

  for (const config of seppConfigs) {
    console.log(`\n[ingest:sepps] Ingesting ${config.slug}...`);
    try {
      const result = await syncInstrument(config.slug);

      if (result.status === "ok") {
        ingested += 1;
        created += result.added;
        updated += result.updated;
        console.log(
          `→ ${result.instrument.slug}: ${result.added} created, ${result.updated} updated (${result.parsedClauses} parsed)`,
        );
        continue;
      }

      if (result.status === "skipped") {
        console.log(`→ skipped ${result.instrument?.slug ?? result.config.slug}: ${result.reason}`);
        continue;
      }

      failures.push(`${result.config.slug}: ${result.error.message}`);
      console.error(`→ ${result.config.slug} failed: ${result.error.message}`);
    } catch (error) {
      failures.push(`${config.slug}: ${(error as Error).message}`);
      console.error(`→ ${config.slug} failed:`, error);
    }
  }

  console.log("\n[ingest:sepps] Summary:");
  console.log(`  SEPPs ingested: ${ingested}`);
  console.log(`  Clauses created: ${created}`);
  console.log(`  Clauses updated: ${updated}`);
  console.log(`  Failures: ${failures.length}`);
  failures.forEach((failure) => console.log(`   - ${failure}`));
};

main().catch((error) => {
  console.error("[ingest:sepps] Fatal error", error);
  process.exit(1);
});
