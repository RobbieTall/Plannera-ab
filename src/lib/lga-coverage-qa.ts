import { LgaCoverageMaturity } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type QaCheckResult = {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
  clauseCount: number;
  instrumentSlugsChecked: string[];
};

type QaCheck = QaCheckResult["checks"][number];

type ClauseRecord = {
  title: string | null;
  bodyText: string;
};

type LgaCoverageStateRecord = {
  state: LgaCoverageMaturity;
} | null;

type PrismaLike = {
  lgaCoverageState: {
    findUnique: (args: unknown) => Promise<LgaCoverageStateRecord>;
    upsert?: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  clause: {
    count: (args: unknown) => Promise<number>;
    findMany: (args: unknown) => Promise<ClauseRecord[]>;
  };
};

type QaDeps = {
  prisma?: PrismaLike;
  resolveApplicableInstrumentSlugsForLga?: (lgaCode: string) => string[] | Promise<string[]>;
};

const getPrisma = (deps?: QaDeps): PrismaLike => (deps?.prisma ?? prisma) as PrismaLike;

const resolveInstrumentSlugs = async (lgaCode: string, deps?: QaDeps): Promise<string[]> => {
  if (deps?.resolveApplicableInstrumentSlugsForLga) {
    return deps.resolveApplicableInstrumentSlugsForLga(lgaCode);
  }

  const { resolveApplicableInstrumentSlugsForLga } = await import("@/lib/lga-worker");
  return resolveApplicableInstrumentSlugsForLga(lgaCode);
};

const buildCheck = (name: string, passed: boolean, detail: string): QaCheck => ({ name, passed, detail });

const containsAny = (clause: ClauseRecord, terms: string[]) => {
  const haystack = `${clause.title ?? ""} ${clause.bodyText ?? ""}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
};

const getClauseMetrics = async (lgaCode: string, deps?: QaDeps) => {
  const db = getPrisma(deps);
  const instrumentSlugs = await resolveInstrumentSlugs(lgaCode, deps);
  const baseWhere = {
    isCurrent: true,
    instrument: { slug: { in: instrumentSlugs } },
  };
  const lepWhere = {
    ...baseWhere,
    instrument: { slug: { in: instrumentSlugs }, instrumentType: "LEP" },
  };

  const [clauseCount, lepClauseCount, clauses] = await Promise.all([
    instrumentSlugs.length ? db.clause.count({ where: baseWhere }) : Promise.resolve(0),
    instrumentSlugs.length ? db.clause.count({ where: lepWhere }) : Promise.resolve(0),
    instrumentSlugs.length
      ? db.clause.findMany({
          where: baseWhere,
          select: { title: true, bodyText: true },
        })
      : Promise.resolve([]),
  ]);

  return { instrumentSlugs, clauseCount, lepClauseCount, clauses };
};

const buildSearchableReadyResult = (instrumentSlugs: string[], clauseCount: number, lepClauseCount: number): QaCheckResult => {
  const checks = [
    buildCheck(
      "has_any_clause_for_lga_instruments",
      clauseCount >= 1,
      clauseCount >= 1
        ? `Found ${clauseCount} current clause(s) for applicable instruments.`
        : "No current clauses found for applicable instruments.",
    ),
    buildCheck(
      "has_lep_clause",
      lepClauseCount >= 1,
      lepClauseCount >= 1 ? `Found ${lepClauseCount} current LEP clause(s).` : "No current LEP clauses found.",
    ),
    buildCheck(
      "clause_count_at_least_10",
      clauseCount >= 10,
      clauseCount >= 10 ? `Found ${clauseCount} current clause(s).` : `Found ${clauseCount}; expected at least 10.`,
    ),
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    clauseCount,
    instrumentSlugsChecked: instrumentSlugs,
  };
};

export async function runSearchableReadyChecks(lgaCode: string, deps?: QaDeps): Promise<QaCheckResult> {
  const { instrumentSlugs, clauseCount, lepClauseCount } = await getClauseMetrics(lgaCode, deps);
  return buildSearchableReadyResult(instrumentSlugs, clauseCount, lepClauseCount);
}

export async function runStructuredPartialChecks(lgaCode: string, deps?: QaDeps): Promise<QaCheckResult> {
  return runSearchableReadyChecks(lgaCode, deps);
}

export async function runVerifiedChecks(lgaCode: string, deps?: QaDeps): Promise<QaCheckResult> {
  const { instrumentSlugs, clauseCount, lepClauseCount, clauses } = await getClauseMetrics(lgaCode, deps);
  const searchableResult = buildSearchableReadyResult(instrumentSlugs, clauseCount, lepClauseCount);
  const hasZoningClause = clauses.some((clause) => containsAny(clause, ["permiss", "land use", "zone"]));
  const hasHeightOrFsrClause = clauses.some((clause) => containsAny(clause, ["height", "fsr", "floor space"]));

  const checks = [
    ...searchableResult.checks,
    buildCheck(
      "has_zoning_or_permissibility_clause",
      hasZoningClause,
      hasZoningClause
        ? "Found at least one clause mentioning permissibility, land use, or zoning."
        : "No clause title or snippet mentions permissibility, land use, or zoning.",
    ),
    buildCheck(
      "has_height_or_fsr_clause",
      hasHeightOrFsrClause,
      hasHeightOrFsrClause
        ? "Found at least one clause mentioning height, FSR, or floor space."
        : "No clause title or snippet mentions height, FSR, or floor space.",
    ),
    buildCheck(
      "clause_count_at_least_50",
      searchableResult.clauseCount >= 50,
      searchableResult.clauseCount >= 50
        ? `Found ${searchableResult.clauseCount} current clause(s).`
        : `Found ${searchableResult.clauseCount}; expected at least 50.`,
    ),
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    clauseCount: searchableResult.clauseCount,
    instrumentSlugsChecked: searchableResult.instrumentSlugsChecked,
  };
}

const getPromotionTarget = (state: LgaCoverageMaturity) => {
  if (state === LgaCoverageMaturity.SEARCHABLE_READY) return LgaCoverageMaturity.STRUCTURED_PARTIAL;
  if (state === LgaCoverageMaturity.STRUCTURED_PARTIAL) return LgaCoverageMaturity.VERIFIED;
  return state;
};

const getChecksForState = async (state: LgaCoverageMaturity, lgaCode: string, deps?: QaDeps) => {
  if (state === LgaCoverageMaturity.SEARCHABLE_READY) return runStructuredPartialChecks(lgaCode, deps);
  if (state === LgaCoverageMaturity.STRUCTURED_PARTIAL) return runVerifiedChecks(lgaCode, deps);
  if (state === LgaCoverageMaturity.VERIFIED) return runVerifiedChecks(lgaCode, deps);
  return runSearchableReadyChecks(lgaCode, deps);
};

const formatFailedCheckMessage = (checks: QaCheck[]) => {
  const failedNames = checks.filter((check) => !check.passed).map((check) => check.name);
  return `Coverage QA failed checks: ${failedNames.join(", ")}`;
};

export async function promoteMaturity(
  lgaCode: string,
  deps?: QaDeps,
): Promise<{ from: LgaCoverageMaturity; to: LgaCoverageMaturity; result: QaCheckResult }> {
  const db = getPrisma(deps);
  const coverage = await db.lgaCoverageState.findUnique({
    where: { lgaCode },
    select: { state: true },
  });
  const from = coverage?.state ?? LgaCoverageMaturity.NOT_STARTED;
  const target = getPromotionTarget(from);
  const result = await getChecksForState(from, lgaCode, deps);
  const to = target === from ? from : result.passed ? target : LgaCoverageMaturity.FAILED_REVIEW_NEEDED;

  if (!coverage && db.lgaCoverageState.upsert) {
    await db.lgaCoverageState.upsert({
      where: { lgaCode },
      update: { state: to, errorMessage: result.passed ? null : formatFailedCheckMessage(result.checks) },
      create: { lgaCode, state: to, errorMessage: result.passed ? null : formatFailedCheckMessage(result.checks) },
    });
  } else if (coverage) {
    await db.lgaCoverageState.update({
      where: { lgaCode },
      data: { state: to, errorMessage: result.passed ? null : formatFailedCheckMessage(result.checks) },
    });
  }

  return { from, to, result };
}

export async function runChecksForCurrentState(lgaCode: string, deps?: QaDeps) {
  const db = getPrisma(deps);
  const coverage = await db.lgaCoverageState.findUnique({
    where: { lgaCode },
    select: { state: true },
  });
  const currentState = coverage?.state ?? LgaCoverageMaturity.NOT_STARTED;
  const qaResult = await getChecksForState(currentState, lgaCode, deps);
  return { currentState, qaResult };
}
