import "dotenv/config";

import { syncAllInstruments } from "../src/lib/legislation/service";

const main = async () => {
  console.log("[legislation] starting sync");
  const results = await syncAllInstruments();
  results.forEach((result) => {
    console.log(
      `→ ${result.instrument.slug}: ${result.added} added / ${result.updated} updated (last synced ${result.instrument.lastSyncedAt})`,
    );
  });
};

main().catch((error) => {
  console.error("[legislation] sync failed", error);
  process.exitCode = 1;
});
