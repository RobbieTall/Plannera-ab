import { createHash } from "crypto";
import { z } from "zod";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  DEV_BYPASS_USER_ID,
  currentScopeForProject,
  hasExactSeeEvidenceProvenance,
  parsePreSeePlanningMemoContent,
  resolveCurrentDetailedPlanningPackChain,
} from "@/lib/artefact-service";
import { buildConsultantNeedsMatrix, buildDisciplineReferralPackages } from "@/lib/consultant-needs";
import { normalizeProposalBriefForComparison } from "@/lib/detailed-planning-pack-selector";
import { prisma } from "@/lib/prisma";
import {
  detailedPlanningPackScope,
  isArtefactCurrentForSite,
  preSeeScope,
  reviewRequestScope,
} from "@/lib/site-scoped-artefacts";
import {
  consultantReferralStatuses,
  type ConsultantReferralStatus,
  type ConsultantReferralSummary,
} from "@/types/consultant-referral";
import type { ReviewRequestContent } from "@/types/workspace";

export const CONSULTANT_REFERRAL_CONSENT_VERSION = "consultant-referral-consent.v1";
export const CONSULTANT_REFERRAL_SNAPSHOT_VERSION = "consultant-referral-package.v1";
export const CONSULTANT_REFERRAL_QUEUE_TARGET = "plannera_human_queue" as const;
export const CONSULTANT_REFERRAL_CLOSED_RETENTION_DAYS = 180;

type ReferralEventRow = {
  fromStatus: ConsultantReferralStatus | null;
  toStatus: ConsultantReferralStatus;
  occurredAt: Date;
  reasonCode: string | null;
};

type ReferralRow = {
  id: string;
  projectId: string;
  reviewRequestArtefactId: string;
  contactName: string;
  contactEmail: string;
  contactFingerprint: string;
  consentVersion: string;
  consentedAt: Date;
  packageSnapshot: unknown;
  packageDigest: string;
  queueTarget: string;
  scopeKey: string;
  idempotencyKey: string;
  status: ConsultantReferralStatus;
  submittedAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  deleteAfter: Date | null;
  events?: ReferralEventRow[];
};

type ArtefactRow = {
  id: string;
  projectId: string;
  type: string;
  title: string;
  payload: unknown;
  capturedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  staleAt: Date | null;
};

type ProjectRow = {
  id: string;
  publicId: string | null;
  title: string;
  address: string | null;
  zoning: string | null;
  zoningCode: string | null;
  zoningName: string | null;
  createdById: string | null;
  userId: string | null;
  siteContext: {
    formattedAddress: string | null;
    lgaName: string | null;
    lgaCode: string | null;
    zone: string | null;
  } | null;
};

type ReferralPrisma = {
  project: {
    findFirst(args: unknown): Promise<ProjectRow | null>;
  };
  artefact: {
    findFirst(args: unknown): Promise<ArtefactRow | null>;
    findMany(args: unknown): Promise<ArtefactRow[]>;
  };
  consultantReferral: {
    findFirst(args: unknown): Promise<ReferralRow | null>;
    findMany(args: unknown): Promise<ReferralRow[]>;
    create(args: unknown): Promise<ReferralRow>;
    updateMany(args: unknown): Promise<{ count: number }>;
    delete(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<{ count: number }>;
  };
  consultantReferralEvent: {
    create(args: unknown): Promise<ReferralEventRow>;
  };
  $transaction<T>(callback: (client: ReferralPrisma) => Promise<T>): Promise<T>;
};

export type ConsultantReferralDependencies = {
  prisma: ReferralPrisma;
  now: () => Date;
};

const defaultDependencies = (): ConsultantReferralDependencies => ({
  prisma: prisma as unknown as ReferralPrisma,
  now: () => new Date(),
});

const evidenceSchema = z.object({
  type: z.enum(["LEP", "DCP", "PACK_GAP"]),
  ref: z.string().trim().min(1),
  excerpt: z.string().nullable().optional(),
});

const consultantNeedSchema = z.object({
  disciplineId: z.enum([
    "town_planning",
    "traffic_transport",
    "architecture_urban_design",
    "landscape_architecture",
    "registered_surveying",
    "bushfire",
    "flood_hydraulic",
    "ecology",
    "heritage",
    "contamination_geotechnical",
  ]),
  disciplineLabel: z.string().trim().min(1),
  status: z.enum(["Required", "Conditional", "Recommended", "Not identified from current evidence"]),
  reason: z.string().trim().min(1),
  evidence: z.array(evidenceSchema),
  questions: z.array(z.string()),
});

const disciplinePackageSchema = z.object({
  disciplineId: consultantNeedSchema.shape.disciplineId,
  disciplineLabel: z.string().trim().min(1),
  needStatus: z.enum(["Required", "Conditional", "Recommended"]),
  brief: z.string().trim().min(1),
  requestedScope: z.array(z.string()).min(1),
  questions: z.array(z.string()),
  evidence: z.array(evidenceSchema),
  limitations: z.array(z.string()).min(1),
});

const reviewRequestForSubmissionSchema = z.object({
  requestType: z.literal("expert_review_request"),
  generatedAt: z.string(),
  projectId: z.string().trim().min(1),
  site: z.object({
    address: z.string().nullable(),
    lga: z.string().nullable(),
    zoneLabel: z.string().nullable(),
  }),
  includedArtefacts: z.array(z.object({
    type: z.enum(["quick_site_check", "detailed_planning_pack", "pre_see_planning_memo"]),
    id: z.string().trim().min(1),
    title: z.string(),
    generatedAt: z.string().nullable(),
  })),
  citedSources: z.array(z.object({ ref: z.string(), type: z.enum(["LEP", "DCP"]) })),
  confidenceGaps: z.array(z.string()),
  missingInputs: z.array(z.string()),
  assumptions: z.array(z.string()),
  recommendedReviewScope: z.array(z.string()),
  detailedPlanningPack: z.object({
    artefactId: z.string().trim().min(1),
    proposalBrief: z.string().trim().min(1),
    commercialReady: z.boolean(),
    sourceQuickSiteCheckArtefactId: z.string().trim().min(1),
  }).passthrough(),
  sourceSeeMemo: z.object({
    artefactId: z.string().trim().min(1),
    sourceDetailedPlanningPackArtefactId: z.string().trim().min(1),
  }).passthrough().nullable().optional(),
  consultantNeedsVersion: z.literal("consultant-needs.v1"),
  consultantNeeds: z.array(consultantNeedSchema).min(1),
  disciplinePackages: z.array(disciplinePackageSchema).min(1),
}).passthrough();

const submissionSchema = z.object({
  reviewRequestArtefactId: z.string().trim().min(1),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  consent: z.literal(true, { error: "Explicit consent is required" }),
});

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
};

export const stableReferralJson = (value: unknown) => JSON.stringify(stableValue(value));

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export const resolveConsultantReferralSubmissionEnabled = (
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
) => env.CONSULTANT_REFERRALS_ENABLED === "true" &&
  env.CONSULTANT_REFERRAL_QUEUE_TARGET === CONSULTANT_REFERRAL_QUEUE_TARGET;

const toSummary = (row: ReferralRow): ConsultantReferralSummary => ({
  id: row.id,
  reviewRequestArtefactId: row.reviewRequestArtefactId,
  status: row.status,
  queueTarget: CONSULTANT_REFERRAL_QUEUE_TARGET,
  submittedAt: row.submittedAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  events: (row.events ?? []).map((event) => ({
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    occurredAt: event.occurredAt.toISOString(),
    reasonCode: event.reasonCode,
  })),
});

const assertProjectAccess = async (client: ReferralPrisma, projectId: string, userId: string) => {
  const normalized = projectId.trim();
  const access = userId === DEV_BYPASS_USER_ID
    ? {}
    : { OR: [{ createdById: userId }, { userId }, { collaborators: { some: { userId } } }] };
  const project = await client.project.findFirst({
    where: {
      AND: [
        { OR: [{ id: normalized }, { publicId: normalized }] },
        access,
      ],
    },
    include: { siteContext: true },
  });
  if (!project) throw new ArtefactAccessError("Project not found or access denied");
  if (!project.siteContext) throw new ArtefactValidationError("Set a confirmed site before submitting a consultant referral");
  return project;
};

const resolveSubmissionContext = async ({
  projectId,
  reviewRequestArtefactId,
  userId,
  client,
}: {
  projectId: string;
  reviewRequestArtefactId: string;
  userId: string;
  client: ReferralPrisma;
}) => {
  const project = await assertProjectAccess(client, projectId, userId);
  const evidenceProject = project as unknown as Parameters<typeof currentScopeForProject>[0];
  const reviewArtefact = await client.artefact.findFirst({
    where: {
      id: reviewRequestArtefactId,
      projectId: project.id,
      type: "review_request",
      staleAt: null,
    },
  });
  if (!reviewArtefact) throw new ArtefactValidationError("The saved expert review package was not found or is stale");

  const parsedReview = reviewRequestForSubmissionSchema.safeParse(reviewArtefact.payload);
  if (!parsedReview.success) {
    throw new ArtefactValidationError("Regenerate the expert review package before submission");
  }
  const review = parsedReview.data as ReviewRequestContent;
  if (review.projectId !== project.id || !isArtefactCurrentForSite(currentScopeForProject(evidenceProject), reviewRequestScope(review))) {
    throw new ArtefactValidationError("The expert review package no longer matches the current project site");
  }

  const chain = await resolveCurrentDetailedPlanningPackChain({
    prismaClient: client as unknown as Parameters<typeof resolveCurrentDetailedPlanningPackChain>[0]["prismaClient"],
    project: evidenceProject as Parameters<typeof resolveCurrentDetailedPlanningPackChain>[0]["project"],
  });
  if (!chain.active) throw new ArtefactValidationError("No current Planning Controls Pack with intact Quick Site Check provenance was found");
  const { artefact: dppArtefact, pack, quickSiteCheckArtefact, quickSiteCheck } = chain.active;
  const sourcePack = review.detailedPlanningPack;
  if (
    !sourcePack ||
    sourcePack.artefactId !== dppArtefact.id ||
    sourcePack.sourceQuickSiteCheckArtefactId !== quickSiteCheckArtefact.id ||
    sourcePack.commercialReady !== pack.commercialReady ||
    normalizeProposalBriefForComparison(sourcePack.proposalBrief) !== normalizeProposalBriefForComparison(pack.proposalBrief)
  ) {
    throw new ArtefactValidationError("The expert review package no longer matches the current site, proposal or Planning Controls Pack");
  }

  const includedIds = new Set(review.includedArtefacts.map((artefact) => artefact.id));
  if (!includedIds.has(dppArtefact.id) || !includedIds.has(quickSiteCheckArtefact.id)) {
    throw new ArtefactValidationError("The expert review package is missing its exact source artefacts");
  }

  if (review.sourceSeeMemo) {
    const seeArtefact = await client.artefact.findFirst({
      where: {
        id: review.sourceSeeMemo.artefactId,
        projectId: project.id,
        type: "pre_see_planning_memo",
        staleAt: null,
      },
    });
    const see = seeArtefact ? parsePreSeePlanningMemoContent(seeArtefact.payload) : null;
    if (
      !seeArtefact ||
      !see ||
      review.sourceSeeMemo.sourceDetailedPlanningPackArtefactId !== dppArtefact.id ||
      !includedIds.has(seeArtefact.id) ||
      !isArtefactCurrentForSite(currentScopeForProject(evidenceProject), preSeeScope(see)) ||
      !isArtefactCurrentForSite(detailedPlanningPackScope(pack), preSeeScope(see)) ||
      !hasExactSeeEvidenceProvenance(see, pack, quickSiteCheck)
    ) {
      throw new ArtefactValidationError("The expert review package contains a stale or mismatched SEE source");
    }
  }

  const expectedNeeds = buildConsultantNeedsMatrix({ quickSiteCheck, detailedPlanningPack: pack });
  const expectedPackages = buildDisciplineReferralPackages({
    proposalBrief: pack.proposalBrief,
    consultantNeeds: expectedNeeds,
  });
  if (
    stableReferralJson(review.consultantNeeds) !== stableReferralJson(expectedNeeds) ||
    stableReferralJson(review.disciplinePackages) !== stableReferralJson(expectedPackages)
  ) {
    throw new ArtefactValidationError("The consultant-needs matrix or discipline packages no longer match the exact evidence chain");
  }

  const normalizedProposal = normalizeProposalBriefForComparison(pack.proposalBrief);
  const scopeKey = digest([
    CONSULTANT_REFERRAL_SNAPSHOT_VERSION,
    project.id,
    dppArtefact.id,
    quickSiteCheckArtefact.id,
    normalizedProposal,
  ].join(":"));
  const snapshot = {
    snapshotVersion: CONSULTANT_REFERRAL_SNAPSHOT_VERSION,
    projectId: project.id,
    reviewRequestArtefactId: reviewArtefact.id,
    sourceDetailedPlanningPackArtefactId: dppArtefact.id,
    sourceQuickSiteCheckArtefactId: quickSiteCheckArtefact.id,
    proposalBrief: pack.proposalBrief,
    site: review.site,
    reviewRequest: review,
  };
  const snapshotJson = stableReferralJson(snapshot);

  return {
    project,
    reviewArtefact,
    review,
    scopeKey,
    snapshot,
    packageDigest: digest(snapshotJson),
  };
};

const findByScope = (client: ReferralPrisma, scopeKey: string) => client.consultantReferral.findFirst({
  where: { scopeKey },
  include: { events: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] } },
});

export async function getConsultantReferralForReview({
  projectId,
  reviewRequestArtefactId,
  userId,
}: {
  projectId: string;
  reviewRequestArtefactId: string;
  userId: string;
}, deps = defaultDependencies()): Promise<ConsultantReferralSummary | null> {
  const project = await assertProjectAccess(deps.prisma, projectId, userId);
  const directlyLinked = await deps.prisma.consultantReferral.findFirst({
    where: { projectId: project.id, reviewRequestArtefactId },
    include: { events: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] } },
  });
  if (directlyLinked) return toSummary(directlyLinked);
  const context = await resolveSubmissionContext({
    projectId: project.id,
    reviewRequestArtefactId,
    userId,
    client: deps.prisma,
  });
  const referral = await findByScope(deps.prisma, context.scopeKey);
  return referral ? toSummary(referral) : null;
}

export async function submitConsultantReferral({
  projectId,
  body,
  userId,
}: {
  projectId: string;
  body: unknown;
  userId: string;
}, deps = defaultDependencies()): Promise<{ referral: ConsultantReferralSummary; created: boolean; projectId: string }> {
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    throw new ArtefactValidationError(parsed.error.issues[0]?.message ?? "Invalid consultant referral submission");
  }
  const context = await resolveSubmissionContext({
    projectId,
    reviewRequestArtefactId: parsed.data.reviewRequestArtefactId,
    userId,
    client: deps.prisma,
  });
  const contactFingerprint = digest(`${parsed.data.contactName.toLowerCase()}:${parsed.data.contactEmail}`);
  const existing = await findByScope(deps.prisma, context.scopeKey);
  if (existing) {
    if (existing.contactFingerprint !== contactFingerprint) {
      throw new ArtefactAccessError("This exact referral scope was already submitted with different contact details", 409);
    }
    return { referral: toSummary(existing), created: false, projectId: context.project.id };
  }

  const consentedAt = deps.now();
  const idempotencyKey = digest(`${context.scopeKey}:${CONSULTANT_REFERRAL_CONSENT_VERSION}`);
  try {
    const created = await deps.prisma.$transaction(async (client) => {
      const referral = await client.consultantReferral.create({
        data: {
          projectId: context.project.id,
          reviewRequestArtefactId: context.reviewArtefact.id,
          submittedByUserId: userId === DEV_BYPASS_USER_ID ? null : userId,
          contactName: parsed.data.contactName,
          contactEmail: parsed.data.contactEmail,
          contactFingerprint,
          consentVersion: CONSULTANT_REFERRAL_CONSENT_VERSION,
          consentedAt,
          packageSnapshot: context.snapshot,
          packageDigest: context.packageDigest,
          queueTarget: CONSULTANT_REFERRAL_QUEUE_TARGET,
          scopeKey: context.scopeKey,
          idempotencyKey,
          status: "SUBMITTED",
          submittedAt: consentedAt,
        },
      });
      const event = await client.consultantReferralEvent.create({
        data: {
          referralId: referral.id,
          fromStatus: null,
          toStatus: "SUBMITTED",
          actorType: "USER",
          reasonCode: "explicit_consent_submission",
          occurredAt: consentedAt,
        },
      });
      return { ...referral, events: [event] };
    });
    return { referral: toSummary(created), created: true, projectId: context.project.id };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
    if (code !== "P2002") throw error;
    const raced = await findByScope(deps.prisma, context.scopeKey);
    if (!raced || raced.contactFingerprint !== contactFingerprint) {
      throw new ArtefactAccessError("This exact referral scope was already submitted", 409);
    }
    return { referral: toSummary(raced), created: false, projectId: context.project.id };
  }
}

const transitions: Record<ConsultantReferralStatus, ReadonlySet<ConsultantReferralStatus>> = {
  SUBMITTED: new Set(["ACKNOWLEDGED", "NEEDS_INFORMATION", "DECLINED", "CLOSED"]),
  ACKNOWLEDGED: new Set(["ASSIGNED", "NEEDS_INFORMATION", "DECLINED", "CLOSED"]),
  ASSIGNED: new Set(["CONSULTANT_ACKNOWLEDGED", "NEEDS_INFORMATION", "DECLINED", "CLOSED"]),
  CONSULTANT_ACKNOWLEDGED: new Set(["NEEDS_INFORMATION", "CLOSED"]),
  NEEDS_INFORMATION: new Set(["ACKNOWLEDGED", "ASSIGNED", "DECLINED", "CLOSED"]),
  DECLINED: new Set(["CLOSED"]),
  CLOSED: new Set(),
};

export const isConsultantReferralTransitionAllowed = (
  from: ConsultantReferralStatus,
  to: ConsultantReferralStatus,
) => from === to || transitions[from].has(to);

export async function transitionConsultantReferral({
  referralId,
  toStatus,
  reasonCode = null,
}: {
  referralId: string;
  toStatus: ConsultantReferralStatus;
  reasonCode?: string | null;
}, deps = defaultDependencies()): Promise<ConsultantReferralSummary> {
  if (!consultantReferralStatuses.includes(toStatus)) throw new ArtefactValidationError("Invalid referral status");
  if (reasonCode && !/^[a-z0-9_]{1,80}$/.test(reasonCode)) throw new ArtefactValidationError("Invalid referral reason code");
  const current = await deps.prisma.consultantReferral.findFirst({
    where: { id: referralId },
    include: { events: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] } },
  });
  if (!current) throw new ArtefactValidationError("Consultant referral not found");
  if (current.status === toStatus) return toSummary(current);
  if (!isConsultantReferralTransitionAllowed(current.status, toStatus)) {
    throw new ArtefactValidationError(`Referral cannot move from ${current.status} to ${toStatus}`);
  }

  const occurredAt = deps.now();
  const terminal = toStatus === "DECLINED" || toStatus === "CLOSED";
  const deleteAfter = terminal
    ? new Date(occurredAt.getTime() + CONSULTANT_REFERRAL_CLOSED_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    : null;
  await deps.prisma.$transaction(async (client) => {
    const updated = await client.consultantReferral.updateMany({
      where: { id: referralId, status: current.status },
      data: {
        status: toStatus,
        closedAt: terminal ? occurredAt : null,
        deleteAfter,
      },
    });
    if (updated.count !== 1) throw new ArtefactAccessError("Referral status changed concurrently", 409);
    await client.consultantReferralEvent.create({
      data: {
        referralId,
        fromStatus: current.status,
        toStatus,
        actorType: "OPERATOR",
        reasonCode,
        occurredAt,
      },
    });
  });
  const result = await deps.prisma.consultantReferral.findFirst({
    where: { id: referralId },
    include: { events: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] } },
  });
  if (!result) throw new ArtefactValidationError("Consultant referral not found after update");
  return toSummary(result);
}

export async function listConsultantReferralQueue({
  status,
  limit = 50,
}: {
  status?: ConsultantReferralStatus | null;
  limit?: number;
}, deps = defaultDependencies()) {
  if (status && !consultantReferralStatuses.includes(status)) throw new ArtefactValidationError("Invalid referral status");
  const rows = await deps.prisma.consultantReferral.findMany({
    where: status ? { status } : {},
    include: { events: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] } },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: Math.min(Math.max(limit, 1), 100),
  });
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    reviewRequestArtefactId: row.reviewRequestArtefactId,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    consentVersion: row.consentVersion,
    consentedAt: row.consentedAt,
    packageSnapshot: row.packageSnapshot,
    packageDigest: row.packageDigest,
    queueTarget: row.queueTarget,
    status: row.status,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt,
    deleteAfter: row.deleteAfter,
    events: row.events ?? [],
  }));
}

export async function deleteConsultantReferral(referralId: string, deps = defaultDependencies()) {
  return deps.prisma.consultantReferral.delete({ where: { id: referralId } });
}

export async function pruneClosedConsultantReferrals(deps = defaultDependencies()) {
  return deps.prisma.consultantReferral.deleteMany({
    where: { deleteAfter: { not: null, lte: deps.now() } },
  });
}
