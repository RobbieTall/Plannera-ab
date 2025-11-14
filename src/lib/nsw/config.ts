import path from "path";

import type { NswDatasetSlug } from "./types";

const fixtureRoot = path.resolve(process.cwd(), "scripts/fixtures/nsw-data");

type DatasetConfig = {
  slug: NswDatasetSlug;
  fixtureFile: string;
  urlEnv: string;
  apiKeyEnv: string;
  apiKeyHeader: string;
};

export const DATASET_CONFIG: Record<NswDatasetSlug, DatasetConfig> = {
  property: {
    slug: "property",
    fixtureFile: path.join(fixtureRoot, "property.json"),
    urlEnv: "NSW_PROPERTY_API_URL",
    apiKeyEnv: "NSW_PROPERTY_API_KEY",
    apiKeyHeader: "Ocp-Apim-Subscription-Key",
  },
  water: {
    slug: "water",
    fixtureFile: path.join(fixtureRoot, "water.json"),
    urlEnv: "NSW_WATER_API_URL",
    apiKeyEnv: "NSW_WATER_API_KEY",
    apiKeyHeader: "Ocp-Apim-Subscription-Key",
  },
  trades: {
    slug: "trades",
    fixtureFile: path.join(fixtureRoot, "trades.json"),
    urlEnv: "NSW_TRADES_API_URL",
    apiKeyEnv: "NSW_TRADES_API_KEY",
    apiKeyHeader: "Ocp-Apim-Subscription-Key",
  },
};

export const getDatasetConfig = (slug: NswDatasetSlug) => DATASET_CONFIG[slug];
