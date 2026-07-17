import { describe, expect, it } from "vitest";

import { isArtefactCurrentForSite } from "./site-scoped-artefacts";

describe("site-scoped artefact matching", () => {
  it("does not count Kempsey artefacts as current for a Byron site", () => {
    expect(
      isArtefactCurrentForSite(
        {
          address: "12 Browning St, Byron Bay NSW 2481, Australia",
          lgaName: "Byron Shire",
          lgaCode: "BYRON",
          zoneLabel: "Zone R2 Low Density Residential",
          zoneCode: "R2",
        },
        {
          address: "52 Belgrave St, Kempsey NSW 2440",
          lga: "KEMPSEY",
          zoneLabel: "Zone E2 Commercial Centre",
          zoneCode: "E2",
        },
      ),
    ).toBe(false);
  });

  it("does not count Byron artefacts as current for a Kempsey site", () => {
    expect(
      isArtefactCurrentForSite(
        {
          address: "52 Belgrave St, Kempsey NSW 2440",
          lgaName: "Kempsey Shire",
          lgaCode: "KEMPSEY",
          zoneLabel: "Zone E2 Commercial Centre",
          zoneCode: "E2",
        },
        {
          address: "45 Broken Head Road, Byron Bay NSW 2481",
          lga: "BYRON",
          zoneLabel: "Zone R2 Low Density Residential",
          zoneCode: "R2",
        },
      ),
    ).toBe(false);
  });

  it("allows same-address artefacts with equivalent LGA and zone labels", () => {
    expect(
      isArtefactCurrentForSite(
        {
          address: "52 Belgrave Street, Kempsey NSW 2440, Australia",
          lgaName: "Kempsey Shire",
          lgaCode: "KEMPSEY",
          zoneLabel: "E2 Commercial Centre",
          zoneCode: "E2",
        },
        {
          address: "52 Belgrave St Kempsey NSW 2440",
          lga: "KEMPSEY",
          zoneLabel: "Zone E2",
          zoneCode: "E2",
        },
      ),
    ).toBe(true);
  });
});
