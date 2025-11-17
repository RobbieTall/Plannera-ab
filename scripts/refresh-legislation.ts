import "dotenv/config";
import { syncAllInstruments } from "../src/lib/legislation/service";

const main = async () => {
  console.log("[Refresh] Starting 48-hour legislation sync...");
  const start = Date.now();

  try {
    const results = await syncAllInstruments();

    console.log("\n[Refresh] Sync Results:");
    for (const result of results) {
      const label = result.config.name ?? result.config.slug;

      if (result.status === "ok") {
        console.log(`\n${result.instrument.name}:`);
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
