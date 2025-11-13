import path from "path";

import type { InstrumentConfig } from "./types";

const projectRoot = process.cwd();
const fixtureRoot = path.resolve(projectRoot, "scripts/fixtures/legislation");

const toFixtureUrl = (fileName: string) => `file://${path.join(fixtureRoot, fileName)}`;

export const INSTRUMENT_CONFIG: InstrumentConfig[] = [
  {
    slug: "sepp-housing-2021",
    name: "State Environmental Planning Policy (Housing) 2021",
    shortName: "SEPP Housing 2021",
    instrumentType: "SEPP",
    sourceUrl: toFixtureUrl("sepp-housing-2021.html"),
    jurisdiction: "NSW",
    clausePrefix: "SEPP_HOUSING_2021",
    alwaysApplicable: true,
    topics: ["housing", "secondary dwelling", "dual occupancy"],
  },
  {
    slug: "city-of-sydney-lep-2012",
    name: "Sydney Local Environmental Plan 2012",
    shortName: "Sydney LEP 2012",
    instrumentType: "LEP",
    sourceUrl: toFixtureUrl("city-of-sydney-lep-2012.html"),
    jurisdiction: "NSW",
    clausePrefix: "SYDNEY_LEP_2012",
    topics: ["height", "floor space ratio", "zoning"],
  },
];

export const getInstrumentConfig = (slug: string) =>
  INSTRUMENT_CONFIG.find((instrument) => instrument.slug === slug);

export const listInstrumentSlugs = () => INSTRUMENT_CONFIG.map((config) => config.slug);
