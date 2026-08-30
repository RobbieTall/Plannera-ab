import { createHash } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parseSeeEvidenceTopics, SEE_EVIDENCE_TOPIC_IDS } from "@/lib/see-evidence-topics";

export const SPATIAL_EVIDENCE_MAX_AGE_DAYS = 90;

export type SpatialSourceAuthorityValue =
  | "NSW_GOVERNMENT"
  | "COUNCIL"
  | "CONSULTANT"
  | "SURVEYOR"
  | "USER_PROVIDED"
  | "OTHER";

export type SpatialLegendStatusValue = "CAPTURED" | "SOURCE_LINKED" | "NOT_AVAILABLE" | "NOT_APPLICABLE";
export type SpatialEvidenceStatusValue = "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "CONFLICT" | "SUPERSEDED";
export type SpatialEvidenceReviewDecisionValue = "ACCEPT" | "REJECT" | "MARK_CONFLICT" | "SUPERSEDE";

export type SpatialSiteIdentity = {
  address: string;
  lgaCode?: string | null;
  lgaName?: string | null;
  parcelId?: string | null;
  lot?: string | null;
  planNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  zone?: string | null;
};

export type SpatialEvidenceRecord = {
  id: string;
  artefactId: string;
  projectId: string;
  sourceAuthority: SpatialSourceAuthorityValue;
  contentHash: string;
  siteFingerprint: string;
  siteAddress: string;
  layers: string[];
  legendStatus: SpatialLegendStatusValue;
  legendNotes?: string | null;
  observation: string;
  limitation: string;
  sourceEffectiveAt?: Date | string | null;
  sourceCheckedAt: Date | string;
  expiresAt: Date | string;
  status: SpatialEvidenceStatusValue;
  reviewedAt?: Date | string | null;
  reviewNote?: string | null;
  applicabilityTopics?: unknown;
  version: number;
};

export type SpatialEvidenceBlockerCode =
  | "NO_ACCEPTED_EVIDENCE"
  | "PENDING_REVIEW"
  | "CONFLICT"
  | "STALE"
  | "SITE_MISMATCH"
  | "NO_TOPICS"
  | "LEGEND_UNRESOLVED";

export type SpatialEvidenceBlocker = {
  artefactId?: string;
  code: SpatialEvidenceBlockerCode;
  layers: string[];
  message: string;
};

const normalizeIdentityValue = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\baustralia\b/g, "")
    .replace(/[^a-z0-9.-]+/g, " ")
    .trim();

export const buildSpatialSiteFingerprint = (site: SpatialSiteIdentity) =>
  createHash("sha256")
    .update([
      site.address,
      site.lgaCode,
      site.lgaName,
      site.parcelId,
      site.lot,
      site.planNumber,
      site.latitude,
      site.longitude,
      site.zone,
    ].map(normalizeIdentityValue).join("|"))
    .digest("hex");

export const hashSpatialEvidenceFile = async (file: File) =>
  createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");

export const buildSpatialEvidenceExpiry = (sourceCheckedAt: Date) =>
  new Date(sourceCheckedAt.getTime() + SPATIAL_EVIDENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

export const spatialEvidenceReviewSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT", "MARK_CONFLICT", "SUPERSEDE"]),
  topics: z.array(z.enum(SEE_EVIDENCE_TOPIC_IDS)).max(12).default([]),
  note: z.string().trim().max(2000).optional(),
}).superRefine((value, context) => {
  if ((value.decision === "REJECT" || value.decision === "MARK_CONFLICT" || value.decision === "SUPERSEDE") && !value.note) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["note"], message: "A review note is required for this decision" });
  }
  if ((value.decision === "ACCEPT" || value.decision === "MARK_CONFLICT") && value.topics.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["topics"], message: "Select at least one SEE topic for this spatial evidence decision" });
  }
});

export class SpatialEvidenceError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const reviewStatusByDecision: Record<SpatialEvidenceReviewDecisionValue, SpatialEvidenceStatusValue> = {
  ACCEPT: "ACCEPTED",
  REJECT: "REJECTED",
  MARK_CONFLICT: "CONFLICT",
  SUPERSEDE: "SUPERSEDED",
};

const toDate = (value: Date | string | null | undefined) => value ? new Date(value) : null;

export const assessSpatialEvidenceReadiness = ({
  evidence,
  currentSiteFingerprint,
  now = new Date(),
}: {
  evidence: SpatialEvidenceRecord[];
  currentSiteFingerprint: string;
  now?: Date;
}) => {
  const accepted: SpatialEvidenceRecord[] = [];
  const blockers: SpatialEvidenceBlocker[] = [];

  for (const record of evidence) {
    const layers = Array.isArray(record.layers) ? record.layers : [];
    if (record.siteFingerprint !== currentSiteFingerprint) {
      if (record.status === "ACCEPTED" || record.status === "PENDING_REVIEW" || record.status === "CONFLICT") {
        blockers.push({ artefactId: record.artefactId, code: "SITE_MISMATCH", layers, message: "Spatial evidence belongs to an earlier or different confirmed site." });
      }
      continue;
    }
    if (record.status === "PENDING_REVIEW") {
      blockers.push({ artefactId: record.artefactId, code: "PENDING_REVIEW", layers, message: "Spatial evidence has not been reviewed." });
      continue;
    }
    if (record.status === "CONFLICT") {
      if (parseSeeEvidenceTopics(record.applicabilityTopics).length === 0) {
        blockers.push({ artefactId: record.artefactId, code: "NO_TOPICS", layers, message: "The spatial conflict has not been assigned to an SEE evidence topic." });
        continue;
      }
      blockers.push({ artefactId: record.artefactId, code: "CONFLICT", layers, message: record.reviewNote || "Spatial evidence conflicts with another source or the statutory chain." });
      continue;
    }
    if (record.status !== "ACCEPTED") continue;
    if (parseSeeEvidenceTopics(record.applicabilityTopics).length === 0) {
      blockers.push({ artefactId: record.artefactId, code: "NO_TOPICS", layers, message: "Accepted spatial evidence has not been assigned to an SEE evidence topic." });
      continue;
    }
    const expiresAt = toDate(record.expiresAt);
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      blockers.push({ artefactId: record.artefactId, code: "STALE", layers, message: "Accepted spatial evidence is outside the 90-day source-check window." });
      continue;
    }
    if (record.legendStatus === "NOT_AVAILABLE") {
      blockers.push({ artefactId: record.artefactId, code: "LEGEND_UNRESOLVED", layers, message: "The map observation cannot be relied on without a captured or linked legend." });
      continue;
    }
    accepted.push(record);
  }

  if (!accepted.length) {
    blockers.push({ code: "NO_ACCEPTED_EVIDENCE", layers: [], message: "No current accepted spatial evidence is available for the confirmed site." });
  }

  return { ready: accepted.length > 0 && blockers.length === 0, accepted, blockers };
};

type ReviewProject = {
  id: string;
  publicId?: string | null;
  address?: string | null;
  zoning?: string | null;
  siteContext?: {
    formattedAddress: string;
    lgaCode?: string | null;
    lgaName?: string | null;
    parcelId?: string | null;
    lot?: string | null;
    planNumber?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    zone?: string | null;
  } | null;
};

type SpatialEvidencePrisma = {
  project: {
    findFirst(args: unknown): Promise<ReviewProject | null>;
  };
  spatialEvidence: {
    findFirst(args: unknown): Promise<(SpatialEvidenceRecord & { reviewedById?: string | null }) | null>;
    update(args: unknown): Promise<unknown>;
  };
};

const getCurrentSiteIdentity = (project: ReviewProject): SpatialSiteIdentity | null => {
  const site = project.siteContext;
  const address = site?.formattedAddress?.trim() || project.address?.trim();
  if (!address) return null;
  return {
    address,
    lgaCode: site?.lgaCode,
    lgaName: site?.lgaName,
    parcelId: site?.parcelId,
    lot: site?.lot,
    planNumber: site?.planNumber,
    latitude: site?.latitude,
    longitude: site?.longitude,
    zone: site?.zone ?? project.zoning,
  };
};

export async function reviewSpatialEvidence({
  artefactId,
  body,
  projectId,
  userId,
  now = new Date(),
  prismaClient = prisma as unknown as SpatialEvidencePrisma,
}: {
  artefactId: string;
  body: unknown;
  projectId: string;
  userId: string;
  now?: Date;
  prismaClient?: SpatialEvidencePrisma;
}) {
  const parsed = spatialEvidenceReviewSchema.safeParse(body);
  if (!parsed.success) throw new SpatialEvidenceError(parsed.error.issues[0]?.message ?? "Invalid spatial evidence review");

  const project = await prismaClient.project.findFirst({
    where: {
      AND: [
        { OR: [{ id: projectId }, { publicId: projectId }] },
        userId === "dev-bypass-user"
          ? {}
          : { OR: [{ createdById: userId }, { userId }, { collaborators: { some: { userId } } }] },
      ],
    },
    include: { siteContext: true },
  });
  if (!project) throw new SpatialEvidenceError("Project not found or access denied", 404);

  const record = await prismaClient.spatialEvidence.findFirst({
    where: { artefactId, projectId: project.id },
  });
  if (!record) throw new SpatialEvidenceError("Spatial evidence was not found in this project", 404);

  const siteIdentity = getCurrentSiteIdentity(project);
  if (!siteIdentity) throw new SpatialEvidenceError("Confirm the project site before reviewing spatial evidence");
  const currentSiteFingerprint = buildSpatialSiteFingerprint(siteIdentity);
  if (record.siteFingerprint !== currentSiteFingerprint && parsed.data.decision !== "SUPERSEDE") {
    throw new SpatialEvidenceError("This evidence belongs to an earlier or different confirmed site. Supersede it instead of accepting it.", 409);
  }

  if (parsed.data.decision === "ACCEPT") {
    const expiresAt = toDate(record.expiresAt);
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      throw new SpatialEvidenceError("This evidence is outside the 90-day source-check window. Capture a current source before accepting it.", 409);
    }
    if (record.legendStatus === "NOT_AVAILABLE") {
      throw new SpatialEvidenceError("Capture or link the source legend before accepting this map observation.", 409);
    }
  }

  if (record.status === "SUPERSEDED") throw new SpatialEvidenceError("Superseded evidence cannot be reviewed again", 409);
  const resultingStatus = reviewStatusByDecision[parsed.data.decision];
  const applicabilityTopics = parsed.data.decision === "REJECT" || parsed.data.decision === "SUPERSEDE"
    ? []
    : parseSeeEvidenceTopics(parsed.data.topics);
  const note = parsed.data.note || (parsed.data.decision === "ACCEPT" ? "Accepted for the current confirmed site and source-check window." : null);

  if (
    record.status === resultingStatus &&
    JSON.stringify(parseSeeEvidenceTopics(record.applicabilityTopics)) === JSON.stringify(applicabilityTopics) &&
    (record.reviewNote ?? null) === note
  ) return record;

  try {
    return await prismaClient.spatialEvidence.update({
      where: { id_version: { id: record.id, version: record.version } },
      data: {
        status: resultingStatus,
        version: { increment: 1 },
        reviewedAt: now,
        reviewedBy: userId === "dev-bypass-user" ? { disconnect: true } : { connect: { id: userId } },
        reviewNote: note,
        applicabilityTopics,
        reviewEvents: {
          create: {
            actor: userId === "dev-bypass-user" ? undefined : { connect: { id: userId } },
            decision: parsed.data.decision,
            previousStatus: record.status,
            resultingStatus,
            topics: applicabilityTopics,
            note,
          },
        },
      },
      include: { reviewEvents: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
    if (code === "P2025") throw new SpatialEvidenceError("Spatial evidence changed during review. Refresh before recording another decision.", 409);
    throw error;
  }
}
