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

export type LepParseResult = {
  metadata: LepInstrumentMetadata;
  zones: LepZoneUses[];
};
