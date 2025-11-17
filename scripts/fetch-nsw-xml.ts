import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { setTimeout as delay } from "timers/promises";

import { INSTRUMENT_CONFIG } from "../src/lib/legislation/config";
import { buildXmlSourceUrl } from "../src/lib/legislation/fetcher";

const USER_AGENT = "PlanneraLegislationFetcher/1.0 (+https://plannera.ai)";
const RETRY_LIMIT = 3;
const REQUEST_DELAY_MS = 500;

const main = async () => {
  if (process.env.VERCEL) {
    console.log("Skipping NSW XML fetch on Vercel.");
    return;
  }

  const force = process.argv.includes("--force");
  let attempted = 0;
  let downloaded = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const instrument of INSTRUMENT_CONFIG) {
    if (!instrument.xmlUrl && !instrument.xmlLocalPath) {
      skipped += 1;
      continue;
    }

    const localPath = instrument.xmlLocalPath;
    if (!localPath) {
      console.warn(`[fetch-nsw-xml] Missing xml_local_path for ${instrument.slug}; skipping.`);
      skipped += 1;
      continue;
    }

    attempted += 1;
    const url = buildXmlSourceUrl(instrument);
    const targetDir = path.dirname(localPath);
    await fs.mkdir(targetDir, { recursive: true });

    try {
      if (!force) {
        try {
          await fs.access(localPath);
          console.log(`[fetch-nsw-xml] ${instrument.slug} already exists at ${localPath}; skipping.`);
          skipped += 1;
          continue;
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err.code && err.code !== "ENOENT") {
            throw err;
          }
        }
      }

      let lastError: unknown;
      for (let attempt = 1; attempt <= RETRY_LIMIT; attempt += 1) {
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "application/xml,text/xml;q=0.9,application/xhtml+xml;q=0.8",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const body = await response.text();
          await fs.writeFile(localPath, body, "utf-8");
          console.log(`[fetch-nsw-xml] Downloaded ${instrument.slug} → ${localPath}`);
          downloaded += 1;
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < RETRY_LIMIT) {
            await delay(REQUEST_DELAY_MS * attempt);
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
    } catch (error) {
      failures.push(`${instrument.slug}: ${String(error)}`);
      console.error(`[fetch-nsw-xml] Failed to download ${instrument.slug}:`, error);
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.log("\n[fetch-nsw-xml] Summary:");
  console.log(`  Attempted: ${attempted}`);
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failures.length}`);
  if (failures.length > 0) {
    failures.forEach((failure) => console.log(`   - ${failure}`));
  }
};

main().catch((error) => {
  console.error("[fetch-nsw-xml] Fatal error", error);
  process.exit(1);
});
