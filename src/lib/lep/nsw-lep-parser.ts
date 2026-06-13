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

function textContent(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(" ");
  if (!isObject(node)) return "";
  if (node["#text"] !== undefined) return textContent(node["#text"]);
  return Object.entries(node)
    .filter(([key]) => !["id", "guid", "type", "status", "source", "name", "value", "class", "break.before", "emphasis", "parentattributes", "attrib", "no"].includes(key))
    .map(([, value]) => textContent(value))
    .join(" ");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/&#8212;|—/g, "—").trim();
}

function headingText(level: AnyObject): string {
  const head = isObject(level.head) ? level.head : {};
  return cleanText([textContent(head.no), textContent(head.heading)].filter(Boolean).join(" "));
}

function splitUses(value: string): string[] {
  return cleanText(value)
    .split(/;|,(?=\s*(?:and\s+)?[A-Z])/g)
    .map((item) => item.replace(/^and\s+/i, "").trim())
    .filter(Boolean);
}

function listItems(node: unknown): string[] {
  if (!isObject(node)) return [];
  const items: string[] = [];
  const visit = (candidate: unknown) => {
    if (!isObject(candidate)) return;
    for (const li of toArray(candidate.li)) {
      const text = cleanText(textContent(isObject(li) ? li.block : li));
      if (text) items.push(text);
    }
    for (const child of Object.values(candidate)) for (const v of toArray(child)) visit(v);
  };
  visit(node);
  return Array.from(new Set(items));
}

function mergeZone(zones: LepZoneUses[], zone: LepZoneUses) {
  const existing = zones.find((item) => item.zoneCode === zone.zoneCode);
  if (!existing) {
    zones.push(zone);
    return;
  }
  existing.zoneName ||= zone.zoneName;
  existing.zoneObjectives = [...new Set([...(existing.zoneObjectives ?? []), ...(zone.zoneObjectives ?? [])])];
  existing.permittedWithoutConsent = [...new Set([...existing.permittedWithoutConsent, ...zone.permittedWithoutConsent])];
  existing.permittedWithConsent = [...new Set([...existing.permittedWithConsent, ...zone.permittedWithConsent])];
  existing.prohibited = [...new Set([...existing.prohibited, ...zone.prohibited])];
}

function collectStandardInstrumentZones(node: unknown, zones: LepZoneUses[]): void {
  if (!isObject(node)) return;
  if (node.type === "clausegroup") {
    const head = headingText(node);
    const match = head.match(/Zone\s+([A-Z]{1,3}\d?[A-Z]?)\s+(.+)/i);
    if (match) {
      const zone: LepZoneUses = {
        zoneCode: match[1].toUpperCase(),
        zoneName: match[2].trim(),
        zoneObjectives: [],
        permittedWithoutConsent: [],
        permittedWithConsent: [],
        prohibited: [],
      };
      for (const child of toArray(node.level)) {
        if (!isObject(child)) continue;
        const childHead = headingText(child);
        const body = cleanText(textContent(child.block));
        if (/Objectives of zone/i.test(childHead)) zone.zoneObjectives = listItems(child.block);
        else if (/Permitted without consent/i.test(childHead)) zone.permittedWithoutConsent = splitUses(body);
        else if (/Permitted with consent/i.test(childHead)) zone.permittedWithConsent = splitUses(body);
        else if (/Prohibited/i.test(childHead)) zone.prohibited = splitUses(body);
      }
      mergeZone(zones, zone);
    }
  }
  for (const child of Object.values(node)) for (const candidate of toArray(child)) collectStandardInstrumentZones(candidate, zones);
}

function findMetacontent(parsed: AnyObject, className: string): string | undefined {
  const visit = (node: unknown): string | undefined => {
    if (!isObject(node)) return undefined;
    if (node.class === className && node["#text"] !== undefined) {
      return cleanText(textContent(node["#text"]));
    }
    for (const child of Object.values(node)) {
      for (const candidate of toArray(child)) {
        const found = visit(candidate);
        if (found) return found;
      }
    }
    return undefined;
  };
  return visit(parsed);
}

function extractClauseMapControl(parsed: AnyObject, clauseNo: string, mapName: string): string | null {
  let result: string | null = null;
  const visit = (node: unknown) => {
    if (result || !isObject(node)) return;
    if (node.type === "clause" && String(node.id ?? "").startsWith(`sec.${clauseNo}`)) {
      const text = cleanText(textContent(node));
      if (new RegExp(mapName, "i").test(text)) {
        result = `${mapName} Map`;
        return;
      }
    }
    for (const child of Object.values(node)) for (const candidate of toArray(child)) visit(candidate);
  };
  visit(parsed);
  return result;
}

export function parseNswLepXml(xml: string): LepParseResult {
  const parsed = parser.parse(xml) as AnyObject;

  const metadata = {
    lgaName: findFirstValue(parsed, "LGA_NAME") ?? findMetacontent(parsed, "council") ?? "",
    instrumentName: findFirstValue(parsed, "EPI_NAME") ?? (typeof parsed.exdoc === "object" && parsed.exdoc !== null ? String((parsed.exdoc as AnyObject).title ?? "") : ""),
    instrumentType: findFirstValue(parsed, "EPI_TYPE") ?? findMetacontent(parsed, "plan.type") ?? "",
  };

  const zones: LepZoneUses[] = [];
  collectStandardInstrumentZones(parsed, zones);
  collectZones(parsed, zones);

  const controls = {
    heightOfBuilding: extractClauseMapControl(parsed, "4.3", "Height of Buildings"),
    floorSpaceRatio: extractClauseMapControl(parsed, "4.4", "Floor Space Ratio"),
    minimumLotSize: extractClauseMapControl(parsed, "4.1", "Lot Size"),
  };

  return { metadata, zones, controls };
}
