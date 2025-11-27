import assert from "node:assert/strict";
import test from "node:test";

import { buildSiteContextMessage } from "@/lib/chat/site-context-message";
import { findLepZoneForZoningCode } from "@/lib/lep/lep-lookup";
import type { LepParseResult } from "@/lib/lep/types";
import type { SiteContextSummary } from "@/types/site";

const baseSiteContext: SiteContextSummary = {
  id: "site-1",
  projectId: "project-1",
  addressInput: "123 Sample St",
  formattedAddress: "123 Sample St, Byron Bay NSW",
  lgaName: "Byron Shire",
  lgaCode: "BYRON",
  parcelId: null,
  lot: null,
  planNumber: null,
  latitude: null,
  longitude: null,
  zone: "RU1",
  zoningCode: "RU1",
  zoningName: "Primary Production",
  zoningSource: "nsw-planning-portal",
  lepSummary: undefined,
  councilMap: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const sampleLepData: LepParseResult = {
  metadata: {
    lgaName: "Byron Shire",
    instrumentName: "Byron Local Environmental Plan 2014",
    instrumentType: "LEP",
  },
  zones: [
    {
      zoneCode: "RU1",
      zoneName: "Primary Production",
      zoneObjectives: ["To encourage sustainable primary industry"],
      permittedWithoutConsent: ["environmental protection works", "home occupations"],
      permittedWithConsent: ["dwelling houses", "horticulture", "intensive livestock agriculture"],
      prohibited: ["industry", "retail premises"],
    },
  ],
};

test("findLepZoneForZoningCode returns the matching zone context when available", () => {
  const context = findLepZoneForZoningCode({ lepData: sampleLepData, zoningCode: "ru1" });
  assert.equal(context?.zone.zoneName, "Primary Production");
  assert.equal(context?.metadata.instrumentName, "Byron Local Environmental Plan 2014");
});

test("findLepZoneForZoningCode returns null when the zone is missing", () => {
  const context = findLepZoneForZoningCode({ lepData: sampleLepData, zoningCode: "R2" });
  assert.equal(context, null);
});

test("buildSiteContextMessage includes LEP zone details when lepData matches the zone", () => {
  const message = buildSiteContextMessage(baseSiteContext, sampleLepData);
  assert.match(message ?? "", /Byron Local Environmental Plan 2014/);
  assert.match(message ?? "", /RU1 – Primary Production/);
  assert.match(message ?? "", /Zone objectives: To encourage sustainable primary industry/);
  assert.match(
    message ?? "",
    /Permitted without consent: environmental protection works, home occupations/,
  );
  assert.match(
    message ?? "",
    /Permitted with consent: dwelling houses, horticulture, intensive livestock agriculture/,
  );
  assert.match(message ?? "", /Prohibited: industry, retail premises/);
});
