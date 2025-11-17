import "dotenv/config";
import { syncAllInstruments } from "../src/lib/legislation/service";

const main = async () => {
  console.log("[Refresh] Starting 48-hour legislation sync...");
  const start = Date.now();

  try {
    const results = await syncAllInstruments();

    console.log("\n[Refresh] Sync Results:");
    for (const result of results) {
      if ("error" in result && result.error) {
        console.log(`\n${result.config.name ?? result.config.slug}:`);
        console.log(`  - Failed: ${result.error.message}`);
        continue;
      }

      console.log(`\n${result.instrument.name}:`);
      console.log(`  - Added: ${result.added}, Updated: ${result.updated}, Parsed: ${result.parsedClauses}`);
    }

    console.log(`\n✓ Completed in ${((Date.now() - start) / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error("\n✗ Sync failed:", error);
    throw error;
  }
};

main().catch((error) => {
  process.exitCode = 1;
});
