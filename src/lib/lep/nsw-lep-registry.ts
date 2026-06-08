import fs from "fs";
import path from "path";

import type { InstrumentConfig } from "../legislation/types";

import { buildLepConfigFromMetadata, type LepConfigPreparation } from "./lep-ingest-files";
import {
  expandNswLgaAliases,
  normalizeNswLgaName,
  resolveCanonicalNswLga,
} from "./nsw-lga-normaliser";

const projectRoot = process.cwd();
const xmlRoot = path.resolve(projectRoot, "data/nsw/xml");

type RegistryState = {
  preparations: LepConfigPreparation[];
  lgaIndex: Map<string, LepConfigPreparation[]>;
  slugIndex: Map<string, LepConfigPreparation>;
};

const getGlobalRegistry = () => globalThis as typeof globalThis & { __nswLepRegistry?: RegistryState };

const loadLocalLepPreparations = (): LepConfigPreparation[] => {
  try {
    const entries = fs.readdirSync(xmlRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /lep/i.test(entry.name) && /\.xml$/i.test(entry.name))
      .flatMap((entry) => {
        const filePath = path.join(xmlRoot, entry.name);
        try {
          return [buildLepConfigFromMetadata(filePath)];
        } catch (error) {
          console.warn(`[nsw-lep-registry] Failed to build LEP config for ${filePath}:`, error);
          return [];
        }
      });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      console.warn("[nsw-lep-registry] Unable to read NSW LEP directory", err);
    }
    return [];
  }
};

const buildRegistry = (): RegistryState => {
  const preparations = loadLocalLepPreparations();
  const lgaIndex = new Map<string, LepConfigPreparation[]>();
  const slugIndex = new Map<string, LepConfigPreparation>();

  for (const prep of preparations) {
    const primaryKeys = expandNswLgaAliases(prep.details.canonicalLga ?? prep.details.lgaName);
    const fallbackKeys = [
      resolveCanonicalNswLga(prep.details.lgaCode),
      normalizeNswLgaName(prep.details.lgaName),
      normalizeNswLgaName(prep.details.lgaCode),
    ];

    const candidateKeys = new Set<string>([...primaryKeys, ...fallbackKeys.filter(Boolean) as string[]]);

    for (const key of candidateKeys) {
      const existing = lgaIndex.get(key) ?? [];
      existing.push(prep);
      lgaIndex.set(key, existing);
    }

    slugIndex.set(prep.config.slug, prep);
  }

  return { preparations, lgaIndex, slugIndex };
};

const getRegistry = (): RegistryState => {
  const globalRegistry = getGlobalRegistry();
  if (globalRegistry.__nswLepRegistry) {
    return globalRegistry.__nswLepRegistry;
  }

  const built = buildRegistry();
  globalRegistry.__nswLepRegistry = built;
  return built;
};

export const LOCAL_NSW_LEP_CONFIGS: InstrumentConfig[] = getRegistry().preparations.map((prep) => prep.config);

export const listLocalNswLepPreparations = (): LepConfigPreparation[] => [...getRegistry().preparations];

export const listNswLgaKeys = () => Array.from(getRegistry().lgaIndex.keys());

export const resolveNswLgaKey = (lga: string | null | undefined): string | null => {
  const candidates = expandNswLgaAliases(lga);
  if (!candidates.length) return null;

  const { lgaIndex } = getRegistry();

  for (const key of candidates) {
    if (lgaIndex.has(key)) {
      return key;
    }
  }

  return candidates[0] ?? null;
};

export const findLocalNswLepsByLga = (lga: string | null | undefined): LepConfigPreparation[] => {
  const candidateKeys = expandNswLgaAliases(lga);
  if (!candidateKeys.length) return [];

  const seen = new Set<string>();
  const matches: LepConfigPreparation[] = [];
  const { lgaIndex } = getRegistry();

  for (const key of candidateKeys) {
    const entries = lgaIndex.get(key) ?? [];
    for (const entry of entries) {
      if (seen.has(entry.config.slug)) continue;
      seen.add(entry.config.slug);
      matches.push(entry);
    }
  }

  return matches;
};

export const findLocalNswLepBySlug = (slug: string | null | undefined): LepConfigPreparation | null => {
  if (!slug) return null;
  const { slugIndex } = getRegistry();
  return slugIndex.get(slug) ?? null;
};
