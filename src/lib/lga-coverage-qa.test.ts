import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  LgaCoverageMaturity: {
    NOT_STARTED: "NOT_STARTED",
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    SEARCHABLE_READY: "SEARCHABLE_READY",
    STRUCTURED_PARTIAL: "STRUCTURED_PARTIAL",
    VERIFIED: "VERIFIED",
    FAILED_REVIEW_NEEDED: "FAILED_REVIEW_NEEDED",
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  promoteMaturity,
  runSearchableReadyChecks,
  runStructuredPartialChecks,
  runVerifiedChecks,
} from "./lga-coverage-qa";

const makePrisma = () => ({
  lgaCoverageState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  clause: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
});

const makeDeps = (prisma: ReturnType<typeof makePrisma>) => ({
  prisma,
  resolveApplicableInstrumentSlugsForLga: vi.fn(() => ["kempsey-lep-2013"]),
});

const makeClauses = (count: number, extras: Array<{ title: string; bodyText: string }> = []) => [
  ...extras,
  ...Array.from({ length: Math.max(0, count - extras.length) }, (_, index) => ({
    title: `Clause ${index + 1}`,
    bodyText: "General planning control.",
  })),
];

describe("lga coverage QA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes searchable-ready and structured-partial checks at the 10-clause boundary", async () => {
    const prisma = makePrisma();
    prisma.clause.count.mockResolvedValue(10);
    prisma.clause.findMany.mockResolvedValue(makeClauses(10));

    const searchable = await runSearchableReadyChecks("KEMPSEY", makeDeps(prisma));
    const structured = await runStructuredPartialChecks("KEMPSEY", makeDeps(prisma));

    expect(searchable).toMatchObject({ passed: true, clauseCount: 10, instrumentSlugsChecked: ["kempsey-lep-2013"] });
    expect(structured).toMatchObject({ passed: true, clauseCount: 10 });
    expect(searchable.checks.find((check) => check.name === "clause_count_at_least_10")?.passed).toBe(true);
  });

  it("fails searchable-ready checks when too few clauses were ingested", async () => {
    const prisma = makePrisma();
    prisma.clause.count.mockResolvedValue(9);
    prisma.clause.findMany.mockResolvedValue(makeClauses(9));

    const result = await runSearchableReadyChecks("KEMPSEY", makeDeps(prisma));

    expect(result.passed).toBe(false);
    expect(result.clauseCount).toBe(9);
    expect(result.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "clause_count_at_least_10", passed: false })]),
    );
  });

  it("passes verified checks at the 50-clause boundary when zoning and height/FSR clauses are present", async () => {
    const prisma = makePrisma();
    prisma.clause.count.mockResolvedValue(50);
    prisma.clause.findMany.mockResolvedValue(
      makeClauses(50, [
        { title: "Land use table", bodyText: "Permissible uses in each zone." },
        { title: "Height of buildings", bodyText: "Maximum building height controls." },
      ]),
    );

    const result = await runVerifiedChecks("KEMPSEY", makeDeps(prisma));

    expect(result.passed).toBe(true);
    expect(result.checks.find((check) => check.name === "clause_count_at_least_50")?.passed).toBe(true);
    expect(result.checks.find((check) => check.name === "has_zoning_or_permissibility_clause")?.passed).toBe(true);
    expect(result.checks.find((check) => check.name === "has_height_or_fsr_clause")?.passed).toBe(true);
  });

  it("fails verified checks when zoning/permissibility coverage is missing", async () => {
    const prisma = makePrisma();
    prisma.clause.count.mockResolvedValue(50);
    prisma.clause.findMany.mockResolvedValue(
      makeClauses(50, [{ title: "Floor space ratio", bodyText: "FSR controls apply to mapped land." }]),
    );

    const result = await runVerifiedChecks("KEMPSEY", makeDeps(prisma));

    expect(result.passed).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "has_zoning_or_permissibility_clause", passed: false }),
        expect.objectContaining({ name: "has_height_or_fsr_clause", passed: true }),
      ]),
    );
  });

  it("promotes SEARCHABLE_READY to STRUCTURED_PARTIAL when all checks pass", async () => {
    const prisma = makePrisma();
    prisma.lgaCoverageState.findUnique.mockResolvedValue({ state: "SEARCHABLE_READY" });
    prisma.clause.count.mockResolvedValue(12);
    prisma.clause.findMany.mockResolvedValue(makeClauses(12));
    prisma.lgaCoverageState.update.mockResolvedValue({});

    const result = await promoteMaturity("KEMPSEY", makeDeps(prisma));

    expect(result).toMatchObject({ from: "SEARCHABLE_READY", to: "STRUCTURED_PARTIAL" });
    expect(prisma.lgaCoverageState.update).toHaveBeenCalledWith({
      where: { lgaCode: "KEMPSEY" },
      data: { state: "STRUCTURED_PARTIAL", errorMessage: null },
    });
  });

  it("moves SEARCHABLE_READY to FAILED_REVIEW_NEEDED and records failed check names", async () => {
    const prisma = makePrisma();
    prisma.lgaCoverageState.findUnique.mockResolvedValue({ state: "SEARCHABLE_READY" });
    prisma.clause.count.mockResolvedValue(2);
    prisma.clause.findMany.mockResolvedValue(makeClauses(2));
    prisma.lgaCoverageState.update.mockResolvedValue({});

    const result = await promoteMaturity("KEMPSEY", makeDeps(prisma));

    expect(result.to).toBe("FAILED_REVIEW_NEEDED");
    expect(prisma.lgaCoverageState.update).toHaveBeenCalledWith({
      where: { lgaCode: "KEMPSEY" },
      data: {
        state: "FAILED_REVIEW_NEEDED",
        errorMessage: "Coverage QA failed checks: clause_count_at_least_10",
      },
    });
  });
});
