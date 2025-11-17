import "dotenv/config";
import fs from "fs/promises";

import { INSTRUMENT_CONFIG } from "../src/lib/legislation/config";
import { prisma } from "../src/lib/prisma";

const fileExists = async (filePath?: string) => {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code && err.code !== "ENOENT") {
      throw err;
    }
    return false;
  }
};

const main = async () => {
  const totalInstruments = INSTRUMENT_CONFIG.length;
  const withLocalPath = INSTRUMENT_CONFIG.filter((instrument) => instrument.xmlLocalPath).length;
  const seppConfigs = INSTRUMENT_CONFIG.filter((instrument) => instrument.instrumentType === "SEPP");
  const seppWithLocalPath = seppConfigs.filter((instrument) => instrument.xmlLocalPath).length;
  const xmlPresence = await Promise.all(
    INSTRUMENT_CONFIG.map(async (instrument) => ({
      slug: instrument.slug,
      instrumentType: instrument.instrumentType,
      hasLocalXml: await fileExists(instrument.xmlLocalPath),
    })),
  );
  const withLocalXml = xmlPresence.filter((entry) => entry.hasLocalXml).length;
  const seppWithXml = xmlPresence.filter((entry) => entry.instrumentType === "SEPP" && entry.hasLocalXml).length;
  const missingXml = xmlPresence.filter((entry) => !entry.hasLocalXml);

  const instrumentRecords = await prisma.instrument.findMany({
    select: { slug: true, instrumentType: true, _count: { select: { clauses: true } } },
  });
  const ingested = instrumentRecords.length;
  const ingestedWithClauses = instrumentRecords.filter((record) => record._count.clauses > 0).length;
  const seppIngested = instrumentRecords.filter((record) => record.instrumentType === "SEPP").length;
  const seppWithClauses = instrumentRecords.filter(
    (record) => record.instrumentType === "SEPP" && record._count.clauses > 0,
  ).length;

  console.log("[legislation:coverage] NSW Registry Coverage\n");
  console.log(`Total instruments in registry: ${totalInstruments}`);
  console.log(`Instruments with xml_local_path configured: ${withLocalPath}`);
  console.log(`Instruments with local XML present: ${withLocalXml}`);
  console.log(`Instruments ingested into DB: ${ingested}`);
  console.log(`Ingested instruments with clauses: ${ingestedWithClauses}`);
  console.log("");
  console.log(`SEPP instruments in registry: ${seppConfigs.length}`);
  console.log(`SEPPs with xml_local_path configured: ${seppWithLocalPath}`);
  console.log(`SEPPs with local XML present: ${seppWithXml}`);
  console.log(`SEPPs ingested into DB: ${seppIngested}`);
  console.log(`SEPPs with clauses: ${seppWithClauses}`);
  console.log(`Missing or invalid XML files: ${missingXml.length}`);
  if (missingXml.length > 0) {
    console.log("\nMissing XML:");
    missingXml.forEach((entry) => console.log(` - ${entry.slug}`));
  }

  await prisma.$disconnect();
};

main().catch((error) => {
  console.error("[legislation:coverage] Failed", error);
  prisma
    .$disconnect()
    .catch(() => {})
    .finally(() => process.exit(1));
});
