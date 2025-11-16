import "dotenv/config";
import { syncAllInstruments } from "../src/lib/legislation/service";

const main = async () => {
  console.log("[Refresh] Starting 48-hour legislation sync...");
  const start = Date.now();

  try {
    const results = await syncAllInstruments();

    console.log("\n[Refresh] Sync Results:");
    for (const result of results) {
      console.log(`\n${result.instrument.name}:`);
      console.log(`  - Added: ${result.added}, Updated: ${result.updated}`);
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
