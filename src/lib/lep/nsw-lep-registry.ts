import fs from "fs";
import path from "path";

import type { InstrumentConfig } from "../legislation/types";

import { buildLepConfigFromFileSync, type LepConfigPreparation } from "./lep-ingest-files";
import {
  expandNswLgaAliases,
  normalizeNswLgaName,
  resolveCanonicalNswLga,
} from "./nsw-lga-normaliser";

const projectRoot = process.cwd();
const xmlRoot = path.resolve(projectRoot, "data/nsw/xml");

const loadLocalLepPreparations = (): LepConfigPreparation[] => {
  try {
    const entries = fs.readdirSync(xmlRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /lep/i.test(entry.name) && /\.xml$/i.test(entry.name))
      .flatMap((entry) => {
        const filePath = path.join(xmlRoot, entry.name);
        try {
          return [buildLepConfigFromFileSync(filePath)];
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

const LOCAL_PREPARATIONS = loadLocalLepPreparations();

const LGA_INDEX = new Map<string, LepConfigPreparation[]>();
const SLUG_INDEX = new Map<string, LepConfigPreparation>();

for (const prep of LOCAL_PREPARATIONS) {
  const primaryKeys = expandNswLgaAliases(prep.details.canonicalLga ?? prep.details.lgaName);
  const fallbackKeys = [
    resolveCanonicalNswLga(prep.details.lgaCode),
    normalizeNswLgaName(prep.details.lgaName),
    normalizeNswLgaName(prep.details.lgaCode),
  ];

  const candidateKeys = new Set<string>([...primaryKeys, ...fallbackKeys.filter(Boolean) as string[]]);

  for (const key of candidateKeys) {
    const existing = LGA_INDEX.get(key) ?? [];
    existing.push(prep);
    LGA_INDEX.set(key, existing);
  }

  SLUG_INDEX.set(prep.config.slug, prep);
}

export const LOCAL_NSW_LEP_CONFIGS: InstrumentConfig[] = LOCAL_PREPARATIONS.map((prep) => prep.config);

export const listNswLgaKeys = () => Array.from(LGA_INDEX.keys());

export const resolveNswLgaKey = (lga: string | null | undefined): string | null => {
  const candidates = expandNswLgaAliases(lga);
  if (!candidates.length) return null;

  for (const key of candidates) {
    if (LGA_INDEX.has(key)) {
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

  for (const key of candidateKeys) {
    const entries = LGA_INDEX.get(key) ?? [];
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
  return SLUG_INDEX.get(slug) ?? null;
};
