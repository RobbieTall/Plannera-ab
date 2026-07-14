import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isAuthorizedMock,
  readFileSyncMock,
  buildLepConfigFromFileSyncMock,
  findLocalNswLepsByLgaMock,
  listLocalNswLepPreparationsMock,
  findLocalNswLepBySlugMock,
  resolveCanonicalNswLgaMock,
  parseInstrumentDocumentMock,
  parseNswLepXmlMock,
  refreshLepZoneTablesMock,
  syncInstrumentFromDocumentMock,
  instrumentFindUniqueMock,
  instrumentFindManyMock,
  projectFindManyMock,
  projectUpdateMock,
  lepZoneObjectiveCountMock,
  lepZoneLandUseCountMock,
  lepZoneObjectiveFindManyMock,
  lepZoneLandUseFindManyMock,
  clauseCountMock,
} = vi.hoisted(() => ({
  isAuthorizedMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  buildLepConfigFromFileSyncMock: vi.fn(),
  findLocalNswLepsByLgaMock: vi.fn(),
  listLocalNswLepPreparationsMock: vi.fn(),
  findLocalNswLepBySlugMock: vi.fn(),
  resolveCanonicalNswLgaMock: vi.fn(),
  parseInstrumentDocumentMock: vi.fn(),
  parseNswLepXmlMock: vi.fn(),
  refreshLepZoneTablesMock: vi.fn(),
  syncInstrumentFromDocumentMock: vi.fn(),
  instrumentFindUniqueMock: vi.fn(),
  instrumentFindManyMock: vi.fn(),
  projectFindManyMock: vi.fn(),
  projectUpdateMock: vi.fn(),
  lepZoneObjectiveCountMock: vi.fn(),
  lepZoneLandUseCountMock: vi.fn(),
  lepZoneObjectiveFindManyMock: vi.fn(),
  lepZoneLandUseFindManyMock: vi.fn(),
  clauseCountMock: vi.fn(),
}));

vi.mock("fs", () => ({ default: { readFileSync: readFileSyncMock } }));
vi.mock("@/lib/admin-auth", () => ({ isAuthorized: isAuthorizedMock }));
vi.mock("@/lib/lep/lep-ingest-files", () => ({ buildLepConfigFromFileSync: buildLepConfigFromFileSyncMock }));
vi.mock("@/lib/lep/nsw-lep-registry", () => ({
  findLocalNswLepBySlug: findLocalNswLepBySlugMock,
  findLocalNswLepsByLga: findLocalNswLepsByLgaMock,
  listLocalNswLepPreparations: listLocalNswLepPreparationsMock,
}));
vi.mock("@/lib/lep/nsw-lga-normaliser", () => ({ resolveCanonicalNswLga: resolveCanonicalNswLgaMock }));
vi.mock("@/lib/legislation/parser", () => ({ parseInstrumentDocument: parseInstrumentDocumentMock }));
vi.mock("@/lib/lep/nsw-lep-parser", () => ({ parseNswLepXml: parseNswLepXmlMock }));
vi.mock("@/lib/lep/zone-table-extractor", () => ({ refreshLepZoneTables: refreshLepZoneTablesMock }));
vi.mock("@/lib/legislation/service", () => ({ syncInstrumentFromDocument: syncInstrumentFromDocumentMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    instrument: { findUnique: instrumentFindUniqueMock, findMany: instrumentFindManyMock },
    project: { findMany: projectFindManyMock, update: projectUpdateMock },
    lepZoneObjective: { count: lepZoneObjectiveCountMock, findMany: lepZoneObjectiveFindManyMock },
    lepZoneLandUse: { count: lepZoneLandUseCountMock, findMany: lepZoneLandUseFindManyMock },
    clause: { count: clauseCountMock },
  },
}));

import { POST } from "@/app/api/admin/ingest-lep/route";

const target = {
  config: { slug: "kempsey-lep-2013", xmlLocalPath: "data/nsw/xml/Kempsey-lep-2013.xml" },
  details: { canonicalLga: "KEMPSEY", lgaCode: "KEMPSEY", lgaName: "Kempsey Shire" },
};

describe("POST /api/admin/ingest-lep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
    isAuthorizedMock.mockReturnValue(true);
    resolveCanonicalNswLgaMock.mockReturnValue("KEMPSEY");
    findLocalNswLepsByLgaMock.mockReturnValue([target]);
    findLocalNswLepBySlugMock.mockReturnValue(null);
    listLocalNswLepPreparationsMock.mockReturnValue([target]);
    readFileSyncMock.mockReturnValue("<LEP>xml</LEP>");
    buildLepConfigFromFileSyncMock.mockReturnValue({ config: { slug: "kempsey-lep-2013" } });
    parseInstrumentDocumentMock.mockReturnValue([{ clauseKey: "2.3", title: "Zone E2 Commercial Centre", bodyText: "E2 land uses" }]);
    parseNswLepXmlMock.mockReturnValue({ zones: [] });
    instrumentFindManyMock.mockResolvedValue([]);
    projectFindManyMock.mockResolvedValue([]);
    projectUpdateMock.mockResolvedValue({});
    clauseCountMock.mockResolvedValue(103);
    lepZoneObjectiveFindManyMock.mockResolvedValue([{ zoneCode: "E2" }]);
    lepZoneLandUseFindManyMock.mockResolvedValue([{ zoneCode: "E2" }, { zoneCode: "SP3" }]);
  });

  it("refreshes zone projections idempotently when an existing clause corpus is posted without force", async () => {
    instrumentFindUniqueMock
      .mockResolvedValueOnce({ _count: { clauses: 103 } })
      .mockResolvedValueOnce({ id: "instrument-kempsey" });
    refreshLepZoneTablesMock.mockResolvedValue(3);
    lepZoneObjectiveCountMock.mockResolvedValue(6);
    lepZoneLandUseCountMock.mockResolvedValue(42);

    const response = await POST(new Request("http://localhost/api/admin/ingest-lep?secret=test&lga=KEMPSEY", { method: "POST" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(syncInstrumentFromDocumentMock).not.toHaveBeenCalled();
    expect(refreshLepZoneTablesMock).toHaveBeenCalledWith(expect.anything(), "instrument-kempsey", [
      { clauseKey: "2.3", title: "Zone E2 Commercial Centre", bodyText: "E2 land uses" },
    ]);
    expect(payload.skipped).toEqual(["kempsey-lep-2013"]);
    expect(payload.totalClauses).toBe(103);
    expect(payload.zoneProjectionRefreshes).toEqual([
      {
        slug: "kempsey-lep-2013",
        objectiveCount: 6,
        landUseCount: 42,
        zoneCount: 3,
        zoneCodes: ["E2", "SP3"],
        source: "existing",
      },
    ]);
  });
});
