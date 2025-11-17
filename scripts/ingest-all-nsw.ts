import "dotenv/config";

import { syncAllInstruments } from "../src/lib/legislation/service";

const main = async () => {
  console.log("[ingest:all-nsw] Starting bulk ingestion...");
  const start = Date.now();

  const results = await syncAllInstruments();
  let ingested = 0;
  let created = 0;
  let updated = 0;
  const failures: string[] = [];

  for (const result of results) {
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
      console.log(
        `→ skipped ingestion for ${result.instrument?.slug ?? result.config.slug}: ${result.reason}`,
      );
      continue;
    }

    failures.push(`${result.config.slug}: ${result.error.message}`);
    console.log(`→ ${result.config.slug} failed: ${result.error.message}`);
  }

  console.log("\n[ingest:all-nsw] Summary:");
  console.log(`  Instruments ingested: ${ingested}`);
  console.log(`  Clauses created: ${created}`);
  console.log(`  Clauses updated: ${updated}`);
  console.log(`  Failures: ${failures.length}`);
  if (failures.length > 0) {
    failures.forEach((failure) => console.log(`   - ${failure}`));
  }

  console.log(`\nCompleted in ${((Date.now() - start) / 1000).toFixed(2)}s`);
};

main().catch((error) => {
  console.error("[ingest:all-nsw] Fatal error", error);
  process.exit(1);
});
