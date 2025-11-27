export type LgaMapInfo = {
  lgaName: string;
  platform: "arcgis" | "intramaps" | "pozi" | "none";
  primaryMapUrl: string | null;
  notes?: string;
};

const LGA_MAPS: LgaMapInfo[] = [
  {
    lgaName: "Byron Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://byronshire.maps.arcgis.com/home/index.html",
    notes: "Council ArcGIS portal with zoning and overlays",
  },
  {
    lgaName: "Ballina Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://gis.ballina.nsw.gov.au/intramaps90/default.htm",
    notes: "IntraMaps viewer for Ballina overlays",
  },
  {
    lgaName: "Lismore City Council",
    platform: "intramaps",
    primaryMapUrl: "https://maps.lismore.nsw.gov.au/intramaps90/",
    notes: "Zoning and constraints via IntraMaps",
  },
  {
    lgaName: "Kempsey Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.kempsey.nsw.gov.au/intramaps90/",
    notes: "Kempsey public mapping viewer",
  },
  {
    lgaName: "Randwick City Council",
    platform: "arcgis",
    primaryMapUrl: "https://rcmaps.randwick.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
    notes: "ArcGIS HTML5 viewer",
  },
  {
    lgaName: "City of Sydney",
    platform: "arcgis",
    primaryMapUrl: "https://cityofsydney.maps.arcgis.com/apps/webappviewer/index.html?id=3fa414c91a734c5caa55a5c0aa6d5bb1",
    notes: "City of Sydney interactive map",
  },
  {
    lgaName: "Byron Shire",
    platform: "arcgis",
    primaryMapUrl: "https://byronshire.maps.arcgis.com/home/index.html",
  },
  {
    lgaName: "Ballina",
    platform: "intramaps",
    primaryMapUrl: "https://gis.ballina.nsw.gov.au/intramaps90/default.htm",
  },
  {
    lgaName: "Lismore",
    platform: "intramaps",
    primaryMapUrl: "https://maps.lismore.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Kempsey",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.kempsey.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Randwick",
    platform: "arcgis",
    primaryMapUrl: "https://rcmaps.randwick.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
  },
  {
    lgaName: "City of Sydney Council",
    platform: "arcgis",
    primaryMapUrl: "https://cityofsydney.maps.arcgis.com/apps/webappviewer/index.html?id=3fa414c91a734c5caa55a5c0aa6d5bb1",
  },
  // TODO: extend registry to cover all NSW LGAs.
];

const normalizeLgaName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\bcity of\s+/g, "")
    .replace(/\bcouncil\b/g, "")
    .replace(/\bshire\b/g, "")
    .replace(/\bcity\b/g, "")
    .replace(/\bmunicipal\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function getLgaMapInfo(lgaName: string): LgaMapInfo | null {
  if (!lgaName) return null;
  const normalizedQuery = normalizeLgaName(lgaName);
  const match = LGA_MAPS.find((entry) => {
    const normalizedEntry = normalizeLgaName(entry.lgaName);
    return (
      normalizedEntry === normalizedQuery ||
      normalizedEntry.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedEntry)
    );
  });
  return match ?? null;
}
