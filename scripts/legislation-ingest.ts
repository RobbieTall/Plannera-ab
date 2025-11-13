import "dotenv/config";

import { INSTRUMENT_CONFIG } from "../src/lib/legislation/config";
import { ingestInstrument } from "../src/lib/legislation/service";

const main = async () => {
  for (const instrument of INSTRUMENT_CONFIG) {
    console.log(`[legislation] ingesting ${instrument.slug}`);
    const result = await ingestInstrument(instrument.slug);
    console.log(`→ ${result.clauseCount} clauses stored`);
  }
};

main().catch((error) => {
  console.error("[legislation] ingestion failed", error);
  process.exitCode = 1;
});
