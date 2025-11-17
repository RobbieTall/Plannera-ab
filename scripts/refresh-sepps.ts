import "dotenv/config";

import { INSTRUMENT_CONFIG } from "../src/lib/legislation/config";
import { syncInstrument } from "../src/lib/legislation/service";

const main = async () => {
  if (process.env.VERCEL) {
    console.error("[refresh:sepps] This script is for local validation only; aborting on Vercel.");
    process.exit(1);
  }

  const seppConfigs = INSTRUMENT_CONFIG.filter((config) => config.instrumentType === "SEPP");
  console.log(`[refresh:sepps] Starting SEPP sync for ${seppConfigs.length} instruments...`);
  const start = Date.now();

  for (const config of seppConfigs) {
    try {
      const result = await syncInstrument(config.slug);
      const label = result.config.name ?? result.config.slug;

      if (result.status === "ok") {
        console.log(`\n${label}:`);
        console.log(`  - Added: ${result.added}, Updated: ${result.updated}, Parsed: ${result.parsedClauses}`);
        continue;
      }

      if (result.status === "skipped") {
        console.log(`\n${label}:`);
        console.log(`  - Skipped: ${result.reason}`);
        continue;
      }

      console.log(`\n${label}:`);
      console.log(`  - Failed: ${result.error.message}`);
    } catch (error) {
      console.error(`\n${config.name}:`);
      console.error(`  - Failed: ${(error as Error).message}`);
    }
  }

  console.log(`\n✓ Completed in ${((Date.now() - start) / 1000).toFixed(2)}s`);
};

main().catch((error) => {
  process.exitCode = 1;
  console.error("[refresh:sepps] Fatal error", error);
});
