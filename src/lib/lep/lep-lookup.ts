import type { LepParseResult, LepZoneUses } from "./types";

export type LepZoneContext = {
  metadata: {
    lgaName: string;
    instrumentName: string;
    instrumentType: string;
  };
  zone: LepZoneUses;
};

export function findLepZoneForZoningCode(args: {
  lepData: LepParseResult | null | undefined;
  zoningCode: string | null | undefined;
}): LepZoneContext | null {
  const { lepData, zoningCode } = args;
  if (!lepData || !zoningCode) {
    return null;
  }

  const normalizedCode = zoningCode.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const matchedZone = lepData.zones.find(
    (zone) => zone.zoneCode.trim().toUpperCase() === normalizedCode,
  );

  if (!matchedZone) {
    return null;
  }

  return {
    metadata: lepData.metadata,
    zone: matchedZone,
  };
}
