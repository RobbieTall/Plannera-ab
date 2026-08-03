import { z } from "zod";

import { detailedPlanningPackContentSchema, quickSiteCheckReportSchema } from "@/lib/artefact-service";
import { fingerprintPurchaseProposal } from "@/lib/purchase-entitlements";
import { prisma } from "@/lib/prisma";
import { parseSeeEvidenceTopics, SEE_EVIDENCE_TOPIC_IDS } from "@/lib/see-evidence-topics";
import { buildSpatialSiteFingerprint } from "@/lib/spatial-evidence";
import { detailedPlanningPackScope, isArtefactCurrentForSite, quickSiteCheckScope } from "@/lib/site-scoped-artefacts";

export type EvidenceApplicabilityStatusValue = "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "CONFLICT" | "SUPERSEDED";
export type EvidenceApplicabilityDecisionValue = "ACCEPT" | "REJECT" | "MARK_CONFLICT" | "SUPERSEDE";

export type ApplicableUploadRecord = {
  id: string;
  projectId: string;
  evidenceStatus: "READY" | "PARTIALLY_READABLE" | "IMAGE_ONLY" | "NEEDS_REVIEW";
  indexingStatus: "READY" | "PENDING" | "FAILED" | "NOT_APPLICABLE";
  applicabilityStatus: EvidenceApplicabilityStatusValue;
  applicabilityArtefactId?: string | null;
  acceptedSiteFingerprint?: string | null;
  acceptedProposalFingerprint?: string | null;
  applicabilityTopics?: unknown;
  sourceDocumentDate?: Date | string | null;
  validUntil?: Date | string | null;
  applicabilityReviewNote?: string | null;
  applicabilityVersion: number;
};

export type UploadEvidenceBlockerCode =
  | "UNREADABLE"
  | "NOT_INDEXED"
  | "PENDING_REVIEW"
  | "CONFLICT"
  | "SCOPE_MISMATCH"
  | "NO_TOPICS"
  | "INVALID_DOCUMENT_DATE"
  | "EXPIRED";

export type UploadEvidenceBlocker = {
  uploadId: string;
  code: UploadEvidenceBlockerCode;
  message: string;
};

const optionalDate = z.preprocess((value) => value ? new Date(value as string) : undefined, z.date().optional());

export const uploadEvidenceApplicabilityReviewSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT", "MARK_CONFLICT", "SUPERSEDE"]),
  sourceDetailedPlanningPackArtefactId: z.string().trim().min(1),
  sourceDocumentDate: optionalDate,
  validUntil: optionalDate,
  topics: z.array(z.enum(SEE_EVIDENCE_TOPIC_IDS)).max(12).default([]),
  note: z.string().trim().max(2000).optional(),
}).superRefine((value, context) => {
  if (value.decision === "ACCEPT" && !value.sourceDocumentDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceDocumentDate"], message: "Record the document date before accepting this evidence" });
  }
  if (value.decision !== "ACCEPT" && !value.note) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["note"], message: "A review note is required for this decision" });
  }
  if ((value.decision === "ACCEPT" || value.decision === "MARK_CONFLICT") && value.topics.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["topics"], message: "Select at least one SEE topic for this evidence decision" });
  }
});

export class UploadEvidenceApplicabilityError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const statusByDecision: Record<EvidenceApplicabilityDecisionValue, EvidenceApplicabilityStatusValue> = {
  ACCEPT: "ACCEPTED",
  REJECT: "REJECTED",
  MARK_CONFLICT: "CONFLICT",
  SUPERSEDE: "SUPERSEDED",
};

const asDate = (value: Date | string | null | undefined) => value ? new Date(value) : null;
export const parseUploadEvidenceTopics = parseSeeEvidenceTopics;

const sameDate = (left: Date | string | null | undefined, right: Date | string | null | undefined) => {
  const leftDate = asDate(left);
  const rightDate = asDate(right);
  return (leftDate === null && rightDate === null) ||
    (leftDate !== null && rightDate !== null && leftDate.getTime() === rightDate.getTime());
};

export const assessUploadEvidenceReadiness = ({
  currentDetailedPlanningPackId,
  currentProposalFingerprint,
  currentSiteFingerprint,
  now = new Date(),
  uploads,
}: {
  currentDetailedPlanningPackId: string;
  currentProposalFingerprint: string;
  currentSiteFingerprint: string;
  now?: Date;
  uploads: ApplicableUploadRecord[];
}) => {
  const accepted: ApplicableUploadRecord[] = [];
  const blockers: UploadEvidenceBlocker[] = [];

  for (const upload of uploads) {
    if (upload.applicabilityStatus === "REJECTED" || upload.applicabilityStatus === "SUPERSEDED") continue;
    if (upload.evidenceStatus !== "READY") {
      blockers.push({ uploadId: upload.id, code: "UNREADABLE", message: "The document is not fully readable and cannot support a final SEE section." });
      continue;
    }
    if (upload.indexingStatus !== "READY") {
      blockers.push({ uploadId: upload.id, code: "NOT_INDEXED", message: "The readable document is not available to cited retrieval." });
      continue;
    }
    if (upload.applicabilityStatus === "PENDING_REVIEW") {
      blockers.push({ uploadId: upload.id, code: "PENDING_REVIEW", message: "The document has not been accepted for the current site and proposal." });
      continue;
    }
    if (
      upload.applicabilityArtefactId !== currentDetailedPlanningPackId ||
      upload.acceptedSiteFingerprint !== currentSiteFingerprint ||
      upload.acceptedProposalFingerprint !== currentProposalFingerprint
    ) {
      blockers.push({ uploadId: upload.id, code: "SCOPE_MISMATCH", message: "The accepted document is bound to a different site, proposal or Planning Controls Pack." });
      continue;
    }
    if (upload.applicabilityStatus === "CONFLICT") {
      if (parseUploadEvidenceTopics(upload.applicabilityTopics).length === 0) {
        blockers.push({ uploadId: upload.id, code: "NO_TOPICS", message: "The evidence review does not identify which SEE topics are affected." });
        continue;
      }
      blockers.push({ uploadId: upload.id, code: "CONFLICT", message: upload.applicabilityReviewNote || "The document conflicts with another source or the planning evidence chain." });
      continue;
    }
    if (upload.applicabilityStatus !== "ACCEPTED") continue;
    if (parseUploadEvidenceTopics(upload.applicabilityTopics).length === 0) {
      blockers.push({ uploadId: upload.id, code: "NO_TOPICS", message: "The accepted document has not been assigned to an SEE evidence topic." });
      continue;
    }
    const sourceDocumentDate = asDate(upload.sourceDocumentDate);
    if (!sourceDocumentDate || !Number.isFinite(sourceDocumentDate.getTime()) || sourceDocumentDate > now) {
      blockers.push({ uploadId: upload.id, code: "INVALID_DOCUMENT_DATE", message: "The accepted document is missing a valid, non-future source date." });
      continue;
    }
    const validUntil = asDate(upload.validUntil);
    if (validUntil && (!Number.isFinite(validUntil.getTime()) || validUntil <= now)) {
      blockers.push({ uploadId: upload.id, code: "EXPIRED", message: "The accepted document is past its recorded validity date." });
      continue;
    }
    accepted.push(upload);
  }

  return { ready: blockers.length === 0, accepted, blockers };
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

type UploadApplicabilityPrisma = {
  project: { findFirst(args: unknown): Promise<ReviewProject | null> };
  workspaceUpload: {
    findFirst(args: unknown): Promise<ApplicableUploadRecord | null>;
    update(args: unknown): Promise<unknown>;
  };
  artefact: { findFirst(args: unknown): Promise<{ id: string; projectId: string; payload: unknown } | null> };
};

const currentSite = (project: ReviewProject) => {
  const site = project.siteContext;
  const address = site?.formattedAddress?.trim() || project.address?.trim();
  if (!address) return null;
  return {
    identity: {
      address,
      lgaCode: site?.lgaCode,
      lgaName: site?.lgaName,
      parcelId: site?.parcelId,
      lot: site?.lot,
      planNumber: site?.planNumber,
      latitude: site?.latitude,
      longitude: site?.longitude,
      zone: site?.zone ?? project.zoning,
    },
    scope: {
      address,
      lgaName: site?.lgaName,
      lgaCode: site?.lgaCode,
      zoneLabel: site?.zone ?? project.zoning,
    },
  };
};

export async function reviewUploadEvidenceApplicability({
  body,
  now = new Date(),
  prismaClient = prisma as unknown as UploadApplicabilityPrisma,
  projectId,
  uploadId,
  userId,
}: {
  body: unknown;
  now?: Date;
  prismaClient?: UploadApplicabilityPrisma;
  projectId: string;
  uploadId: string;
  userId: string;
}) {
  const parsed = uploadEvidenceApplicabilityReviewSchema.safeParse(body);
  if (!parsed.success) throw new UploadEvidenceApplicabilityError(parsed.error.issues[0]?.message ?? "Invalid evidence applicability review");

  const project = await prismaClient.project.findFirst({
    where: {
      AND: [
        { OR: [{ id: projectId }, { publicId: projectId }] },
        userId === "dev-bypass-user" ? {} : { OR: [{ createdById: userId }, { userId }, { collaborators: { some: { userId } } }] },
      ],
    },
    include: { siteContext: true },
  });
  if (!project) throw new UploadEvidenceApplicabilityError("Project not found or access denied", 404);

  const upload = await prismaClient.workspaceUpload.findFirst({ where: { id: uploadId, projectId: project.id } });
  if (!upload) throw new UploadEvidenceApplicabilityError("Uploaded evidence was not found in this project", 404);
  if (upload.applicabilityStatus === "SUPERSEDED") throw new UploadEvidenceApplicabilityError("Superseded evidence cannot be reviewed again", 409);

  const site = currentSite(project);
  if (!site) throw new UploadEvidenceApplicabilityError("Confirm the project site before reviewing uploaded evidence");
  const artefact = await prismaClient.artefact.findFirst({
    where: { id: parsed.data.sourceDetailedPlanningPackArtefactId, projectId: project.id, type: "detailed_planning_pack" },
    select: { id: true, projectId: true, payload: true },
  });
  const packResult = detailedPlanningPackContentSchema.safeParse(artefact?.payload);
  if (!artefact || !packResult.success || packResult.data.projectId !== project.id || !packResult.data.sourceQuickSiteCheck?.artefactId) {
    throw new UploadEvidenceApplicabilityError("The selected Planning Controls Pack is missing its cited provenance chain", 409);
  }
  if (!isArtefactCurrentForSite(site.scope, detailedPlanningPackScope(packResult.data))) {
    throw new UploadEvidenceApplicabilityError("The selected Planning Controls Pack belongs to a different or earlier confirmed site", 409);
  }
  const quickSiteCheckArtefact = await prismaClient.artefact.findFirst({
    where: { id: packResult.data.sourceQuickSiteCheck.artefactId, projectId: project.id, type: "quick_site_check" },
    select: { id: true, projectId: true, payload: true },
  });
  const quickSiteCheckResult = quickSiteCheckReportSchema.safeParse(quickSiteCheckArtefact?.payload);
  if (
    !quickSiteCheckArtefact ||
    !quickSiteCheckResult.success ||
    quickSiteCheckResult.data.projectId !== project.id ||
    !isArtefactCurrentForSite(site.scope, quickSiteCheckScope(quickSiteCheckResult.data))
  ) {
    throw new UploadEvidenceApplicabilityError("The selected Planning Controls Pack does not resolve to its exact current Quick Site Check", 409);
  }

  const detailedPlanningPackId = artefact.id;
  const siteFingerprint = buildSpatialSiteFingerprint(site.identity);
  const proposalFingerprint = fingerprintPurchaseProposal(packResult.data.proposalBrief);
  const applicabilityTopics = parsed.data.decision === "REJECT" || parsed.data.decision === "SUPERSEDE"
    ? []
    : parseUploadEvidenceTopics(parsed.data.topics);

  if (parsed.data.decision === "ACCEPT") {
    if (upload.evidenceStatus !== "READY") {
      throw new UploadEvidenceApplicabilityError("Only fully readable documents can be accepted for final SEE evidence", 409);
    }
    if (upload.indexingStatus !== "READY") {
      throw new UploadEvidenceApplicabilityError("The document must be successfully indexed before it can be accepted", 409);
    }
    if (parsed.data.sourceDocumentDate!.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw new UploadEvidenceApplicabilityError("Document date cannot be in the future", 409);
    }
    if (parsed.data.validUntil && parsed.data.validUntil <= now) {
      throw new UploadEvidenceApplicabilityError("The document validity date has already passed", 409);
    }
  }

  const resultingStatus = statusByDecision[parsed.data.decision];
  const note = parsed.data.note || (parsed.data.decision === "ACCEPT" ? "Accepted for the exact current site and Planning Controls Pack proposal." : null);
  const sameDecision = upload.applicabilityStatus === resultingStatus &&
    upload.applicabilityArtefactId === detailedPlanningPackId &&
    upload.acceptedSiteFingerprint === siteFingerprint &&
    upload.acceptedProposalFingerprint === proposalFingerprint &&
    JSON.stringify(parseUploadEvidenceTopics(upload.applicabilityTopics)) === JSON.stringify(applicabilityTopics) &&
    sameDate(upload.sourceDocumentDate, parsed.data.sourceDocumentDate) &&
    sameDate(upload.validUntil, parsed.data.validUntil) &&
    (upload.applicabilityReviewNote ?? null) === note;
  if (sameDecision) return upload;

  try {
    return await prismaClient.workspaceUpload.update({
      where: { id_applicabilityVersion: { id: upload.id, applicabilityVersion: upload.applicabilityVersion } },
      data: {
        applicabilityStatus: resultingStatus,
        applicabilityArtefact: detailedPlanningPackId ? { connect: { id: detailedPlanningPackId } } : { disconnect: true },
        acceptedSiteFingerprint: siteFingerprint,
        acceptedProposalFingerprint: proposalFingerprint,
        applicabilityTopics,
        sourceDocumentDate: parsed.data.sourceDocumentDate ?? null,
        validUntil: parsed.data.validUntil ?? null,
        applicabilityReviewedAt: now,
        applicabilityReviewedBy: userId === "dev-bypass-user" ? { disconnect: true } : { connect: { id: userId } },
        applicabilityReviewNote: note,
        applicabilityVersion: { increment: 1 },
        applicabilityReviewEvents: {
          create: {
            actor: userId === "dev-bypass-user" ? undefined : { connect: { id: userId } },
            decision: parsed.data.decision,
            previousStatus: upload.applicabilityStatus,
            resultingStatus,
            detailedPlanningPackId,
            siteFingerprint,
            proposalFingerprint,
            topics: applicabilityTopics,
            sourceDocumentDate: parsed.data.sourceDocumentDate ?? null,
            validUntil: parsed.data.validUntil ?? null,
            note,
          },
        },
      },
      include: { applicabilityReviewEvents: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
    if (code === "P2025") throw new UploadEvidenceApplicabilityError("Evidence changed during review. Refresh before recording another decision.", 409);
    throw error;
  }
}
