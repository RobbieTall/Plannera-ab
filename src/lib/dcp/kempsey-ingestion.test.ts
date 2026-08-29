import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  pdfParseMock,
  prismaMock,
  transactionMock,
} = vi.hoisted(() => {
  const transaction = {
    councilDocument: {
      upsert: vi.fn(),
    },
    workspaceSourceChunk: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    dCPClause: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    lgaCoverageState: {
      upsert: vi.fn(),
    },
  };

  return {
    fetchMock: vi.fn(),
    pdfParseMock: vi.fn(),
    prismaMock: {
      $transaction: vi.fn(),
    },
    transactionMock: transaction,
  };
});

vi.mock("pdf-parse", () => ({ default: pdfParseMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@prisma/client", () => ({
  LgaCoverageMaturity: {
    SEARCHABLE_READY: "SEARCHABLE_READY",
  },
  WorkspaceSourceType: {
    council_dcp: "council_dcp",
    dcp: "dcp",
  },
}));

import {
  KEMPSEY_DCP_2026_PARTS,
  ingestKempseyDcp,
} from "./kempsey-ingestion";

const pdfBytes = new TextEncoder().encode("%PDF-1.4 test fixture").buffer;
const substantiveText =
  "1.1 Purpose\n\n" +
  "This section sets current planning controls for development assessment in Kempsey Shire. ".repeat(
    5,
  );

const successfulPdfResponse = () => ({
  ok: true,
  status: 200,
  arrayBuffer: vi.fn().mockResolvedValue(pdfBytes),
});

describe("ingestKempseyDcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockImplementation(async () => successfulPdfResponse());
    pdfParseMock.mockResolvedValue({ text: substantiveText });
    transactionMock.councilDocument.upsert.mockResolvedValue({
      id: "kempsey-dcp-document",
    });
    transactionMock.dCPClause.deleteMany.mockResolvedValue({ count: 893 });
    transactionMock.dCPClause.createMany.mockResolvedValue({ count: 5 });
    transactionMock.workspaceSourceChunk.deleteMany.mockResolvedValue({
      count: 1,
    });
    transactionMock.workspaceSourceChunk.createMany.mockResolvedValue({
      count: 5,
    });
    transactionMock.lgaCoverageState.upsert.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof transactionMock) => unknown) =>
        callback(transactionMock),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replaces the active corpus only after all five current council parts parse", async () => {
    const result = await ingestKempseyDcp(prismaMock as never);

    expect(KEMPSEY_DCP_2026_PARTS.map((part) => part.title)).toEqual([
      "Part A - Explanation",
      "Part B - Shire-wide requirements",
      "Part C - Place-based requirements",
      "Part D - Development requirements",
      "Part E - Appendices",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(pdfParseMock).toHaveBeenCalledTimes(5);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { maxWait: 10_000, timeout: 60_000 },
    );

    expect(transactionMock.dCPClause.deleteMany).toHaveBeenCalledWith({
      where: { lgaCode: "KEMPSEY" },
    });
    expect(transactionMock.workspaceSourceChunk.deleteMany).toHaveBeenCalledWith({
      where: {
        lgaCode: "KEMPSEY",
        sourceType: { in: ["council_dcp", "dcp"] },
      },
    });

    const dcpRows =
      transactionMock.dCPClause.createMany.mock.calls[0]?.[0]?.data ?? [];
    expect(dcpRows).toHaveLength(5);
    expect(dcpRows.every((row: { instrumentSlug: string }) =>
      row.instrumentSlug === "kempsey-dcp-2026",
    )).toBe(true);

    const sourceRows =
      transactionMock.workspaceSourceChunk.createMany.mock.calls[0]?.[0]?.data ??
      [];
    expect(sourceRows).toHaveLength(5);
    expect(sourceRows.every((row: { sourceType: string }) =>
      row.sourceType === "council_dcp",
    )).toBe(true);

    expect(transactionMock.councilDocument.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lgaCode: "KEMPSEY" },
        update: expect.objectContaining({
          title: "Kempsey Development Control Plan 2026",
          sourceUrl:
            "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan",
        }),
      }),
    );
    expect(transactionMock.lgaCoverageState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lgaCode: "KEMPSEY" },
        update: expect.objectContaining({ state: "SEARCHABLE_READY" }),
        create: expect.objectContaining({ state: "SEARCHABLE_READY" }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      status: "ok",
      lga: "KEMPSEY",
      source: "kempsey-dcp-2026",
      partsIngested: 5,
      totalChunks: 5,
    });
  });

  it("does not open a database transaction when any current part fails", async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      if (String(input).includes("part-c-place-based-requirements")) {
        return {
          ok: false,
          status: 503,
          arrayBuffer: vi.fn(),
        };
      }
      return successfulPdfResponse();
    });

    await expect(
      ingestKempseyDcp(prismaMock as never),
    ).rejects.toThrow(
      "Kempsey DCP 2026 ingestion stopped at Part C - Place-based requirements: HTTP 503",
    );

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(transactionMock.dCPClause.deleteMany).not.toHaveBeenCalled();
    expect(transactionMock.workspaceSourceChunk.deleteMany).not.toHaveBeenCalled();
    expect(transactionMock.lgaCoverageState.upsert).not.toHaveBeenCalled();
  });
});
