import { prisma } from "@/lib/prisma";
import type { ConsultantReferralStatus } from "@/types/consultant-referral";

export class ConsultantReturnedReportBindingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ReferralEvent = {
  toStatus: ConsultantReferralStatus;
};

type ReferralRecord = {
  id: string;
  projectId: string;
  scopeKey: string;
  packageDigest: string;
  packageSnapshot: unknown;
  status: ConsultantReferralStatus;
  events: ReferralEvent[];
};

type BindingRecord = {
  id: string;
  referralId: string;
  projectId: string;
  evidenceRef: string;
  disciplineId: string;
  contentHash: string;
  referralScopeKey: string;
  packageDigest: string;
  receivedAt: Date;
  evidencePackageBoundAt: Date | null;
};

type BindingPrisma = {
  consultantReferral: {
    findFirst(args: unknown): Promise<ReferralRecord | null>;
  };
  consultantReturnedReportBinding: {
    findFirst(args: unknown): Promise<BindingRecord | null>;
    create(args: unknown): Promise<BindingRecord>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

export type ConsultantReturnedReportBindingDependencies = {
  prisma: BindingPrisma;
};

const defaultDependencies = (): ConsultantReturnedReportBindingDependencies => ({
  prisma: prisma as unknown as BindingPrisma,
});

const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DISCIPLINE_ID = /^[a-z0-9_]{2,80}$/;
const DELIVERED_EVENT_STATES = new Set<ConsultantReferralStatus>([
  "ASSIGNED",
  "CONSULTANT_ACKNOWLEDGED",
]);

const requestedDisciplineIds = (snapshot: unknown): string[] => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  const reviewRequest = (snapshot as Record<string, unknown>).reviewRequest;
  if (!reviewRequest || typeof reviewRequest !== "object" || Array.isArray(reviewRequest)) return [];
  const packages = (reviewRequest as Record<string, unknown>).disciplinePackages;
  if (!Array.isArray(packages)) return [];

  return Array.from(new Set(
    packages.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const disciplineId = (entry as Record<string, unknown>).disciplineId;
      return typeof disciplineId === "string" && DISCIPLINE_ID.test(disciplineId)
        ? [disciplineId]
        : [];
    }),
  ));
};

export type CreateConsultantReturnedReportBindingInput = {
  referralId: string;
  evidenceRef: string;
  disciplineId: string;
  contentHash: string;
  receivedAt: Date;
};

export type ConsultantReturnedReportBindingSummary = {
  id: string;
  referralId: string;
  projectId: string;
  evidenceRef: string;
  disciplineId: string;
  contentHash: string;
  referralScopeKey: string;
  packageDigest: string;
  receivedAt: string;
  evidencePackageBoundAt: string | null;
};

const toSummary = (row: BindingRecord): ConsultantReturnedReportBindingSummary => ({
  id: row.id,
  referralId: row.referralId,
  projectId: row.projectId,
  evidenceRef: row.evidenceRef,
  disciplineId: row.disciplineId,
  contentHash: row.contentHash,
  referralScopeKey: row.referralScopeKey,
  packageDigest: row.packageDigest,
  receivedAt: row.receivedAt.toISOString(),
  evidencePackageBoundAt: row.evidencePackageBoundAt?.toISOString() ?? null,
});

export async function createConsultantReturnedReportBinding(
  input: CreateConsultantReturnedReportBindingInput,
  deps = defaultDependencies(),
): Promise<{ binding: ConsultantReturnedReportBindingSummary; created: boolean }> {
  if (
    !OPAQUE_REF.test(input.referralId) ||
    !OPAQUE_REF.test(input.evidenceRef) ||
    !DISCIPLINE_ID.test(input.disciplineId) ||
    !SHA256.test(input.contentHash) ||
    !(input.receivedAt instanceof Date) ||
    !Number.isFinite(input.receivedAt.getTime())
  ) {
    throw new ConsultantReturnedReportBindingError("Invalid consultant returned-report binding");
  }

  const referral = await deps.prisma.consultantReferral.findFirst({
    where: { id: input.referralId },
    include: {
      events: {
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
        select: { toStatus: true },
      },
    },
  });
  if (!referral) {
    throw new ConsultantReturnedReportBindingError("Consultant referral not found", 404);
  }
  if (referral.status === "DECLINED" || referral.status === "CLOSED") {
    throw new ConsultantReturnedReportBindingError("Consultant referral is closed to returned reports", 409);
  }

  const delivered = referral.events.some((event) => DELIVERED_EVENT_STATES.has(event.toStatus));
  if (!delivered) {
    throw new ConsultantReturnedReportBindingError("Consultant referral has not been delivered", 409);
  }

  const disciplines = requestedDisciplineIds(referral.packageSnapshot);
  if (!disciplines.includes(input.disciplineId)) {
    throw new ConsultantReturnedReportBindingError("Returned report discipline was not requested by this referral", 409);
  }

  const existing = await deps.prisma.consultantReturnedReportBinding.findFirst({
    where: { evidenceRef: input.evidenceRef },
  });
  if (existing) {
    const exactReplay =
      existing.referralId === referral.id &&
      existing.projectId === referral.projectId &&
      existing.disciplineId === input.disciplineId &&
      existing.contentHash === input.contentHash &&
      existing.referralScopeKey === referral.scopeKey &&
      existing.packageDigest === referral.packageDigest;
    if (!exactReplay) {
      throw new ConsultantReturnedReportBindingError("Evidence reference is already bound to a different referral scope", 409);
    }
    return { binding: toSummary(existing), created: false };
  }

  try {
    const created = await deps.prisma.consultantReturnedReportBinding.create({
      data: {
        referralId: referral.id,
        projectId: referral.projectId,
        evidenceRef: input.evidenceRef,
        disciplineId: input.disciplineId,
        contentHash: input.contentHash,
        referralScopeKey: referral.scopeKey,
        packageDigest: referral.packageDigest,
        receivedAt: input.receivedAt,
      },
    });
    return { binding: toSummary(created), created: true };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : null;
    if (code !== "P2002") throw error;

    const raced = await deps.prisma.consultantReturnedReportBinding.findFirst({
      where: { evidenceRef: input.evidenceRef },
    });
    const exactReplay =
      raced &&
      raced.referralId === referral.id &&
      raced.projectId === referral.projectId &&
      raced.disciplineId === input.disciplineId &&
      raced.contentHash === input.contentHash &&
      raced.referralScopeKey === referral.scopeKey &&
      raced.packageDigest === referral.packageDigest;
    if (!raced || !exactReplay) {
      throw new ConsultantReturnedReportBindingError("Evidence reference is already bound to a different referral scope", 409);
    }
    return { binding: toSummary(raced), created: false };
  }
}

export async function markConsultantReturnedReportBoundForEvidencePackage(
  {
    referralId,
    evidenceRef,
    projectId,
    disciplineId,
    contentHash,
    boundAt,
  }: {
    referralId: string;
    evidenceRef: string;
    projectId: string;
    disciplineId: string;
    contentHash: string;
    boundAt: Date;
  },
  deps = defaultDependencies(),
): Promise<void> {
  if (!(boundAt instanceof Date) || !Number.isFinite(boundAt.getTime())) {
    throw new ConsultantReturnedReportBindingError("Invalid evidence-package binding timestamp");
  }

  const updated = await deps.prisma.consultantReturnedReportBinding.updateMany({
    where: {
      referralId,
      evidenceRef,
      projectId,
      disciplineId,
      contentHash,
      evidencePackageBoundAt: null,
    },
    data: { evidencePackageBoundAt: boundAt },
  });
  if (updated.count === 1) return;

  const existing = await deps.prisma.consultantReturnedReportBinding.findFirst({
    where: { evidenceRef },
  });
  if (
    existing &&
    existing.referralId === referralId &&
    existing.projectId === projectId &&
    existing.disciplineId === disciplineId &&
    existing.contentHash === contentHash &&
    existing.evidencePackageBoundAt
  ) {
    return;
  }

  throw new ConsultantReturnedReportBindingError("Returned report binding changed or was not found", 409);
}
