import { afterEach, describe, expect, it, vi } from "vitest";

import { getMappedPlanningControlsForSite } from "@/lib/nsw-planning-controls";

const response = (features: Array<{ attributes: Record<string, unknown> }>) =>
  ({ ok: true, json: async () => ({ features }) }) as Response;

describe("getMappedPlanningControlsForSite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns property-specific Byron LEP map controls with citations", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const layerId = url.pathname.split("/").at(-2);
      const wrongInstrument = {
        attributes: {
          EPI_NAME: "A different LEP",
          LGA_NAME: "OTHER",
          EPI_TYPE: "LEP",
          FSR: 9,
          LOT_SIZE: 9,
          MAX_B_H: 99,
        },
      };
      const common = {
        EPI_NAME: "Byron Local Environmental Plan 2014",
        LGA_NAME: "BYRON",
        EPI_TYPE: "LEP",
      };
      if (layerId === "1") {
        return response([wrongInstrument, { attributes: { ...common, MAP_NAME: "Floor Space Ratio Map", FSR: 0.3, LEGIS_REF_CLAUSE: "Clause 4.4" } }]);
      }
      if (layerId === "4") {
        return response([{ attributes: { ...common, MAP_NAME: "Lot Size Map", LOT_SIZE: 40, UNITS: "ha", LEGIS_REF_CLAUSE: "Clause 4.1" } }]);
      }
      return response([{ attributes: { ...common, MAP_NAME: "Height of Buildings Map", MAX_B_H_M: 9, UNITS: "m", LEGIS_REF_CLAUSE: "Clause 4.3" } }]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const controls = await getMappedPlanningControlsForSite({
      coords: { lat: -28.6751352, lng: 153.6124394 },
      instrumentName: "Byron LEP 2014",
      lga: "Byron Shire Council",
      serviceUrl: "https://example.test/MapServer",
    });

    expect(controls.heightOfBuilding).toMatchObject({ value: "9m", clauseRef: "4.3", confidence: "Cited" });
    expect(controls.fsr).toMatchObject({ value: "0.3:1", clauseRef: "4.4", confidence: "Cited" });
    expect(controls.minLotSize).toMatchObject({ value: "40 ha", clauseRef: "4.1", confidence: "Cited" });
    expect(controls.heightOfBuilding?.sourceRef).toContain("Byron Local Environmental Plan 2014");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("fails closed when coordinates are unavailable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMappedPlanningControlsForSite({ coords: null })).resolves.toEqual({
      heightOfBuilding: null,
      fsr: null,
      minLotSize: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
