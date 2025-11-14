import path from "path";

import instruments from "./instruments.json";
import type { InstrumentConfig } from "./types";

const projectRoot = process.cwd();

const normaliseInstrument = (config: InstrumentConfig): InstrumentConfig => ({
  ...config,
  jurisdiction: config.jurisdiction ?? "NSW",
  fixtureFile: config.fixtureFile ? path.resolve(projectRoot, config.fixtureFile) : undefined,
});

export const INSTRUMENT_CONFIG: InstrumentConfig[] = instruments.map((config) =>
  normaliseInstrument(config as InstrumentConfig),
);

export const getInstrumentConfig = (slug: string) =>
  INSTRUMENT_CONFIG.find((instrument) => instrument.slug === slug);

export const listInstrumentSlugs = () => INSTRUMENT_CONFIG.map((config) => config.slug);
