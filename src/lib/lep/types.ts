export type LepZoneUses = {
  zoneCode: string;
  zoneName: string;
  zoneObjectives?: string[];
  permittedWithoutConsent: string[];
  permittedWithConsent: string[];
  prohibited: string[];
};

export type LepInstrumentMetadata = {
  lgaName: string;
  instrumentName: string;
  instrumentType: string;
};

export type LepMappedControls = {
  heightOfBuilding?: string | null;
  floorSpaceRatio?: string | null;
  minimumLotSize?: string | null;
};

export type LepParseResult = {
  metadata: LepInstrumentMetadata;
  zones: LepZoneUses[];
  controls?: LepMappedControls;
};
