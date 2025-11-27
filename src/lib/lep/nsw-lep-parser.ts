import { XMLParser } from "fast-xml-parser";

import type { LepParseResult, LepZoneUses } from "./types";

type AnyObject = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
});

function toArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function isObject(value: unknown): value is AnyObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findFirstValue(node: unknown, key: string): string | undefined {
  if (!isObject(node)) {
    return undefined;
  }

  if (node[key] !== undefined) {
    const value = node[key];
    if (typeof value === "string" || typeof value === "number") {
      const trimmed = String(value).trim();
      return trimmed.length ? trimmed : undefined;
    }
  }

  for (const child of Object.values(node)) {
    const candidates = toArray(child);
    for (const candidate of candidates) {
      const result = findFirstValue(candidate, key);
      if (result !== undefined) {
        return result;
      }
    }
  }

  return undefined;
}

function getFirstByKeys(node: AnyObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = findFirstValue(node, key);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function normaliseLandUseValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normaliseLandUseValue(item));
  }

  if (typeof value === "string" || typeof value === "number") {
    const trimmed = String(value).trim();
    return trimmed ? [trimmed] : [];
  }

  if (isObject(value)) {
    const nested = getFirstByKeys(value, ["LAND_USE", "LandUse", "ITEM", "Item", "use", "Use"]);
    if (nested !== undefined) {
      return nested ? [nested] : [];
    }

    return Object.values(value).flatMap((child) => normaliseLandUseValue(child));
  }

  return [];
}

function extractUseList(node: AnyObject, possibleKeys: string[]): string[] {
  for (const key of possibleKeys) {
    if (node[key] !== undefined) {
      return normaliseLandUseValue(node[key]);
    }
  }
  return [];
}

function deriveZoneCodeFromName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const trimmed = name.trim();
  const [firstToken] = trimmed.split(/\s+/);
  if (/^[A-Z]{1,3}\d?[A-Z]?$/i.test(firstToken)) {
    return firstToken.toUpperCase();
  }
  return undefined;
}

function cleanZoneName(name: string | undefined, zoneCode: string | undefined): string | undefined {
  if (!name) return undefined;
  if (zoneCode && name.toUpperCase().startsWith(zoneCode.toUpperCase())) {
    return name.slice(zoneCode.length).trim() || name.trim();
  }
  return name.trim();
}

function collectZones(node: unknown, zones: LepZoneUses[]): void {
  if (!isObject(node)) {
    return;
  }

  const zoneCodeRaw = getFirstByKeys(node, ["ZONE_CODE", "ZoneCode", "ZONE", "code", "Code"]);
  const zoneNameRaw = getFirstByKeys(node, ["ZONE_NAME", "ZoneName", "NAME", "Name", "ZoneName"]);

  const permittedWithoutConsent = extractUseList(node, [
    "WITHOUT_CONSENT",
    "PERMITTED_WITHOUT_CONSENT",
    "PermittedWithoutConsent",
    "permittedWithoutConsent",
  ]);
  const permittedWithConsent = extractUseList(node, [
    "WITH_CONSENT",
    "PERMITTED_WITH_CONSENT",
    "PermittedWithConsent",
    "permittedWithConsent",
  ]);
  const prohibited = extractUseList(node, ["PROHIBITED", "Prohibited", "prohibited"]);

  const zoneCode = zoneCodeRaw ?? deriveZoneCodeFromName(zoneNameRaw);
  const zoneName = cleanZoneName(zoneNameRaw, zoneCode);

  const hasZoneIdentifier = Boolean(zoneCode && zoneName);
  const hasUses = permittedWithoutConsent.length || permittedWithConsent.length || prohibited.length;

  if (hasZoneIdentifier && hasUses) {
    zones.push({
      zoneCode: zoneCode!,
      zoneName: zoneName!,
      permittedWithoutConsent,
      permittedWithConsent,
      prohibited,
    });
  }

  for (const child of Object.values(node)) {
    const candidates = toArray(child);
    for (const candidate of candidates) {
      collectZones(candidate, zones);
    }
  }
}

export function parseNswLepXml(xml: string): LepParseResult {
  const parsed = parser.parse(xml) as AnyObject;

  const metadata = {
    lgaName: findFirstValue(parsed, "LGA_NAME") ?? "",
    instrumentName: findFirstValue(parsed, "EPI_NAME") ?? "",
    instrumentType: findFirstValue(parsed, "EPI_TYPE") ?? "",
  };

  const zones: LepZoneUses[] = [];
  collectZones(parsed, zones);

  return { metadata, zones };
}
