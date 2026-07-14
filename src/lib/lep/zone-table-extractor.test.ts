import fs from "fs";
import { describe, expect, it } from "vitest";

import { buildLepConfigFromFileSync } from "@/lib/lep/lep-ingest-files";
import { parseInstrumentDocument } from "@/lib/legislation/parser";

import { cleanListItems, toZoneCode } from "./zone-utils";
import { extractZoneTables } from "./zone-table-extractor";

const extractRegisteredZone = (xmlPath: string, zoneCode: string) => {
  const xml = fs.readFileSync(xmlPath, "utf-8");
  const { config } = buildLepConfigFromFileSync(xmlPath, { xml });
  const clauses = parseInstrumentDocument(config, xml, "xml");
  const tables = extractZoneTables(clauses);
  return tables.find((table) => table.zoneCode === zoneCode);
};

describe("extractZoneTables real registered NSW LEP XML", () => {
  it("splits explicit bullet separators without splitting intra-word statutory hyphens", () => {
    expect(
      cleanListItems(
        "Eco-tourist facilities • Centre-based child care facilities · Tank-based aquaculture\n- Home-based child care",
      ),
    ).toEqual([
      "Eco-tourist facilities",
      "Centre-based child care facilities",
      "Tank-based aquaculture",
      "Home-based child care",
    ]);
  });

  it("preserves case-insensitive valid zone parsing while rejecting generic zone headings", () => {
    expect(toZoneCode("zone e2 commercial centre")).toBe("E2");
    expect(toZoneCode("- zone sp3 tourist")).toBe("SP3");
    expect(toZoneCode("Zone objectives")).toBeNull();

    const [lowercaseTable, falsePositiveTable] = extractZoneTables([
      {
        clauseKey: "lowercase-zone",
        title: "Lowercase zone table",
        bodyText: "- zone sp3 tourist\nObjectives of zone\nTo provide tourist uses.\nPermitted with consent\nTourist and visitor accommodation\nProhibited\nHeavy industries",
        hierarchyPath: ["Part 2"],
      },
      {
        clauseKey: "zone-objectives",
        title: "Zone objectives and Land Use Table",
        bodyText: "Zone objectives\nObjectives of zone\nThis generic clause describes how objectives work.\nPermitted with consent\nDevelopment applications",
        hierarchyPath: ["Part 2"],
      },
    ]);

    expect(lowercaseTable?.zoneCode).toBe("SP3");
    expect(lowercaseTable?.objectives).toContain("To provide tourist uses.");
    expect(lowercaseTable?.landUse.withConsent).toContain("Tourist and visitor accommodation");
    expect(falsePositiveTable).toBeUndefined();
  });

  it("extracts Byron LEP 2014 SP3 objectives and land-use entries from the real parser output", () => {
    const sp3 = extractRegisteredZone("data/nsw/xml/Byron-lep-2014.xml", "SP3");

    expect(sp3).toBeDefined();
    expect(sp3?.heading).toBe("Zone SP3 Tourist");
    expect(sp3?.objectives).toEqual([
      "To provide for a variety of tourist-oriented development and related uses.",
      "To encourage tourist development in designated areas to reduce impacts on residential amenity in other zones.",
    ]);
    expect(sp3?.landUse.withoutConsent).toEqual(["Environmental protection works", "Home occupations"]);
    expect(sp3?.landUse.withConsent).toEqual(
      expect.arrayContaining(["Centre-based child care facilities", "Eco-tourist facilities"]),
    );
    expect(sp3?.landUse.prohibited).toEqual(["Any development not specified in item 2 or 3"]);
    const byronValues = [
      ...(sp3?.objectives ?? []),
      ...(sp3?.landUse.withoutConsent ?? []),
      ...(sp3?.landUse.withConsent ?? []),
      ...(sp3?.landUse.prohibited ?? []),
    ];
    for (const forbidden of [
      "2",
      "3",
      "4",
      "tourist",
      "oriented",
      "Centre",
      "based child care facilities",
      "Eco",
      "tourist facilities",
    ]) {
      expect(byronValues).not.toContain(forbidden);
    }
  });

  it("extracts Kempsey LEP 2013 E2 objectives and land-use entries from the real parser output", () => {
    const e2 = extractRegisteredZone("data/nsw/xml/Kempsey-lep-2013.xml", "E2");

    expect(e2).toBeDefined();
    expect(e2?.heading).toBe("Zone E2 Commercial Centre");
    expect(e2?.objectives).toEqual([
      "To strengthen the role of the commercial centre as the centre of business, retail, community and cultural activity.",
      "To encourage investment in commercial development that generates employment opportunities and economic growth.",
      "To encourage development that has a high level of accessibility and amenity, particularly for pedestrians.",
      "To enable residential development only if it is consistent with the Council’s strategic planning for residential development in the area.",
      "To ensure that new development provides diverse and active street frontages to attract pedestrian traffic and to contribute to vibrant, diverse and functional streets and public spaces.",
      "To provide for residential uses, but only as part of mixed use development.",
    ]);
    expect(e2?.landUse.withoutConsent).toEqual(["Environmental protection works", "Home-based child care"]);
    expect(e2?.landUse.withConsent).toEqual(
      expect.arrayContaining([
        "Centre-based child care facilities",
        "Tank-based aquaculture",
        "Any other development not specified in item 2 or 4",
      ]),
    );
    expect(e2?.landUse.prohibited).toEqual(expect.arrayContaining(["Eco-tourist facilities"]));
    const kempseyValues = [
      ...(e2?.objectives ?? []),
      ...(e2?.landUse.withoutConsent ?? []),
      ...(e2?.landUse.withConsent ?? []),
      ...(e2?.landUse.prohibited ?? []),
    ];
    for (const forbidden of [
      "2",
      "3",
      "4",
      "Home",
      "based child care",
      "Centre",
      "based child care facilities",
      "Tank",
      "based aquaculture",
      "Eco",
      "tourist facilities",
    ]) {
      expect(kempseyValues).not.toContain(forbidden);
    }
  });
});
