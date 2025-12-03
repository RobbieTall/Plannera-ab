import fs from "fs";
import path from "path";

import instruments from "./instruments.json";
import type { InstrumentConfig } from "./types";
import { buildLepConfigFromFileSync } from "../lep/lep-ingest-files";

const projectRoot = process.cwd();

type InstrumentConfigInput = InstrumentConfig & {
  xml_url?: string;
  xml_local_path?: string;
};

const normaliseInstrument = (config: InstrumentConfigInput): InstrumentConfig => {
  const xmlLocalPath = config.xmlLocalPath ?? config.xml_local_path;
  const xmlUrl = config.xmlUrl ?? config.xml_url;

  return {
    ...config,
    xmlUrl,
    xmlLocalPath: xmlLocalPath ? path.resolve(projectRoot, xmlLocalPath) : undefined,
    jurisdiction: config.jurisdiction ?? "NSW",
    fixtureFile: config.fixtureFile ? path.resolve(projectRoot, config.fixtureFile) : undefined,
  };
};

export const INSTRUMENT_CONFIG: InstrumentConfig[] = instruments.map((config) =>
  normaliseInstrument(config as InstrumentConfig),
);

const loadLocalLepConfigs = (): InstrumentConfig[] => {
  const xmlRoot = path.resolve(projectRoot, "data/nsw/xml");
  try {
    const entries = fs.readdirSync(xmlRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /lep/i.test(entry.name) && /\.xml$/i.test(entry.name))
      .map((entry) => path.join(xmlRoot, entry.name))
      .flatMap((filePath) => {
        try {
          return [buildLepConfigFromFileSync(filePath).config];
        } catch (error) {
          console.warn(`[legislation-config] Failed to build LEP config for ${filePath}:`, error);
          return [];
        }
      });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      console.warn("[legislation-config] Unable to read NSW LEP directory", err);
    }
    return [];
  }
};

const localLepConfigs = loadLocalLepConfigs();

const merged = [...INSTRUMENT_CONFIG];
const existingSlugs = new Set(merged.map((config) => config.slug));

for (const lep of localLepConfigs) {
  if (existingSlugs.has(lep.slug)) {
    continue;
  }
  merged.push(lep);
}

export const ALL_INSTRUMENT_CONFIG: InstrumentConfig[] = merged;

export const getInstrumentConfig = (slug: string) =>
  ALL_INSTRUMENT_CONFIG.find((instrument) => instrument.slug === slug);

export const listInstrumentSlugs = () => ALL_INSTRUMENT_CONFIG.map((config) => config.slug);
