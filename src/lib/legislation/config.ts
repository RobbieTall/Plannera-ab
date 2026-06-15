import fs from "fs";
import path from "path";

import instruments from "./instruments.json";
import type { InstrumentConfig } from "./types";
import { LOCAL_NSW_LEP_CONFIGS } from "../lep/nsw-lep-registry";

const projectRoot = process.cwd();

type InstrumentConfigInput = InstrumentConfig & {
  xml_url?: string;
  xml_local_path?: string;
};

const normaliseInstrument = (config: InstrumentConfigInput): InstrumentConfig => {
  const rawXmlLocalPath = config.xmlLocalPath ?? config.xml_local_path;
  const xmlUrl = config.xmlUrl ?? config.xml_url;
  const allowLocalFixtures = process.env.LEP_LOCAL_FIXTURES === "true";
  const configuredXmlLocalPath =
    config.instrumentType === "LEP" && !allowLocalFixtures ? undefined : rawXmlLocalPath;
  const resolvedXmlLocalPath = configuredXmlLocalPath
    ? path.resolve(projectRoot, configuredXmlLocalPath)
    : undefined;
  const resolvedFixtureFile = config.fixtureFile
    ? path.resolve(projectRoot, config.fixtureFile)
    : undefined;
  const xmlLocalPath =
    resolvedXmlLocalPath && fs.existsSync(resolvedXmlLocalPath)
      ? resolvedXmlLocalPath
      : resolvedFixtureFile;

  return {
    ...config,
    xmlUrl,
    xmlLocalPath,
    jurisdiction: config.jurisdiction ?? "NSW",
    fixtureFile: resolvedFixtureFile,
  };
};

export const INSTRUMENT_CONFIG: InstrumentConfig[] = instruments.map((config) =>
  normaliseInstrument(config as InstrumentConfig),
);

const localLepConfigs = LOCAL_NSW_LEP_CONFIGS.map((config) => normaliseInstrument(config));

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
