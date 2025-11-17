import path from "path";

import instruments from "./instruments.json";
import type { InstrumentConfig } from "./types";

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

export const getInstrumentConfig = (slug: string) =>
  INSTRUMENT_CONFIG.find((instrument) => instrument.slug === slug);

export const listInstrumentSlugs = () => INSTRUMENT_CONFIG.map((config) => config.slug);
