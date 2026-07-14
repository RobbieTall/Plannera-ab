import fs from "fs";
import { describe, expect, it } from "vitest";

import { buildLepConfigFromFileSync } from "@/lib/lep/lep-ingest-files";
import { parseInstrumentDocument } from "@/lib/legislation/parser";

import { toZoneCode } from "./zone-utils";
import { extractZoneTables } from "./zone-table-extractor";

const extractRegisteredZone = (xmlPath: string, zoneCode: string) => {
  const xml = fs.readFileSync(xmlPath, "utf-8");
  const { config } = buildLepConfigFromFileSync(xmlPath, { xml });
  const clauses = parseInstrumentDocument(config, xml, "xml");
  const tables = extractZoneTables(clauses);
  return tables.find((table) => table.zoneCode === zoneCode);
};

describe("extractZoneTables real registered NSW LEP XML", () => {
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
    expect(sp3?.objectives.length).toBeGreaterThan(0);
    expect(sp3?.landUse.withConsent.length).toBeGreaterThan(0);
    expect(sp3?.landUse.prohibited.length).toBeGreaterThan(0);
  });

  it("extracts Kempsey LEP 2013 E2 objectives and land-use entries from the real parser output", () => {
    const e2 = extractRegisteredZone("data/nsw/xml/Kempsey-lep-2013.xml", "E2");

    expect(e2).toBeDefined();
    expect(e2?.heading).toBe("Zone E2 Commercial Centre");
    expect(e2?.objectives.length).toBeGreaterThan(0);
    expect(e2?.landUse.withConsent.length).toBeGreaterThan(0);
    expect(e2?.landUse.prohibited.length).toBeGreaterThan(0);
  });
});
