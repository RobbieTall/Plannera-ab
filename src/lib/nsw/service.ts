import fs from "fs/promises";

import type { ProjectParameters } from "@/lib/project-parser";

import { getDatasetConfig } from "./config";
import type {
  NswDatasetSlug,
  NswPlanningSnapshot,
  PropertyInsight,
  SnapshotQuery,
  TradeInsight,
  WaterInsight,
} from "./types";

const fetchDatasetDocument = async (slug: NswDatasetSlug) => {
  const config = getDatasetConfig(slug);
  const sourceUrl = process.env[config.urlEnv];
  if (sourceUrl) {
    const headers: Record<string, string> = { Accept: "application/json" };
    const apiKey = process.env[config.apiKeyEnv];
    if (apiKey) {
      headers[config.apiKeyHeader] = apiKey;
    }
    const response = await fetch(sourceUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${slug} dataset: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  return fs.readFile(config.fixtureFile, "utf-8");
};

const normaliseString = (value: unknown) =>
  typeof value === "string" ? value.trim() : Array.isArray(value) ? value.filter((item) => typeof item === "string") : value;

const parsePropertyDataset = (document: string): PropertyInsight[] => {
  const data = JSON.parse(document);
  const rows: PropertyInsight[] = (data.records ?? data.lots ?? []).map((entry: Record<string, unknown>) => ({
    address: String(entry.address ?? entry.Address ?? ""),
    lot: String(entry.lot ?? entry.LOT ?? ""),
    plan: String(entry.plan ?? entry.PLAN ?? entry.planNumber ?? ""),
    zoning: String(entry.zoning ?? entry.ZONING ?? entry.zone ?? "Unknown"),
    floorSpaceRatio: normaliseString(entry.floorSpaceRatio ?? entry.fsr) as string | undefined,
    heightLimit: normaliseString(entry.heightLimit ?? entry.height) as string | undefined,
    heritage: normaliseString(entry.heritage) as string | undefined,
    overlays: (normaliseString(entry.overlays) as string[]) ?? [],
    localGovernmentArea: normaliseString(entry.localGovernmentArea ?? entry.lga) as string | undefined,
  }));
  return rows.filter((row) => row.address);
};

const parseWaterDataset = (document: string): WaterInsight[] => {
  const data = JSON.parse(document);
  const rows: WaterInsight[] = (data.catchments ?? []).map((entry: Record<string, unknown>) => ({
    name: String(entry.name ?? entry.catchment ?? "Unnamed"),
    authority: String(entry.authority ?? entry.authorityName ?? "Water Authority"),
    floodRisk: String(entry.floodRisk ?? entry.risk ?? "Unknown"),
    controls: (normaliseString(entry.controls) as string[]) ?? [],
    infrastructure: (normaliseString(entry.infrastructure) as string[]) ?? [],
    localGovernmentArea: normaliseString(entry.localGovernmentArea ?? entry.lga) as string | undefined,
  }));
  return rows;
};

const parseTradesDataset = (document: string): TradeInsight[] => {
  const data = JSON.parse(document);
  const rows: TradeInsight[] = (data.licences ?? data.trades ?? []).map((entry: Record<string, unknown>) => ({
    trade: String(entry.trade ?? entry.name ?? "Trade"),
    licence: String(entry.licence ?? entry.license ?? "Licence"),
    approvals: (normaliseString(entry.approvals) as string[]) ?? [],
    serviceTimeframe: normaliseString(entry.serviceTimeframe ?? entry.sla) as string | undefined,
    contact: normaliseString(entry.contact ?? entry.email) as string | undefined,
    serviceAreas: (normaliseString(entry.serviceAreas ?? entry.regions) as string[]) ?? [],
  }));
  return rows;
};

export const ingestDataset = async (slug: NswDatasetSlug) => {
  const document = await fetchDatasetDocument(slug);
  switch (slug) {
    case "property":
      return parsePropertyDataset(document);
    case "water":
      return parseWaterDataset(document);
    case "trades":
      return parseTradesDataset(document);
    default: {
      const exhaustiveCheck: never = slug;
      throw new Error(`Unsupported dataset ${exhaustiveCheck}`);
    }
  }
};

const filterByLocation = <T extends { localGovernmentArea?: string; address?: string }>(
  records: T[],
  location?: string,
  limit = 3
) => {
  if (!records.length) {
    return [];
  }
  if (!location) {
    return records.slice(0, limit);
  }
  const lowerLocation = location.toLowerCase();
  const directMatches = records.filter((record) => {
    const area = record.localGovernmentArea ?? record.address;
    return typeof area === "string" && area.toLowerCase().includes(lowerLocation);
  });
  if (directMatches.length >= limit) {
    return directMatches.slice(0, limit);
  }
  const fallback = records.filter((record) => {
    if (!record.address) return false;
    return record.address.toLowerCase().includes(lowerLocation);
  });
  const combined = [...directMatches, ...fallback.filter((row) => !directMatches.includes(row))];
  if (combined.length === 0) {
    return records.slice(0, limit);
  }
  return combined.slice(0, limit);
};

export const getNswPlanningSnapshot = async (
  query?: SnapshotQuery | ProjectParameters
): Promise<NswPlanningSnapshot> => {
  const [property, water, trades] = await Promise.all([
    ingestDataset("property"),
    ingestDataset("water"),
    ingestDataset("trades"),
  ]);

  const limit = query?.limitPerDataset ?? 2;
  const location = query?.location;

  return {
    property: filterByLocation(property, location, limit),
    water: filterByLocation(water, location, limit),
    trades: trades.slice(0, limit),
  };
};
