import assert from "node:assert/strict";
import test from "node:test";

import { parseNswLepXml } from "@/lib/lep/nsw-lep-parser";

test("parses NSW LEP XML land use tables", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <LEP>
      <EPI_NAME>Byron Local Environmental Plan 2014</EPI_NAME>
      <EPI_TYPE>LEP</EPI_TYPE>
      <LGA_NAME>Byron Shire Council</LGA_NAME>
      <LAND_USE_TABLE>
        <ZONE>
          <ZONE_CODE>RU1</ZONE_CODE>
          <ZONE_NAME>Primary Production</ZONE_NAME>
          <WITHOUT_CONSENT>
            <LAND_USE>Environmental protection works</LAND_USE>
          </WITHOUT_CONSENT>
          <WITH_CONSENT>
            <LAND_USE>Dwelling houses</LAND_USE>
            <LAND_USE>Secondary dwellings</LAND_USE>
          </WITH_CONSENT>
          <PROHIBITED>
            <LAND_USE>Caravan parks</LAND_USE>
            <LAND_USE>Multi dwelling housing</LAND_USE>
          </PROHIBITED>
        </ZONE>
        <ZONE>
          <ZONE_NAME>R2 Low Density Residential</ZONE_NAME>
          <WITH_CONSENT>
            <LAND_USE>Boarding houses</LAND_USE>
          </WITH_CONSENT>
          <PROHIBITED>
            <LAND_USE>Heavy industrial storage establishment</LAND_USE>
          </PROHIBITED>
        </ZONE>
      </LAND_USE_TABLE>
    </LEP>`;

  const result = parseNswLepXml(xml);

  assert.equal(result.metadata.lgaName, "Byron Shire Council");
  assert.equal(result.metadata.instrumentName, "Byron Local Environmental Plan 2014");
  assert.equal(result.metadata.instrumentType, "LEP");
  assert.equal(result.zones.length, 2);

  const ru1 = result.zones.find((zone) => zone.zoneCode === "RU1");
  assert.ok(ru1, "RU1 zone should be present");
  assert.equal(ru1?.zoneName, "Primary Production");
  assert.deepEqual(ru1?.permittedWithoutConsent, ["Environmental protection works"]);
  assert.deepEqual(ru1?.permittedWithConsent, ["Dwelling houses", "Secondary dwellings"]);
  assert.deepEqual(ru1?.prohibited, ["Caravan parks", "Multi dwelling housing"]);

  const r2 = result.zones.find((zone) => zone.zoneCode === "R2");
  assert.ok(r2, "R2 zone should be present");
  assert.equal(r2?.zoneName, "Low Density Residential");
  assert.deepEqual(r2?.permittedWithoutConsent, []);
  assert.deepEqual(r2?.permittedWithConsent, ["Boarding houses"]);
  assert.deepEqual(r2?.prohibited, ["Heavy industrial storage establishment"]);
});
