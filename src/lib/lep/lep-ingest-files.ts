import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

import type { InstrumentConfig } from "@/lib/legislation/types";

import { parseNswLepXml } from "./nsw-lep-parser";

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export interface LepFilenameInfo {
  instrumentSlug: string;
  lgaName: string;
  lgaCode: string;
  year?: string;
}

export interface LepConfigPreparation {
  config: InstrumentConfig;
  details: LepFilenameInfo & {
    fileName: string;
    instrumentName: string;
  };
}

export const parseLepFilename = (fileName: string): LepFilenameInfo => {
  const base = fileName.replace(/\.xml$/i, "");
  const normalizedBase = base.replace(/\s+/g, "-");
  const [rawLga, rawYear] = normalizedBase.split(/-lep-/i);

  const lgaName = rawLga ? toTitleCase(rawLga.replace(/-/g, " ")) : "";
  const lgaCode = lgaName.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const year = rawYear?.match(/\d{4}/)?.[0];
  const instrumentSlug = normalizedBase.toLowerCase();

  return { instrumentSlug, lgaName, lgaCode, year };
};

export const buildLepConfigFromFile = async (
  filePath: string,
  options?: { xml?: string },
): Promise<LepConfigPreparation> => {
  const fileName = path.basename(filePath);
  const filenameInfo = parseLepFilename(fileName);

  const xml = options?.xml ?? (await fs.readFile(filePath, "utf-8"));
  const parsed = parseNswLepXml(xml);

  const derivedYear =
    filenameInfo.year || parsed.metadata.instrumentName.match(/\b(\d{4})\b/)?.[1] || undefined;

  const lgaName = parsed.metadata.lgaName?.trim() || filenameInfo.lgaName;
  const lgaCode = lgaName.toUpperCase().replace(/[^A-Z0-9]+/g, "_") || filenameInfo.lgaCode;

  const instrumentName =
    parsed.metadata.instrumentName || `${lgaName || filenameInfo.lgaName} Local Environmental Plan ${derivedYear ?? ""}`.trim();
  const shortName = `${lgaName || filenameInfo.lgaName} LEP ${derivedYear ?? ""}`.trim();

  const clausePrefixBase = `${lgaCode}${derivedYear ? `_${derivedYear}` : ""}`
    .replace(/__+/g, "_")
    .replace(/_$/, "");

  const config: InstrumentConfig = {
    slug: filenameInfo.instrumentSlug,
    name: instrumentName,
    shortName,
    instrumentType: "LEP",
    sourceUrl: `file://${filePath}`,
    xmlLocalPath: filePath,
    clausePrefix: clausePrefixBase || filenameInfo.instrumentSlug.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase(),
    topics: parsed.metadata.instrumentType ? [parsed.metadata.instrumentType] : undefined,
  };

  return {
    config,
    details: {
      ...filenameInfo,
      fileName,
      lgaName,
      lgaCode,
      instrumentName,
    },
  };
};

export const buildLepConfigFromFileSync = (
  filePath: string,
  options?: { xml?: string },
): LepConfigPreparation => {
  const fileName = path.basename(filePath);
  const filenameInfo = parseLepFilename(fileName);

  const xml = options?.xml ?? fsSync.readFileSync(filePath, "utf-8");
  const parsed = parseNswLepXml(xml);

  const derivedYear =
    filenameInfo.year || parsed.metadata.instrumentName.match(/\b(\d{4})\b/)?.[1] || undefined;

  const lgaName = parsed.metadata.lgaName?.trim() || filenameInfo.lgaName;
  const lgaCode = lgaName.toUpperCase().replace(/[^A-Z0-9]+/g, "_") || filenameInfo.lgaCode;

  const instrumentName =
    parsed.metadata.instrumentName || `${lgaName || filenameInfo.lgaName} Local Environmental Plan ${derivedYear ?? ""}`.trim();
  const shortName = `${lgaName || filenameInfo.lgaName} LEP ${derivedYear ?? ""}`.trim();

  const clausePrefixBase = `${lgaCode}${derivedYear ? `_${derivedYear}` : ""}`
    .replace(/__+/g, "_")
    .replace(/_$/, "");

  const config: InstrumentConfig = {
    slug: filenameInfo.instrumentSlug,
    name: instrumentName,
    shortName,
    instrumentType: "LEP",
    sourceUrl: `file://${filePath}`,
    xmlLocalPath: filePath,
    clausePrefix: clausePrefixBase || filenameInfo.instrumentSlug.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase(),
    topics: parsed.metadata.instrumentType ? [parsed.metadata.instrumentType] : undefined,
  };

  return {
    config,
    details: {
      ...filenameInfo,
      fileName,
      lgaName,
      lgaCode,
      instrumentName,
    },
  };
};
