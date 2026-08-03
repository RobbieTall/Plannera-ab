import { z } from "zod";

import { NEXT_AUTH_SESSION_COOKIE, authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDCPContext } from "@/lib/dcp/get-dcp-context";
import type { ScoredDcpClause } from "@/lib/dcp/search";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import { buildQuickSiteCheckReport } from "@/lib/quick-site-check";
import { summariseQuickSiteCheckEvidence } from "@/lib/quick-site-check-evidence";
import { assessQuickSiteCheckDevelopmentIntent } from "@/lib/plannera-check-flow";
import { buildPlanningFeasibilitySummary } from "@/lib/planning-feasibility-summary";
import { buildConsultantNeedsMatrix, buildDisciplineReferralPackages } from "@/lib/consultant-needs";
import { buildQuickSiteCheckLep } from "@/lib/lep/quick-site-check";
import { getLepContextForProject, type LepClauseContext, type LepContext } from "@/lib/lep/lep-context";
import { serializeSiteContext } from "@/lib/site-context";
import { detailedPlanningPackScope, isArtefactCurrentForSite, preSeeScope, quickSiteCheckScope, type CurrentSiteScope } from "@/lib/site-scoped-artefacts";
import { saveFileToUploads, type SavedFile } from "@/lib/storage";
import { getWorkspaceSourceContext } from "@/lib/workspace-source-context";
import { buildStatutoryContextBlock } from "@/lib/statutory-context-builder";
import {
  buildSpatialEvidenceExpiry,
  buildSpatialSiteFingerprint,
  hashSpatialEvidenceFile,
} from "@/lib/spatial-evidence";
import { findProjectByExternalId } from "./project-identifiers";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { Artefact, ArtefactType, PrismaClient } from "@prisma/client";
import type { QuickSiteCheckControl, QuickSiteCheckReport } from "@/types/quick-site-check";
import type { LepControlValue } from "@/types/quick-site-check-lep";
import type { DetailedPlanningPackContent, FeasibilityContent, WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

export const DEV_BYPASS_USER_ID = "dev-bypass-user";

type PrismaClientArtefact = Pick<PrismaClient["artefact"], "create" | "findMany">;
type PrismaClientProject = Pick<PrismaClient["project"], "findFirst" | "findUnique">;
type PrismaClientLgaCoverageState = Pick<PrismaClient["lgaCoverageState"], "findUnique">;

type ArtefactDependencies = {
  prisma: {
    artefact: PrismaClientArtefact;
    project: PrismaClientProject;
    lgaCoverageState?: PrismaClientLgaCoverageState;
  };
  saveFile: (file: File) => Promise<SavedFile>;
};

type LepContextResolver = typeof getLepContextForProject;
type QuickSiteCheckLepBuilder = typeof buildQuickSiteCheckLep;

type QuickSiteCheckArtefactDeps = Pick<ArtefactDependencies, "prisma"> & {
  getLepContextForProject?: LepContextResolver;
  buildQuickSiteCheckLep?: QuickSiteCheckLepBuilder;
};

const overlayEntrySchema = z
  .union([z.string().trim(), z.array(z.string().trim())])
  .transform((value) => (Array.isArray(value) ? value : value ? [value] : []))
  .transform((values) => values.filter((entry) => entry.length > 0))
  .refine((values) => values.length > 0, "Select at least one mapped layer or plan topic");

const optionalDateSchema = z.preprocess(
  (value) => (value ? new Date(value as string) : undefined),
  z.date().optional(),
);

const confirmedObservationSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean().refine((value) => value, "Confirm that the observation accurately describes the captured map"),
);

const mapSnapshotSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  title: z.string().trim().min(1, "title is required").max(200),
  source: z.string().trim().min(1, "source is required").max(200),
  sourceAuthority: z.enum(["NSW_GOVERNMENT", "COUNCIL", "CONSULTANT", "SURVEYOR", "USER_PROVIDED", "OTHER"]),
  sourceUrl: z.string().url().trim().optional(),
  overlays: overlayEntrySchema.default([]),
  legendStatus: z.enum(["CAPTURED", "SOURCE_LINKED", "NOT_AVAILABLE", "NOT_APPLICABLE"]),
  legendNotes: z.string().trim().max(1000).optional(),
  observation: z.string().trim().min(10, "Describe what the mapped layer or plan shows").max(3000),
  limitation: z.string().trim().min(10, "Describe the limits of this map observation").max(3000),
  observationConfirmed: confirmedObservationSchema,
  notes: z.string().trim().max(2000).optional(),
  capturedAt: optionalDateSchema,
  sourceEffectiveAt: optionalDateSchema,
  sourceCheckedAt: optionalDateSchema,
}).superRefine((value, context) => {
  const nowWithTolerance = Date.now() + 5 * 60 * 1000;
  if (value.capturedAt && value.capturedAt.getTime() > nowWithTolerance) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["capturedAt"], message: "Capture date cannot be in the future" });
  }
  if (value.sourceCheckedAt && value.sourceCheckedAt.getTime() > nowWithTolerance) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceCheckedAt"], message: "Source checked date cannot be in the future" });
  }
  if (value.sourceEffectiveAt && value.sourceEffectiveAt.getTime() > nowWithTolerance) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceEffectiveAt"], message: "Source effective date cannot be in the future" });
  }
  if ((value.sourceAuthority === "NSW_GOVERNMENT" || value.sourceAuthority === "COUNCIL") && !value.sourceUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceUrl"], message: "An authoritative source URL is required" });
  }
  if (value.legendStatus === "SOURCE_LINKED" && !value.sourceUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceUrl"], message: "A source URL is required when the legend is source-linked" });
  }
  if ((value.legendStatus === "NOT_AVAILABLE" || value.legendStatus === "NOT_APPLICABLE") && !value.legendNotes) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["legendNotes"], message: "Explain why a legend is unavailable or not applicable" });
  }
});

const quickSiteCheckControlSchema = z.object({
  label: z.string(),
  value: z.string().nullable(),
  present: z.boolean(),
  source: z.string().nullable().optional(),
  lepSource: z.boolean().optional(),
  clauseRef: z.string().nullable().optional(),
  detail: z.string().nullable().optional(),
  interpretation: z.string(),
  confidence: z.enum(["Cited", "Inferred", "Unavailable"]).optional(),
});

const quickSiteCheckEvidenceSummarySchema = z.object({
  label: z.enum(["Cited", "Unavailable"]),
  detail: z.string(),
  citedControlCount: z.number().int().nonnegative(),
  totalControlCount: z.number().int().nonnegative(),
  landUseEntryCount: z.number().int().nonnegative(),
  objectiveCount: z.number().int().nonnegative(),
  sourceRef: z.string(),
});

const quickSiteCheckDevelopmentIntentSchema = z.object({
  description: z.string().trim().min(1).max(500),
  status: z.enum(["Cited", "Unresolved"]),
  pathway: z.enum(["permitted_without_consent", "permitted_with_consent", "prohibited", "unresolved"]),
  statutoryLandUse: z.string().nullable(),
  sourceRef: z.string().nullable(),
  detail: z.string(),
});

export const quickSiteCheckReportSchema = z
  .object({
    projectId: z.string().trim().min(1),
    generatedAt: z.string().trim().min(1),
    site: z
      .object({
        address: z.string().nullable().optional(),
        lga: z.string().nullable().optional(),
        zoneCode: z.string().nullable().optional(),
        zoneName: z.string().nullable().optional(),
        zoneLabel: z.string().nullable().optional(),
        zoningSource: z.string().nullable().optional(),
      })
      .passthrough(),
    lepInstrument: z
      .object({
        name: z.string().nullable().optional(),
        code: z.string().nullable().optional(),
        lga: z.string().nullable().optional(),
        source: z.enum(["project", "ingestion"]).optional(),
      })
      .nullable()
      .optional(),
    permissibility: z
      .object({
        zoneLabel: z.string().nullable().default(null),
        permittedWithoutConsent: z.array(z.string()),
        permittedWithConsent: z.array(z.string()),
        prohibited: z.array(z.string()),
        interpretation: z.string(),
      })
      .nullable()
      .optional(),
    controls: z.object({
      heightOfBuilding: quickSiteCheckControlSchema,
      floorSpaceRatio: quickSiteCheckControlSchema,
      minimumLotSize: quickSiteCheckControlSchema,
    }).passthrough(),
    notes: z.array(z.string()),
    nextSteps: z.array(z.string()),
    lepEvidenceSummary: quickSiteCheckEvidenceSummarySchema.nullable().default(null),
    developmentIntent: quickSiteCheckDevelopmentIntentSchema.nullable().optional().default(null),
  })
  .passthrough();

const quickSiteCheckArtefactSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  title: z.string().trim().min(1, "title is required").max(200),
  type: z.literal("quick_site_check"),
  report: quickSiteCheckReportSchema,
});

export class ArtefactValidationError extends Error {
  status = 400;
}

export class ArtefactAccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
  }
}

export async function requireSessionUser() {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true") {
    return { userId: DEV_BYPASS_USER_ID };
  }

  let session: Session | null = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  const userId = session?.user?.id as string | undefined;

  if (userId) {
    return { userId };
  }

  const hasSessionCookie = Boolean(
    cookies().get(NEXT_AUTH_SESSION_COOKIE.name) ?? cookies().get("__Secure-next-auth.session-token") ?? cookies().get("next-auth.session-token"),
  );

  throw new ArtefactAccessError(
    hasSessionCookie ? "Your session expired. Please sign in again." : "Authentication required",
    401,
  );
}

export function parseMapSnapshotFormData(formData: FormData, projectIdFromParams: string) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ArtefactValidationError("An image file is required");
  }

  if (!file.type.startsWith("image/")) {
    throw new ArtefactValidationError("Only image uploads are supported for map snapshots");
  }

  const overlaysEntries = formData.getAll("overlays");
  const overlaysValue = overlaysEntries.length > 1 ? overlaysEntries.map(String) : overlaysEntries[0] ?? [];

  const parsed = mapSnapshotSchema.safeParse({
    projectId: formData.get("projectId") ?? projectIdFromParams,
    title: formData.get("title"),
    source: formData.get("source") ?? "",
    sourceUrl: formData.get("sourceUrl") ?? undefined,
    overlays: overlaysValue,
    notes: formData.get("notes") ?? undefined,
    capturedAt: formData.get("capturedAt") ?? undefined,
    sourceAuthority: formData.get("sourceAuthority"),
    legendStatus: formData.get("legendStatus"),
    legendNotes: formData.get("legendNotes") ?? undefined,
    observation: formData.get("observation"),
    limitation: formData.get("limitation"),
    observationConfirmed: formData.get("observationConfirmed"),
    sourceEffectiveAt: formData.get("sourceEffectiveAt") ?? undefined,
    sourceCheckedAt: formData.get("sourceCheckedAt") ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    throw new ArtefactValidationError(message);
  }

  const { projectId, ...rest } = parsed.data;

  if (projectId !== projectIdFromParams) {
    throw new ArtefactValidationError("Project mismatch between URL and form payload");
  }

  return { file, projectId, payload: rest };
}

async function assertProjectAccess(
  prismaClient: ArtefactDependencies["prisma"],
  projectId: string,
  userId: string,
) {
  const project = await findProjectByExternalId(prismaClient as unknown as PrismaClient, projectId);

  if (!project) {
    throw new ArtefactAccessError("Project not found or access denied");
  }

  const hasAccess = await prismaClient.project.findFirst({
    where:
      userId === DEV_BYPASS_USER_ID
        ? { id: project.id }
        : {
            id: project.id,
            OR: [{ createdById: userId }, { userId }, { collaborators: { some: { userId } } }],
          },
    select: { id: true },
  });

  if (!hasAccess) {
    throw new ArtefactAccessError("Project not found or access denied");
  }

  return project;
}

export type MapSnapshotArtefactInput = {
  projectId: string;
  title: string;
  source: string;
  sourceAuthority: "NSW_GOVERNMENT" | "COUNCIL" | "CONSULTANT" | "SURVEYOR" | "USER_PROVIDED" | "OTHER";
  sourceUrl?: string;
  overlays: string[];
  legendStatus: "CAPTURED" | "SOURCE_LINKED" | "NOT_AVAILABLE" | "NOT_APPLICABLE";
  legendNotes?: string;
  observation: string;
  limitation: string;
  observationConfirmed: true;
  notes?: string;
  capturedAt?: Date;
  sourceEffectiveAt?: Date;
  sourceCheckedAt?: Date;
};

export type QuickSiteCheckArtefactInput = {
  projectId: string;
  title: string;
  type: Extract<ArtefactType, "quick_site_check">;
  report: QuickSiteCheckReport;
};


type ProjectWithOptionalSiteContext = Awaited<ReturnType<typeof assertProjectAccess>> & {
  siteContext?: Parameters<typeof serializeSiteContext>[0] | null;
};

type LepEnrichment = {
  lepContext: LepContext | null;
  lepResponse: Awaited<ReturnType<typeof buildQuickSiteCheckLep>> | null;
};

const truncatePromptText = (value: string, maxLength = 300) => {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength).trimEnd()}…` : compacted;
};

const formatPromptList = (values: string[] | undefined, fallback = "Not found in retrieved LEP data") => {
  const filtered = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return filtered.length ? filtered.slice(0, 10).join(", ") : fallback;
};

const isRealLepResponse = (
  response: Awaited<ReturnType<typeof buildQuickSiteCheckLep>> | null,
): response is Extract<Awaited<ReturnType<typeof buildQuickSiteCheckLep>>, { ok: true }> => Boolean(response?.ok);

export const findLepClause = (clauses: LepClauseContext[], refs: string[], keywords: string[]) => {
  const byRef = clauses.find((clause) => refs.some((ref) => clause.ref === ref || clause.ref.startsWith(`${ref}`)));
  if (byRef) return byRef;

  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return clauses.find((clause) => {
    const haystack = `${clause.title ?? ""} ${clause.text}`.toLowerCase();
    return normalizedKeywords.some((keyword) => haystack.includes(keyword));
  });
};

export const extractNumericControlValue = (clause: LepClauseContext | null) => {
  if (!clause) return null;
  const text = `${clause.title ?? ""} ${clause.text}`;
  const patterns = [
    /\b\d+(?:\.\d+)?\s*(?:m|metres|metre)\b/i,
    /\b\d+(?:\.\d+)?\s*:\s*1\b/i,
    /\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:m2|m²|sqm|square metres)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return null;
};

const unavailableLepControl = (control: QuickSiteCheckControl): QuickSiteCheckControl => ({
  ...control,
  value: null,
  present: false,
  source: "Not in retrieved data",
  lepSource: false,
  clauseRef: null,
  detail: null,
  confidence: "Unavailable",
  interpretation: "Not found in retrieved LEP data",
});

export const hasVerifiedLepControlEvidence = (
  control: QuickSiteCheckControl | null | undefined,
): control is QuickSiteCheckControl & { value: string; clauseRef: string; lepSource: true } =>
  Boolean(
    control?.lepSource === true &&
    control.present &&
    control.value?.trim() &&
    control.clauseRef?.trim(),
  );

export const sanitiseQuickSiteLepControls = (
  controls: QuickSiteCheckReport["controls"],
): QuickSiteCheckReport["controls"] => ({
  ...controls,
  heightOfBuilding: hasVerifiedLepControlEvidence(controls.heightOfBuilding)
    ? { ...controls.heightOfBuilding, confidence: "Cited" }
    : unavailableLepControl(controls.heightOfBuilding),
  floorSpaceRatio: hasVerifiedLepControlEvidence(controls.floorSpaceRatio)
    ? { ...controls.floorSpaceRatio, confidence: "Cited" }
    : unavailableLepControl(controls.floorSpaceRatio),
  minimumLotSize: hasVerifiedLepControlEvidence(controls.minimumLotSize)
    ? { ...controls.minimumLotSize, confidence: "Cited" }
    : unavailableLepControl(controls.minimumLotSize),
});

export const hasVerifiedLepPermissibilityEvidence = (report: QuickSiteCheckReport) =>
  Boolean(
    report.lepEvidenceSummary?.label === "Cited" &&
    report.lepEvidenceSummary.objectiveCount > 0 &&
    report.lepEvidenceSummary.landUseEntryCount > 0 &&
    report.permissibility &&
    report.lepInstrument?.name,
  );

const canonicalEvidenceValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalEvidenceValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalEvidenceValue(entry)]),
  );
};

const hasSameEvidenceSnapshot = (left: unknown, right: unknown) =>
  JSON.stringify(canonicalEvidenceValue(left)) === JSON.stringify(canonicalEvidenceValue(right));

const withRealLepControl = (
  control: QuickSiteCheckControl,
  clause: LepClauseContext | null,
  structuredControl?: LepControlValue | null,
): QuickSiteCheckControl => {
  const parsedValue = extractNumericControlValue(clause);
  const hasStructuredCitedValue = Boolean(
    structuredControl?.confidence === "Cited" &&
    structuredControl.value?.trim() &&
    structuredControl.clauseRef?.trim(),
  );

  if (!parsedValue && !hasStructuredCitedValue) {
    return unavailableLepControl(control);
  }

  const value = parsedValue ?? structuredControl!.value;
  const clauseRef = parsedValue ? clause!.ref : structuredControl!.clauseRef;
  const sourceDetail = clause
    ? truncatePromptText(clause.text)
    : structuredControl?.sourceRef ?? null;
  const clauseTitle = clause?.title
    ? `${clauseRef}: ${clause.title}`
    : clauseRef;

  return {
    ...control,
    value,
    present: true,
    clauseRef,
    detail: sourceDetail,
    source: "lep",
    lepSource: true,
    confidence: "Cited",
    interpretation: `${control.label} is ${value} based on retrieved LEP evidence ${clauseTitle}. Verify the mapped value against the official LEP map before lodgement.`,
  };
};

const withRealDcpControl = (
  control: QuickSiteCheckControl | undefined,
  label: string,
  structuredControl?: LepControlValue | null,
): QuickSiteCheckControl | undefined => {
  if (!control && !structuredControl) return undefined;

  const baseControl = control ?? {
    label,
    value: null,
    present: false,
    interpretation: "Not found in retrieved DCP data",
  };
  const hasStructuredCitedValue = Boolean(
    structuredControl?.confidence === "Cited" &&
    structuredControl.value?.trim() &&
    structuredControl.clauseRef?.trim(),
  );

  if (!hasStructuredCitedValue) {
    return {
      ...baseControl,
      label,
      value: null,
      present: false,
      source: "Not in retrieved data",
      lepSource: false,
      clauseRef: null,
      detail: structuredControl?.sourceRef ?? null,
      confidence: "Unavailable",
      interpretation: "Not found in retrieved DCP data",
    };
  }

  return {
    ...baseControl,
    label,
    value: structuredControl!.value,
    present: true,
    source: "dcp",
    lepSource: false,
    clauseRef: structuredControl!.clauseRef,
    detail: structuredControl?.sourceRef ?? null,
    confidence: "Cited",
    interpretation: `${label} is ${structuredControl!.value} based on retrieved DCP evidence ${structuredControl?.sourceRef ?? structuredControl!.clauseRef}. Verify the current DCP before lodgement.`,
  };
};

const applyRealLepEnrichmentToReport = (report: QuickSiteCheckReport, enrichment: LepEnrichment): QuickSiteCheckReport => {
  const lepClauses = enrichment.lepContext?.clauses ?? [];
  const lepResponse = isRealLepResponse(enrichment.lepResponse) ? enrichment.lepResponse : null;

  const heightClause = findLepClause(lepClauses, ["4.3"], ["height of buildings", "height of building"]);
  const fsrClause = findLepClause(lepClauses, ["4.4"], ["floor space ratio", "fsr"]);
  const lotSizeClause = findLepClause(lepClauses, ["4.1"], ["minimum subdivision lot size", "minimum lot size"]);

  const zoneLabel = lepResponse?.zone
    ? [lepResponse.zone, report.site.zoneName].filter(Boolean).join(" – ")
    : report.permissibility?.zoneLabel ?? report.site.zoneLabel ?? null;

  const site = { ...report.site };
  if (lepResponse?.zone || report.site.zoneCode) {
    site.zoneCode = lepResponse?.zone ?? report.site.zoneCode ?? null;
  }
  if (zoneLabel || report.site.zoneLabel) {
    site.zoneLabel = zoneLabel;
  }

  const lepEvidenceSummary = lepResponse ? summariseQuickSiteCheckEvidence(lepResponse) : null;
  const developmentIntent = assessQuickSiteCheckDevelopmentIntent(
    report.developmentIntent?.description ?? "",
    lepResponse,
  );

  return {
    ...report,
    site,
    lepInstrument: enrichment.lepContext
      ? {
          name: enrichment.lepContext.instrumentName,
          code: enrichment.lepContext.instrumentCode,
          lga: enrichment.lepContext.lga,
          source: "ingestion",
        }
      : report.lepInstrument ?? null,
    permissibility: lepResponse
      ? {
          zoneLabel,
          permittedWithoutConsent: lepResponse.landUse.withoutConsent,
          permittedWithConsent: lepResponse.landUse.withConsent,
          prohibited: lepResponse.landUse.prohibited,
          interpretation: `Zone ${lepResponse.zone ?? report.site.zoneCode ?? "(unknown)"} objectives include ${formatPromptList(lepResponse.objectives, "no objectives found")}. Uses permitted with consent include ${formatPromptList(lepResponse.landUse.withConsent, "no uses found")}.`,
        }
      : report.permissibility ?? null,
    controls: {
      ...report.controls,
      heightOfBuilding: withRealLepControl(
        report.controls.heightOfBuilding,
        heightClause ?? null,
        lepResponse?.controls.heightOfBuilding,
      ),
      floorSpaceRatio: withRealLepControl(
        report.controls.floorSpaceRatio,
        fsrClause ?? null,
        lepResponse?.controls.fsr,
      ),
      minimumLotSize: withRealLepControl(
        report.controls.minimumLotSize,
        lotSizeClause ?? null,
        lepResponse?.controls.minLotSize,
      ),
      ...(report.controls.setback || lepResponse?.controls.setback
        ? {
            setback: withRealDcpControl(
              report.controls.setback,
              "Setback",
              lepResponse?.controls.setback,
            ),
          }
        : {}),
      ...(report.controls.parking || lepResponse?.controls.parking
        ? {
            parking: withRealDcpControl(
              report.controls.parking,
              "Parking",
              lepResponse?.controls.parking,
            ),
          }
        : {}),
      ...(report.controls.activeFrontageBuiltForm || lepResponse?.controls.activeFrontageBuiltForm
        ? {
            activeFrontageBuiltForm: withRealDcpControl(
              report.controls.activeFrontageBuiltForm,
              "Active frontage and built form",
              lepResponse?.controls.activeFrontageBuiltForm,
            ),
          }
        : {}),
    },
    lepEvidenceSummary,
    developmentIntent,
  };
};

const loadLepEnrichmentForProject = async (
  project: ProjectWithOptionalSiteContext,
  deps: {
    getLepContextForProject?: LepContextResolver;
    buildQuickSiteCheckLep?: QuickSiteCheckLepBuilder;
  },
): Promise<LepEnrichment> => {
  const resolver = deps.getLepContextForProject ?? getLepContextForProject;
  const quickSiteCheckLepBuilder = deps.buildQuickSiteCheckLep ?? buildQuickSiteCheckLep;
  const siteSummary = serializeSiteContext(project.siteContext ?? null, project);

  let lepContext: LepContext | null = null;
  let lepResponse: Awaited<ReturnType<typeof buildQuickSiteCheckLep>> | null = null;

  try {
    const lepResolution = await resolver({
      siteContext: siteSummary,
      fallbackLga: siteSummary?.lgaName ?? null,
    });
    lepContext = lepResolution.lepContext;
  } catch (error) {
    console.error("[artefact-service] failed to load LEP context", error);
  }

  try {
    lepResponse = await quickSiteCheckLepBuilder(project.id, { debug: true });
  } catch (error) {
    console.error("[artefact-service] failed to build LEP quick site check", error);
  }

  return { lepContext, lepResponse };
};

export const buildDcpSectionPromptBlock = (clauses: ScoredDcpClause[], sectionLabel: string) => {
  if (!clauses.length) return "";

  const clauseLines = clauses.map((clause) => {
    const sourceTitle = clause.title || clause.ref || clause.headingPath.join(" > ") || "Untitled DCP clause";
    return `DCP Source — [${sourceTitle}]: ${clause.bodyText.substring(0, 400)}`;
  });

  return [`## Retrieved DCP source text for ${sectionLabel}`, ...clauseLines].join("\n");
};

export const loadDcpClausesForSections = async (
  getDCPContextResolver: typeof getDCPContext,
  lgaCode: string,
  sections: Array<{ id: string; label: string; query: string }>,
): Promise<Map<string, ScoredDcpClause[]>> => {
  try {
    const results = await Promise.all(
      sections.map(async (section) => [section.id, await getDCPContextResolver(lgaCode, section.query)] as const),
    );

    return new Map(results);
  } catch (error) {
    console.error("[artefact-service] failed to load section DCP clauses", error);
    return new Map();
  }
};


const DETAILED_PLANNING_PACK_TOPICS = [
  { id: "setbacks", label: "Setbacks", query: "setback building line street side rear boundary" },
  { id: "parking_access", label: "Parking and access", query: "parking access driveway loading commercial centre" },
  { id: "built_form_active_frontage", label: "Built form and active frontage", query: "built form active frontage street frontage commercial centre tourist" },
  { id: "landscaping_open_space", label: "Landscaping and open space", query: "landscaping open space deep soil tree planting" },
  { id: "local_controls", label: "Other proposal-relevant local controls", query: "local controls development controls proposal design requirements" },
] as const;

const detailedPlanningPackSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  proposalBrief: z.string().trim().min(1, "A proposed-works brief is required").max(2000),
});

const isLaunchPackLga = (lgaCode?: string | null, lgaName?: string | null) => {
  const haystack = `${lgaCode ?? ""} ${lgaName ?? ""}`.toLowerCase();
  return /\b(byron|kempsey)\b/.test(haystack);
};

const compactExcerpt = (text: string, maxLength = 520) => {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength).trimEnd()}…` : compact;
};

const hasRealDcpSourceRef = (clause: Pick<ScoredDcpClause, "ref">) =>
  Boolean(clause.ref?.trim());

const SUBSTANTIVE_DCP_QUANTITATIVE_REQUIREMENT = /(?:\b\d+(?:\.\d+)?\s*(?:m2|m²|m|mm|cm|ha|%|percent|spaces?|bays?|storeys?|levels?|trees?|sqm|sq\s*m|per\s+\d+|:\s*\d+)|\b(?:nil|zero|no\s+minimum|no\s+maximum)\b|\b\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?\b)/i;
const STRONG_DCP_PRESCRIPTIVE_REQUIREMENT = /\b(?:must|shall|should|is\s+to|are\s+to|is\s+required\s+to|are\s+required\s+to|required\s+to|minimum(?:\s+of)?|maximum(?:\s+of)?|at\s+least|no\s+less\s+than|no\s+more\s+than|may\s+only|permitted\s+only|only\s+permitted|not\s+to|prohibited|not\s+permitted|designed\s+to|be\s+designed\s+to)\b/i;
const DCP_IMPERATIVE_CONTROL_SENTENCE = /^(?:(?!objectives?\b)[^:]{1,80}:\s*)?(?:controls?\s*[:—-]\s*)?(?:provide|retain|maintain|ensure)\b/i;
const ADMIN_ONLY_DCP_BODY = /^(?:table\s+of\s+contents|contents|index|introduction|administration|overview|topics?\s+include|this\s+part\s+applies)\b/i;
const GENERIC_CONTROLS_APPLY_BODY = /^controls?\s+apply(?:\s+where\s+relevant|\s+as\s+applicable)?\.?$/i;

const dcpRequirementSentences = (body: string) => {
  const rows: string[] = [];
  let context: string | null = null;

  body
    .replace(/\b(Objectives?|Controls?)\s*:/gi, "\n$1:")
    .split(/[\n\r]+/)
    .map((line) => line.replace(/^[-–—•*\s]+/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .forEach((line) => {
      if (/^objectives?\s*[:—-]?$/i.test(line)) {
        context = "Objectives:";
        return;
      }
      if (/^controls?\s*[:—-]?$/i.test(line)) {
        context = "Controls:";
        return;
      }

      line.split(/(?<=[.;])\s+/).forEach((part) => {
        const sentence = part.replace(/^[-–—•*\s]+/, "").replace(/\s+/g, " ").trim();
        if (!sentence) return;
        const hasExplicitSectionLabel = /^(?:objectives?|controls?)\s*[:—-]/i.test(sentence);
        rows.push(context && !hasExplicitSectionLabel ? `${context} ${sentence}` : sentence);
      });
    });

  return rows;
};

const isObjectiveOnlyDcpSentence = (sentence: string) =>
  /^(?:objectives?\s*[:—-]\s*)?to\s+(?:provide|retain|maintain|ensure|encourage|promote|support)\b/i.test(sentence) ||
  /^objectives?\s*[:—-]/i.test(sentence);

const hasQualitativePrescriptiveDcpRequirement = (sentence: string) => {
  if (isObjectiveOnlyDcpSentence(sentence)) return false;
  if (STRONG_DCP_PRESCRIPTIVE_REQUIREMENT.test(sentence)) return true;
  return DCP_IMPERATIVE_CONTROL_SENTENCE.test(sentence);
};

const extractQualifyingDcpRequirementRows = (clause: Pick<ScoredDcpClause, "bodyText">, controlTopic?: string | null): string[] => {
  const body = clause.bodyText.trim();
  if (!body) return [];

  const seen = new Set<string>();
  const rows: string[] = [];

  dcpRequirementSentences(body).forEach((sentence) => {
    if (isObjectiveOnlyDcpSentence(sentence)) return;
    if (!dcpEvidenceMatchesTopic(sentence, controlTopic)) return;
    if (ADMIN_ONLY_DCP_BODY.test(sentence) || GENERIC_CONTROLS_APPLY_BODY.test(sentence)) return;
    const hasRequirement =
      SUBSTANTIVE_DCP_QUANTITATIVE_REQUIREMENT.test(sentence) ||
      hasQualitativePrescriptiveDcpRequirement(sentence);
    if (!hasRequirement) return;

    const normalized = sentence.replace(/\s+/g, " ").trim();
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(normalized);
  });

  return rows;
};


const mapDcpTopicEvidence = (
  topic: (typeof DETAILED_PLANNING_PACK_TOPICS)[number],
  clauses: ScoredDcpClause[],
): DetailedPlanningPackContent["dcpEvidence"][number] => {
  const citations = clauses
    .flatMap((clause) => {
      if (!hasRealDcpSourceRef(clause)) return [];
      const qualifyingRows = extractQualifyingDcpRequirementRows(clause, topic.id);
      if (!qualifyingRows.length) return [];
      return [{
        ref: clause.ref || clause.title || clause.headingPath.join(" > ") || "DCP source",
        title: clause.title ?? null,
        headingPath: clause.headingPath ?? [],
        excerpt: compactExcerpt(qualifyingRows.join(" ")),
        score: clause.score,
      }];
    })
    .slice(0, 3);

  if (!citations.length) {
    return {
      topicId: topic.id,
      topicLabel: topic.label,
      status: "Unavailable",
      reason: "No current retrieved, zone-applicable DCP clause with a real source reference and substantive body requirement was retrieved for this topic.",
      citations: [],
    };
  }

  return {
    topicId: topic.id,
    topicLabel: topic.label,
    status: "Cited",
    reason: "Retrieved DCP evidence survived current zone/topic filtering and contains a substantive requirement in the clause body.",
    citations,
  };
};

export async function createDetailedPlanningPackArtefact({
  body,
  userId,
  deps = defaultPreSeePlanningMemoDeps,
}: {
  body: unknown;
  userId: string;
  deps?: PreSeePlanningMemoDeps;
}): Promise<{ artefact: Artefact; content: DetailedPlanningPackContent }> {
  const parsed = detailedPlanningPackSchema.safeParse(body);
  if (!parsed.success) throw new ArtefactValidationError(parsed.error.issues[0]?.message ?? "Invalid detailed planning pack payload");
  const { projectId, proposalBrief } = parsed.data;
  const project = await assertProjectAccess(deps.prisma, projectId, userId);
  const projectWithContext = await deps.prisma.project.findUnique({ where: { id: project.id }, include: { siteContext: true } });
  if (!projectWithContext?.siteContext) throw new ArtefactValidationError("Set a confirmed site before generating a Detailed Planning Pack");

  const currentSiteScope: CurrentSiteScope = {
    address: projectWithContext.siteContext.formattedAddress,
    lgaName: projectWithContext.siteContext.lgaName,
    lgaCode: projectWithContext.siteContext.lgaCode,
    zoneLabel: projectWithContext.siteContext.zone ?? projectWithContext.zoning,
    zoneCode: projectWithContext.zoningCode,
  };
  const savedQuickSiteChecks = await deps.prisma.artefact.findMany({
    where: { projectId: project.id, type: "quick_site_check" as ArtefactType },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });
  const parsedQuickSiteChecks = savedQuickSiteChecks
    .map((artefact: Artefact) => {
      const parsedReport = quickSiteCheckReportSchema.safeParse(artefact.payload);
      return parsedReport.success ? { artefact, report: parsedReport.data as QuickSiteCheckReport } : null;
    })
    .filter((entry): entry is { artefact: Artefact; report: QuickSiteCheckReport } => Boolean(entry));
  const currentQuickSiteCheck = parsedQuickSiteChecks.find(({ report }) =>
    report.lepEvidenceSummary?.label === "Cited" && isArtefactCurrentForSite(currentSiteScope, quickSiteCheckScope(report)),
  );

  if (!currentQuickSiteCheck) {
    const hasStaleCitedQuickSiteCheck = parsedQuickSiteChecks.some(({ report }) => report.lepEvidenceSummary?.label === "Cited");
    throw new ArtefactValidationError(
      hasStaleCitedQuickSiteCheck
        ? "Regenerate and save a quality-valid Quick Site Check for the current site before generating a Detailed Planning Pack"
        : "Save a quality-valid Quick Site Check with cited LEP evidence for the current site before generating a Detailed Planning Pack",
    );
  }

  const quickSiteArtefact = currentQuickSiteCheck.artefact;
  const quickSiteCheck = currentQuickSiteCheck.report;

  const lgaCode = normalizeCouncilLgaCode(quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaCode);
  if (!isLaunchPackLga(lgaCode, quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaName)) {
    throw new ArtefactValidationError("Detailed Planning Pack pilot is currently available for Byron and Kempsey only");
  }

  const siteZone = quickSiteCheck.site.zoneLabel ?? ([quickSiteCheck.site.zoneCode, quickSiteCheck.site.zoneName].filter(Boolean).join(" – ") || null);
  const topicResults = await Promise.all(DETAILED_PLANNING_PACK_TOPICS.map(async (topic) => {
    const clauses = lgaCode
      ? await deps.getDCPContext(lgaCode, [proposalBrief, siteZone, topic.query].filter(Boolean).join(" "), { siteZone })
      : [];
    const filtered = filterSiteApplicableDcpClauses(clauses, { zoneLabel: quickSiteCheck.site.zoneLabel ?? quickSiteCheck.site.zoneName, zoneCode: quickSiteCheck.site.zoneCode }, topic.id);
    return mapDcpTopicEvidence(topic, filtered);
  }));

  const unresolvedTopics = topicResults
    .filter((topic) => topic.status !== "Cited")
    .map((topic) => `${topic.topicLabel}: ${topic.reason}`);
  const citedTopicCount = topicResults.filter((topic) => topic.status === "Cited").length;
  const content: DetailedPlanningPackContent = {
    packType: "detailed_planning_pack",
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    site: {
      address: quickSiteCheck.site.address ?? projectWithContext.siteContext.formattedAddress ?? null,
      lga: quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaName ?? null,
      lgaCode,
      zoneCode: quickSiteCheck.site.zoneCode ?? null,
      zoneName: quickSiteCheck.site.zoneName ?? null,
      zoneLabel: quickSiteCheck.site.zoneLabel ?? null,
    },
    proposalBrief,
    sourceQuickSiteCheck: {
      artefactId: quickSiteArtefact.id,
      title: quickSiteArtefact.title,
      generatedAt: quickSiteCheck.generatedAt ?? quickSiteArtefact.capturedAt?.toISOString?.() ?? null,
      lepEvidenceSummary: quickSiteCheck.lepEvidenceSummary ?? null,
    },
    carriedLepEvidenceSummary: quickSiteCheck.lepEvidenceSummary ?? null,
    dcpEvidence: topicResults,
    topicMatrix: topicResults.map((topic) => ({
      topicId: topic.topicId,
      topicLabel: topic.topicLabel,
      status: topic.status,
      summary: topic.status === "Cited" ? topic.reason : "Unavailable from current retrieved DCP evidence; needs expert review before lodgement.",
      sourceRefs: topic.citations.map((citation) => citation.ref),
    })),
    unresolvedTopics,
    consultantReviewQuestions: [
      "Do the cited DCP controls apply to the exact proposed use, tenancy, works extent and site constraints?",
      "Are any uncited or unavailable topics controlled by maps, schedules, policies, overlays or council practice not yet retrieved here?",
      "What design changes or consultant inputs are needed before SEE drafting or referral?",
    ],
    nextAction: citedTopicCount > 0
      ? "Review unresolved topics with a consultant, then use this pack as the evidence base for SEE/referral preparation."
      : "Treat this as an evidence gap pack: do not progress to commercially ready SEE/referral until DCP evidence is verified.",
    commercialReady: citedTopicCount === DETAILED_PLANNING_PACK_TOPICS.length && unresolvedTopics.length === 0,
  };

  const artefact = await deps.prisma.artefact.create({
    data: {
      projectId: project.id,
      createdById: userId === DEV_BYPASS_USER_ID ? null : userId,
      type: "detailed_planning_pack" as ArtefactType,
      title: `Detailed Planning Pack${content.site.address ? ` — ${content.site.address}` : ""}`,
      source: content.site.address ?? content.site.zoneLabel ?? "Detailed Planning Pack",
      overlays: [],
      notes: `${citedTopicCount} cited DCP topic${citedTopicCount === 1 ? "" : "s"}; ${unresolvedTopics.length} unresolved topic${unresolvedTopics.length === 1 ? "" : "s"}`,
      payload: content,
      capturedAt: new Date(content.generatedAt),
    },
  });

  return { artefact, content };
}


const dppCitationSchema = z.object({
  ref: z.string(),
  title: z.string().nullable().default(null),
  headingPath: z.array(z.string()).default([]),
  excerpt: z.string(),
  score: z.number().default(0),
});

export const detailedPlanningPackContentSchema: z.ZodType<DetailedPlanningPackContent> = z.object({
  packType: z.literal("detailed_planning_pack"),
  generatedAt: z.string(),
  projectId: z.string(),
  site: z.object({
    address: z.string().nullable().default(null),
    lga: z.string().nullable().default(null),
    lgaCode: z.string().nullable().default(null),
    zoneCode: z.string().nullable().default(null),
    zoneName: z.string().nullable().default(null),
    zoneLabel: z.string().nullable().default(null),
  }),
  proposalBrief: z.string().min(1),
  sourceQuickSiteCheck: z.object({
    artefactId: z.string(),
    title: z.string(),
    generatedAt: z.string().nullable().default(null),
    lepEvidenceSummary: quickSiteCheckEvidenceSummarySchema.nullable().default(null),
  }),
  carriedLepEvidenceSummary: quickSiteCheckEvidenceSummarySchema.nullable().default(null),
  dcpEvidence: z.array(z.object({
    topicId: z.string(),
    topicLabel: z.string(),
    status: z.enum(["Cited", "Unavailable", "Needs Expert Review"]),
    reason: z.string(),
    citations: z.array(dppCitationSchema),
  })),
  topicMatrix: z.array(z.object({
    topicId: z.string(),
    topicLabel: z.string(),
    status: z.enum(["Cited", "Unavailable", "Needs Expert Review"]),
    summary: z.string(),
    sourceRefs: z.array(z.string()),
  })),
  unresolvedTopics: z.array(z.string()),
  consultantReviewQuestions: z.array(z.string()),
  nextAction: z.string(),
  commercialReady: z.boolean(),
}).passthrough();

export const currentScopeForProject = (project: ProjectWithOptionalSiteContext): CurrentSiteScope => ({
  address: project.siteContext?.formattedAddress ?? project.address ?? null,
  lgaName: project.siteContext?.lgaName ?? null,
  lgaCode: project.siteContext?.lgaCode ?? null,
  zoneLabel: project.siteContext?.zone ?? project.zoning ?? project.zoningName ?? null,
  zoneCode: project.zoningCode ?? null,
});

export const artefactRecencyMs = (artefact: Artefact, generatedAt?: string | null) => {
  const generated = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  if (Number.isFinite(generated)) return generated;
  const captured = artefact.capturedAt?.getTime?.() ?? Number.NaN;
  if (Number.isFinite(captured)) return captured;
  return artefact.createdAt?.getTime?.() ?? Number.NEGATIVE_INFINITY;
};

export type CurrentDetailedPlanningPackChain = {
  artefact: Artefact;
  pack: DetailedPlanningPackContent;
  quickSiteCheckArtefact: Artefact;
  quickSiteCheck: QuickSiteCheckReport;
};

export type CurrentDetailedPlanningPackChainResolution = {
  active: CurrentDetailedPlanningPackChain | null;
  sawPack: boolean;
  sawCurrentPack: boolean;
  sawUnreadyCurrentPack: boolean;
  candidates: Array<{ artefact: Artefact; pack: DetailedPlanningPackContent | null; quickSiteCheckArtefact?: Artefact; quickSiteCheck?: QuickSiteCheckReport; validProvenance: boolean }>;
};

export async function resolveCurrentDetailedPlanningPackChain({
  prismaClient,
  project,
}: {
  prismaClient: ArtefactDependencies["prisma"];
  project: ProjectWithOptionalSiteContext;
}): Promise<CurrentDetailedPlanningPackChainResolution> {
  const currentScope = currentScopeForProject(project);
  const artefacts = await prismaClient.artefact.findMany({
    where: { projectId: project.id, type: { in: ["detailed_planning_pack", "quick_site_check"] as ArtefactType[] } },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });
  const projectIdentifiers = [project.id, (project as { publicId?: string | null }).publicId].filter(Boolean);
  const qscById = new Map<string, { artefact: Artefact; report: QuickSiteCheckReport }>();
  for (const artefact of artefacts) {
    if (artefact.type !== "quick_site_check") continue;
    const parsed = quickSiteCheckReportSchema.safeParse(artefact.payload);
    if (parsed.success) qscById.set(artefact.id, { artefact, report: parsed.data as QuickSiteCheckReport });
  }

  const parsedPacks = artefacts
    .filter((artefact) => artefact.type === "detailed_planning_pack")
    .map((artefact) => {
      const parsed = detailedPlanningPackContentSchema.safeParse(artefact.payload);
      return parsed.success ? { artefact, pack: parsed.data } : { artefact, pack: null };
    })
    .sort((left, right) => {
      const recency = artefactRecencyMs(right.artefact, right.pack?.generatedAt) - artefactRecencyMs(left.artefact, left.pack?.generatedAt);
      return recency || left.artefact.id.localeCompare(right.artefact.id);
    });

  const sawPack = parsedPacks.length > 0;
  let sawCurrentPack = false;
  let sawUnreadyCurrentPack = false;
  let active: CurrentDetailedPlanningPackChain | null = null;
  const candidates: CurrentDetailedPlanningPackChainResolution["candidates"] = [];
  for (const { artefact, pack } of parsedPacks) {
    if (!pack) {
      candidates.push({ artefact, pack: null, validProvenance: false });
      continue;
    }
    if (pack.projectId !== project.id) {
      candidates.push({ artefact, pack, validProvenance: false });
      continue;
    }
    const current = isArtefactCurrentForSite(currentScope, detailedPlanningPackScope(pack));
    if (!current) {
      candidates.push({ artefact, pack, validProvenance: false });
      continue;
    }
    sawCurrentPack = true;
    const qscEntry = qscById.get(pack.sourceQuickSiteCheck.artefactId);
    const validProvenance = Boolean(
      qscEntry &&
      projectIdentifiers.includes(qscEntry.report.projectId) &&
      qscEntry.report.lepEvidenceSummary?.label === "Cited" &&
      isArtefactCurrentForSite(currentScope, quickSiteCheckScope(qscEntry.report)) &&
      isArtefactCurrentForSite(detailedPlanningPackScope(pack), quickSiteCheckScope(qscEntry.report)),
    );
    candidates.push({ artefact, pack, quickSiteCheckArtefact: qscEntry?.artefact, quickSiteCheck: qscEntry?.report, validProvenance });
    if (!validProvenance) continue;
    if (!active) {
      active = { artefact, pack, quickSiteCheckArtefact: qscEntry!.artefact, quickSiteCheck: qscEntry!.report };
      sawUnreadyCurrentPack = !pack.commercialReady;
    }
  }

  return { active, sawPack, sawCurrentPack, sawUnreadyCurrentPack, candidates };
}

async function resolveNewestCurrentDetailedPlanningPack({
  prismaClient,
  project,
  requireCommercialReady,
  sourceDetailedPlanningPackArtefactId,
  expectedProposalBrief,
}: {
  prismaClient: ArtefactDependencies["prisma"];
  project: ProjectWithOptionalSiteContext;
  requireCommercialReady: boolean;
  sourceDetailedPlanningPackArtefactId?: string | null;
  expectedProposalBrief?: string | null;
}) {
  const resolution = await resolveCurrentDetailedPlanningPackChain({ prismaClient, project });
  if (sourceDetailedPlanningPackArtefactId || expectedProposalBrief?.trim()) {
    if (!sourceDetailedPlanningPackArtefactId || !expectedProposalBrief?.trim()) {
      throw new ArtefactValidationError("Provide both source Detailed Planning Pack artefact ID and expected proposal brief before continuing.");
    }

    const candidate = resolution.candidates.find(({ artefact }) => artefact.id === sourceDetailedPlanningPackArtefactId);
    if (!candidate) {
      throw new ArtefactValidationError("The selected Detailed Planning Pack was not found in this project. Regenerate the pack before continuing.");
    }
    if (!candidate.pack) {
      throw new ArtefactValidationError("The selected Detailed Planning Pack is malformed. Regenerate the pack before continuing.");
    }
    if (!candidate.validProvenance || !candidate.quickSiteCheckArtefact || !candidate.quickSiteCheck) {
      throw new ArtefactValidationError("The selected Detailed Planning Pack is stale, cross-site, or missing its cited Quick Site Check provenance. Regenerate the pack before continuing.");
    }
    if (normalizeProposalBriefForBinding(candidate.pack.proposalBrief) !== normalizeProposalBriefForBinding(expectedProposalBrief)) {
      throw new ArtefactValidationError("The selected Detailed Planning Pack was generated for a different proposed-works brief. Regenerate the pack before continuing.");
    }
    if (requireCommercialReady && !candidate.pack.commercialReady) {
      throw new ArtefactValidationError("The selected Detailed Planning Pack has unresolved topics and is not commercial-ready for SEE generation. Request expert review or resolve the pack first.");
    }
    return {
      artefact: candidate.artefact,
      pack: candidate.pack,
      quickSiteCheckArtefact: candidate.quickSiteCheckArtefact,
      quickSiteCheck: candidate.quickSiteCheck,
    };
  }

  if (resolution.active) {
    if (!requireCommercialReady || resolution.active.pack.commercialReady) return resolution.active;
    throw new ArtefactValidationError("The current Detailed Planning Pack has unresolved topics and is not commercial-ready for SEE generation. Request expert review or resolve the pack first.");
  }

  const reason = !resolution.sawPack
    ? "Generate a current-site Detailed Planning Pack before continuing."
    : !resolution.sawCurrentPack
      ? "Only stale or cross-site Detailed Planning Packs were found. Generate a current-site Detailed Planning Pack."
      : resolution.sawUnreadyCurrentPack
        ? "The current Detailed Planning Pack has unresolved topics and is not commercial-ready for SEE generation. Request expert review or resolve the pack first."
        : "No current Detailed Planning Pack has an intact cited Quick Site Check provenance chain. Regenerate the pack from a saved current-site Quick Site Check.";
  throw new ArtefactValidationError(reason);
}


export async function createMapSnapshotArtefact({
  formData,
  projectId,
  userId,
  deps = { prisma, saveFile: saveFileToUploads },
}: {
  formData: FormData;
  projectId: string;
  userId: string;
  deps?: ArtefactDependencies;
}): Promise<Artefact> {
  const { file, payload } = parseMapSnapshotFormData(formData, projectId);

  const project = await assertProjectAccess(deps.prisma, projectId, userId);

  const projectWithContext = await deps.prisma.project.findUnique({
    where: { id: project.id },
    include: { siteContext: true },
  });
  const siteContext = projectWithContext?.siteContext;
  const siteAddress = siteContext?.formattedAddress?.trim() || projectWithContext?.address?.trim();
  if (!projectWithContext || !siteContext || !siteAddress) {
    throw new ArtefactValidationError("Confirm the project site before adding spatial evidence");
  }

  const siteIdentity = {
    address: siteAddress,
    lgaCode: siteContext.lgaCode,
    lgaName: siteContext.lgaName,
    parcelId: siteContext.parcelId,
    lot: siteContext.lot,
    planNumber: siteContext.planNumber,
    latitude: siteContext.latitude,
    longitude: siteContext.longitude,
    zone: siteContext.zone ?? projectWithContext.zoning,
  };
  const siteFingerprint = buildSpatialSiteFingerprint(siteIdentity);
  const contentHash = await hashSpatialEvidenceFile(file);
  const capturedAt = payload.capturedAt ?? new Date();
  const sourceCheckedAt = payload.sourceCheckedAt ?? capturedAt;
  const expiresAt = buildSpatialEvidenceExpiry(sourceCheckedAt);

  const savedFile = await deps.saveFile(file);

  return deps.prisma.artefact.create({
    data: {
      projectId: project.id,
      createdById: userId === DEV_BYPASS_USER_ID ? null : userId,
      type: "map_snapshot" as ArtefactType,
      title: payload.title,
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      overlays: payload.overlays,
      notes: payload.notes,
      imageUrl: savedFile.url,
      capturedAt,
      payload: {
        schema: "spatial_evidence.v1",
        contentHash,
        siteFingerprint,
        sourceAuthority: payload.sourceAuthority,
        legendStatus: payload.legendStatus,
        legendNotes: payload.legendNotes ?? null,
        observation: payload.observation,
        limitation: payload.limitation,
        sourceEffectiveAt: payload.sourceEffectiveAt?.toISOString() ?? null,
        sourceCheckedAt: sourceCheckedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      spatialEvidence: {
        create: {
          project: { connect: { id: project.id } },
          sourceAuthority: payload.sourceAuthority,
          contentHash,
          siteFingerprint,
          siteAddress,
          parcelId: siteContext.parcelId,
          lot: siteContext.lot,
          planNumber: siteContext.planNumber,
          latitude: siteContext.latitude,
          longitude: siteContext.longitude,
          layers: payload.overlays,
          legendStatus: payload.legendStatus,
          legendNotes: payload.legendNotes,
          observation: payload.observation,
          limitation: payload.limitation,
          observationConfirmedAt: new Date(),
          sourceEffectiveAt: payload.sourceEffectiveAt,
          sourceCheckedAt,
          expiresAt,
        },
      },
    },
    include: { spatialEvidence: { include: { reviewEvents: true } } },
  });
}

export async function createQuickSiteCheckArtefact({
  body,
  projectId,
  userId,
  deps = { prisma },
}: {
  body: unknown;
  projectId: string;
  userId: string;
  deps?: QuickSiteCheckArtefactDeps;
}): Promise<Artefact> {
  const parsed = quickSiteCheckArtefactSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid Quick Site Check payload";
    throw new ArtefactValidationError(message);
  }

  const { projectId: payloadProjectId, report, title } = parsed.data as QuickSiteCheckArtefactInput;

  const project = await assertProjectAccess(deps.prisma, projectId, userId);
  const projectIdentifiers = [project.id, (project as { publicId?: string | null }).publicId].filter(Boolean);

  if (!projectIdentifiers.includes(payloadProjectId)) {
    throw new ArtefactValidationError("Project mismatch between URL and payload");
  }

  if (!projectIdentifiers.includes(report.projectId)) {
    throw new ArtefactValidationError("Report belongs to a different project");
  }

  const projectWithContext = await deps.prisma.project.findUnique({
    where: { id: project.id },
    include: { siteContext: true },
  });

  const lepEnrichment = await loadLepEnrichmentForProject(projectWithContext ?? project, deps);
  const enrichedReport = applyRealLepEnrichmentToReport(report, lepEnrichment);

  const generatedAt = new Date(enrichedReport.generatedAt ?? Date.now());
  const capturedAt = Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt;

  const lgaCode = normalizeCouncilLgaCode(enrichedReport.site?.lga ?? enrichedReport.lepInstrument?.lga ?? null);
  const shouldEnrichWithStatutoryGrounding = Boolean(lgaCode && deps.prisma.lgaCoverageState);
  const statutoryContext = shouldEnrichWithStatutoryGrounding && lgaCode
    ? await buildStatutoryContextBlock({
        lgaCode,
        query: [
          enrichedReport.site?.zoneLabel,
          "zone permissibility floor space ratio height of buildings minimum lot size",
        ]
          .filter(Boolean)
          .join(" "),
        maxDcpClauses: 0,
        maxLepClauses: 6,
        siteZone: enrichedReport.site?.zoneLabel ?? ([enrichedReport.site?.zoneCode, enrichedReport.site?.zoneName].filter(Boolean).join(" – ") || null),
      })
    : null;
  const coverageState = lgaCode && deps.prisma.lgaCoverageState
    ? (await deps.prisma.lgaCoverageState.findUnique({ where: { lgaCode }, select: { state: true } }))?.state ?? null
    : null;

  const sourceForControl = (clauseRef: string | null | undefined, present: boolean) => {
    if (!present) return "Not in retrieved data";
    return clauseRef ? `LEP clause ${clauseRef}` : "Not in retrieved data";
  };
  const groundedReport = statutoryContext ? {
    ...enrichedReport,
    controls: {
      heightOfBuilding: {
        ...enrichedReport.controls.heightOfBuilding,
        source: enrichedReport.controls.heightOfBuilding.lepSource ? enrichedReport.controls.heightOfBuilding.source : sourceForControl(enrichedReport.controls.heightOfBuilding.clauseRef, enrichedReport.controls.heightOfBuilding.present),
        interpretation: enrichedReport.controls.heightOfBuilding.present
          ? enrichedReport.controls.heightOfBuilding.interpretation
          : "Not found in retrieved LEP data",
      },
      floorSpaceRatio: {
        ...enrichedReport.controls.floorSpaceRatio,
        source: enrichedReport.controls.floorSpaceRatio.lepSource ? enrichedReport.controls.floorSpaceRatio.source : sourceForControl(enrichedReport.controls.floorSpaceRatio.clauseRef, enrichedReport.controls.floorSpaceRatio.present),
        interpretation: enrichedReport.controls.floorSpaceRatio.present
          ? enrichedReport.controls.floorSpaceRatio.interpretation
          : "Not found in retrieved LEP data",
      },
      minimumLotSize: {
        ...enrichedReport.controls.minimumLotSize,
        source: enrichedReport.controls.minimumLotSize.lepSource ? enrichedReport.controls.minimumLotSize.source : sourceForControl(enrichedReport.controls.minimumLotSize.clauseRef, enrichedReport.controls.minimumLotSize.present),
        interpretation: enrichedReport.controls.minimumLotSize.present
          ? enrichedReport.controls.minimumLotSize.interpretation
          : "Not found in retrieved LEP data",
      },
    },
    statutoryGrounding: statutoryContext
      ? {
          lgaCode,
          coverageState,
          promptBlock: statutoryContext.promptBlock,
          instructions:
            'Answer every structured field from the retrieved clause text. If LEP data is missing, write "Not found in retrieved LEP data" and set source to "Not in retrieved data".',
        }
      : null,
  } : enrichedReport;

  const source = enrichedReport.site?.address ?? enrichedReport.site?.zoneLabel ?? "Quick Site Check";
  const notes = enrichedReport.notes.length ? enrichedReport.notes.join(" ") : null;

  return deps.prisma.artefact.create({
    data: {
      projectId: project.id,
      createdById: userId === DEV_BYPASS_USER_ID ? null : userId,
      type: "quick_site_check" as ArtefactType,
      title,
      source,
      overlays: [],
      notes,
      payload: groundedReport,
      capturedAt,
    },
  });
}


const planningFeasibilitySummaryInputSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  sourceDetailedPlanningPackArtefactId: z.string().trim().min(1, "sourceDetailedPlanningPackArtefactId is required"),
  expectedProposalBrief: z.string().trim().min(1, "expectedProposalBrief is required").max(2000),
});

const generateSeeArtefactSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  title: z.string().trim().max(200).optional(),
  proposedWorksSummary: z.string().trim().max(4000).optional(),
  sourceDetailedPlanningPackArtefactId: z.string().trim().min(1).optional(),
  expectedProposalBrief: z.string().trim().max(2000).optional(),
});

const sourceDetailedPlanningPackBindingSchema = z.object({
  sourceDetailedPlanningPackArtefactId: z.string().trim().min(1).optional(),
  expectedProposalBrief: z.string().trim().max(2000).optional(),
}).refine((value) => {
  const hasSource = Boolean(value.sourceDetailedPlanningPackArtefactId);
  const hasExpectedProposal = Boolean(value.expectedProposalBrief?.trim());
  return hasSource === hasExpectedProposal;
}, { message: "Provide both source Detailed Planning Pack artefact ID and expected proposal brief" });

const normalizeProposalBriefForBinding = (brief?: string | null) =>
  (brief ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export type SeeSourceCitation = {
  ref: string;
  type: "LEP" | "DCP";
};

export type PreSeePlanningMemoContent = {
  memoType: "pre_see_planning_memo";
  generatedAt: string;
  projectId: string;
  siteDescription: {
    address: string | null;
    lga: string | null;
    zoneCode: string | null;
    zoneName: string | null;
    zoneLabel: string | null;
  };
  proposedWorksSummary: string;
  dcpClauses: Record<string, number>;
  applicableControls: {
    lepInstrument: QuickSiteCheckReport["lepInstrument"];
    permissibility: QuickSiteCheckReport["permissibility"];
    quickSiteControls: QuickSiteCheckReport["controls"];
    dcpClauses: Array<{
      ref: string | null;
      title: string | null;
      headingPath: string[];
      bodyText: string;
      score: number;
    }>;
    sourceExcerpts: Array<{
      id: string;
      heading: string | null | undefined;
      sourceType: string;
      content: string;
      score: number;
    }>;
    statutoryContext: {
      promptBlock: string;
      lepClauses: Array<{ clauseKey: string; heading: string; value: string }>;
      dcpClauses: Array<{ clauseNumber: string; heading: string; body: string }>;
      sourceTypes: string[];
    } | null;
    groundingInstructions: string[];
  };
  consistencyAssessment: Array<{
    topic: string;
    assessment: string;
    citations?: SeeSourceCitation[];
  }>;
  limitations: string[];
  sourceDetailedPlanningPack?: {
    artefactId: string;
    title: string;
    generatedAt: string | null;
    commercialReady: boolean;
    sourceQuickSiteCheckArtefactId: string;
  };
};


const preSeePlanningMemoContentSchema = z.object({
  memoType: z.literal("pre_see_planning_memo"),
  generatedAt: z.string(),
  projectId: z.string(),
  siteDescription: z.object({
    address: z.string().nullable().default(null),
    lga: z.string().nullable().default(null),
    zoneCode: z.string().nullable().default(null),
    zoneName: z.string().nullable().default(null),
    zoneLabel: z.string().nullable().default(null),
  }),
  proposedWorksSummary: z.string(),
  applicableControls: z.object({
    lepInstrument: z.any().nullable().optional(),
    permissibility: z.any().nullable().optional(),
    quickSiteControls: z.record(z.string(), z.any()),
    dcpClauses: z.array(z.object({
      ref: z.string().nullable(),
      title: z.string().nullable(),
      headingPath: z.array(z.string()),
      bodyText: z.string(),
      score: z.number(),
    })),
    sourceExcerpts: z.array(z.any()).default([]),
    statutoryContext: z.any().nullable().optional(),
    groundingInstructions: z.array(z.string()).optional(),
  }).passthrough(),
  consistencyAssessment: z.array(z.object({
    topic: z.string(),
    assessment: z.string(),
    citations: z.array(z.object({ ref: z.string(), type: z.enum(["LEP", "DCP"]) })).optional(),
  })),
  limitations: z.array(z.string()),
  sourceDetailedPlanningPack: z.object({
    artefactId: z.string(),
    title: z.string(),
    generatedAt: z.string().nullable(),
    commercialReady: z.boolean(),
    sourceQuickSiteCheckArtefactId: z.string(),
  }).optional(),
}).passthrough();

export const parsePreSeePlanningMemoContent = (payload: unknown): WorkspacePreSeePlanningMemoContent | null => {
  const parsed = preSeePlanningMemoContentSchema.safeParse(payload);
  return parsed.success ? parsed.data as WorkspacePreSeePlanningMemoContent : null;
};


const APPLICABILITY_CONFLICT_TERMS = /\b(rural zones?|rural land|rural boundary|residential zones?|residential d1|residential accommodation|dual occupanc(?:y|ies)|secondary dwelling|dwelling houses?|bed and breakfast|large lot residential|environmental conservation|top[- ]?up housing)\b/i;
const NSW_ZONE_CODE = /\b(?:RU|R|E|MU|B|IN|SP|RE|C|W|DM)\d[A-Z]?\b/i;
const dcpEvidenceText = (clause: Pick<ScoredDcpClause, "ref" | "title" | "headingPath" | "bodyText">) =>
  [clause.ref, clause.title, clause.headingPath?.join(" "), clause.bodyText].filter(Boolean).join("\n");
const dcpTopicQualificationText = (clause: Pick<ScoredDcpClause, "title" | "headingPath" | "bodyText">) =>
  [clause.title, clause.headingPath?.join(" "), clause.bodyText].filter(Boolean).join("\n");
const zoneCodeFromSiteLabel = (zoneLabel?: string | null, zoneCode?: string | null) =>
  zoneCode?.trim().toUpperCase() || zoneLabel?.match(NSW_ZONE_CODE)?.[0]?.toUpperCase() || null;
const evidenceMentionsZone = (text: string, zoneCode: string | null) => Boolean(zoneCode && new RegExp(`\\b${zoneCode}\\b`, "i").test(text));

const DCP_TOPIC_MATCHERS: Record<string, RegExp> = {
  setbacks: /\b(setbacks?|building\s+lines?|(?:street|side|rear|front)\s+(?:boundar(?:y|ies)|alignment|setbacks?))\b/i,
  parking_access: /\b(car\s+parking|parking|access|driveways?|loading|service\s+access|vehicle\s+access|vehicular\s+access|car\s+spaces?|cars|accessible\s+spaces?|resident\s+spaces?|visitor\s+spaces?|bicycle\s+parking|motorcycle\s+space)\b/i,
  built_form_active_frontage: /\b(built\s+form|active\s+frontages?|street\s+frontages?|shopfronts?|building\s+design|commercial\s+frontages?)\b/i,
  landscaping_open_space: /\b(landscap(?:e|ing)|open\s+space|deep\s+soil|tree\s+planting|canopy\s+tree|planting)\b/i,
  local_controls: /\b(general\s+controls?|local\s+controls?|all[-\s]+development|design\s+controls?|site\s+controls?|development\s+controls?|proposal\s+design\s+requirements?|waste\s+storage|service\s+areas?|screen(?:ed|ing))\b/i,
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const dcpEvidenceMatchesTopic = (topicText: string, controlTopic?: string | null) => {
  if (!controlTopic) return true;
  const matcher = DCP_TOPIC_MATCHERS[controlTopic] ?? new RegExp(escapeRegex(controlTopic), "i");
  return matcher.test(topicText);
};

export const isSiteApplicableDcpEvidence = (params: { text: string; siteZoneLabel?: string | null; siteZoneCode?: string | null; controlTopic?: string | null; topicText?: string | null }) => {
  const zoneCode = zoneCodeFromSiteLabel(params.siteZoneLabel, params.siteZoneCode);
  const isCommercialOrTourist = zoneCode === "E2" || zoneCode === "SP3";
  const lines = params.text.split("\n").map((line) => line.trim()).filter(Boolean);
  // Structured DCP evidence is ordered ref, title, hierarchy, body. Ref is not
  // the applicability scope, and body text must not rescue a conflicting title
  // or hierarchy just because it incidentally mentions the current zone.
  const scope = lines.length >= 3 ? `${lines[1]} ${lines[2]}` : (lines[0] ?? params.text);
  const body = lines.length >= 4 ? lines.slice(3).join(" ") : params.text;
  if (isCommercialOrTourist && APPLICABILITY_CONFLICT_TERMS.test(scope) && !evidenceMentionsZone(scope, zoneCode)) return false;
  if (isCommercialOrTourist && APPLICABILITY_CONFLICT_TERMS.test(body) && !evidenceMentionsZone(body, zoneCode)) return false;
  // Topic qualification explicitly excludes the source ref. Refs remain useful
  // provenance/citation metadata, but never prove a paid-pack topic by itself.
  if (!dcpEvidenceMatchesTopic(params.topicText ?? params.text, params.controlTopic)) return false;
  return true;
};

export const filterSiteApplicableDcpClauses = <T extends Pick<ScoredDcpClause, "ref" | "title" | "headingPath" | "bodyText">>(clauses: T[], site: { zoneLabel?: string | null; zoneCode?: string | null }, controlTopic?: string | null) =>
  clauses.filter((clause) => isSiteApplicableDcpEvidence({ text: dcpEvidenceText(clause), topicText: dcpTopicQualificationText(clause), siteZoneLabel: site.zoneLabel, siteZoneCode: site.zoneCode, controlTopic }));

export const hasApplicableSeeReadinessEvidence = (memo: Pick<PreSeePlanningMemoContent, "siteDescription" | "applicableControls" | "consistencyAssessment"> | Pick<WorkspacePreSeePlanningMemoContent, "siteDescription" | "applicableControls" | "consistencyAssessment"> | null) => {
  if (!memo) return false;
  const hasSiteZone = Boolean(memo.siteDescription.zoneCode || memo.siteDescription.zoneName || memo.siteDescription.zoneLabel);
  if (!hasSiteZone) return false;
  const site = { zoneLabel: memo.siteDescription.zoneLabel ?? memo.siteDescription.zoneName, zoneCode: memo.siteDescription.zoneCode };
  const applicableDcpRefs = new Set(
    (memo.applicableControls.dcpClauses ?? [])
      .filter((clause) => isSiteApplicableDcpEvidence({ text: [clause.ref, clause.title, clause.headingPath?.join(" "), clause.bodyText].filter(Boolean).join("\n"), siteZoneLabel: site.zoneLabel, siteZoneCode: site.zoneCode }))
      .map((clause) => clause.title || clause.ref || clause.headingPath.join(" > "))
      .filter(Boolean),
  );
  const applicableLepRefs = new Set<string>();
  Object.values(memo.applicableControls.quickSiteControls ?? {}).forEach((control) => {
    if (!hasVerifiedLepControlEvidence(control as QuickSiteCheckControl)) return;
    const clauseRef = (control as QuickSiteCheckControl).clauseRef!.trim();
    applicableLepRefs.add(clauseRef);
    applicableLepRefs.add(`cl. ${clauseRef}`);
  });
  const hasApplicableCitation = memo.consistencyAssessment.some((item) =>
    (item.citations ?? []).some((citation) => {
      if (citation.type === "DCP") return applicableDcpRefs.has(citation.ref);
      if (citation.type !== "LEP") return false;
      return Array.from(applicableLepRefs).some((ref) => new RegExp(`(^|\\s)${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(citation.ref));
    }),
  );
  const hasApplicableDcpBody = applicableDcpRefs.size > 0;
  return hasApplicableCitation || hasApplicableDcpBody;
};

export const hasExactSeeEvidenceProvenance = (
  memo: WorkspacePreSeePlanningMemoContent,
  pack: DetailedPlanningPackContent,
  quickSiteCheck: QuickSiteCheckReport,
) => {
  if (
    !hasApplicableSeeReadinessEvidence(memo) ||
    memo.projectId !== pack.projectId ||
    memo.proposedWorksSummary.trim() !== pack.proposalBrief.trim() ||
    memo.sourceDetailedPlanningPack?.commercialReady !== pack.commercialReady
  ) {
    return false;
  }

  const verifiedControls = sanitiseQuickSiteLepControls(quickSiteCheck.controls);
  const expectedDcpClauses = pack.dcpEvidence.flatMap((topic) =>
    topic.citations.map((citation) => ({
      ref: citation.ref,
      title: citation.title ?? null,
      headingPath: citation.headingPath,
      bodyText: citation.excerpt,
      score: citation.score,
    })),
  );
  const expectedSourceExcerpts = pack.dcpEvidence.flatMap((topic) =>
    topic.citations.map((citation) => ({
      id: `${topic.topicId}:${citation.ref}`,
      heading: citation.title ?? topic.topicLabel,
      sourceType: "detailed_planning_pack",
      content: citation.excerpt,
      score: citation.score,
    })),
  );
  const instrumentName = quickSiteCheck.lepInstrument?.name ?? null;
  const citationForControl = (control: QuickSiteCheckControl): SeeSourceCitation[] =>
    hasVerifiedLepControlEvidence(control) && instrumentName
      ? [{ ref: `${instrumentName} cl. ${control.clauseRef}`, type: "LEP" }]
      : [];
  const permissibilityCitations: SeeSourceCitation[] =
    hasVerifiedLepPermissibilityEvidence(quickSiteCheck) && instrumentName
      ? [{ ref: `${instrumentName} cl. 2.3`, type: "LEP" }]
      : [];
  const expectedConsistencyAssessment = [
    {
      topic: "Land use permissibility",
      assessment:
        quickSiteCheck.permissibility?.interpretation ??
        "Permissibility could not be confirmed from the saved Quick Site Check. Confirm the land use against the LEP before relying on this memo.",
      citations: permissibilityCitations,
    },
    {
      topic: "Height of building",
      assessment: verifiedControls.heightOfBuilding.interpretation,
      citations: citationForControl(verifiedControls.heightOfBuilding),
    },
    {
      topic: "Floor space ratio",
      assessment: verifiedControls.floorSpaceRatio.interpretation,
      citations: citationForControl(verifiedControls.floorSpaceRatio),
    },
    {
      topic: "Minimum lot size",
      assessment: verifiedControls.minimumLotSize.interpretation,
      citations: citationForControl(verifiedControls.minimumLotSize),
    },
    ...pack.topicMatrix.map((topic) => ({
      topic: topic.topicLabel,
      assessment: topic.summary,
      citations: topic.sourceRefs.map((ref) => ({ ref, type: "DCP" as const })),
    })),
  ];

  return (
    expectedDcpClauses.length > 0 &&
    hasSameEvidenceSnapshot(
      memo.applicableControls.lepInstrument ?? null,
      quickSiteCheck.lepInstrument ?? null,
    ) &&
    hasSameEvidenceSnapshot(
      memo.applicableControls.permissibility ?? null,
      quickSiteCheck.permissibility ?? null,
    ) &&
    hasSameEvidenceSnapshot(memo.applicableControls.quickSiteControls, verifiedControls) &&
    hasSameEvidenceSnapshot(memo.applicableControls.dcpClauses, expectedDcpClauses) &&
    hasSameEvidenceSnapshot(memo.applicableControls.sourceExcerpts, expectedSourceExcerpts) &&
    hasSameEvidenceSnapshot(memo.consistencyAssessment, expectedConsistencyAssessment)
  );
};

const buildControlAssessment = (
  label: string,
  interpretation: string,
  citations: SeeSourceCitation[] = [],
) => ({
  topic: label,
  assessment: interpretation,
  citations,
});

const buildLepCitationRef = (instrumentName: string | null | undefined, clauseRef: string | null | undefined) => {
  if (!instrumentName || !clauseRef) return null;
  return `${instrumentName} cl. ${clauseRef}`;
};


type PreSeePlanningMemoDeps = {
  prisma: ArtefactDependencies["prisma"];
  buildQuickSiteCheckReport: typeof buildQuickSiteCheckReport;
  getDCPContext: typeof getDCPContext;
  getWorkspaceSourceContext: typeof getWorkspaceSourceContext;
  buildStatutoryContextBlock?: typeof buildStatutoryContextBlock;
  getLepContextForProject?: LepContextResolver;
  buildQuickSiteCheckLep?: QuickSiteCheckLepBuilder;
};

const defaultPreSeePlanningMemoDeps: PreSeePlanningMemoDeps = {
  prisma,
  buildQuickSiteCheckReport,
  getDCPContext,
  getWorkspaceSourceContext,
  buildStatutoryContextBlock,
};

export async function createPreSeePlanningMemoArtefact({
  body,
  userId,
  deps = defaultPreSeePlanningMemoDeps,
}: {
  body: unknown;
  userId: string;
  deps?: PreSeePlanningMemoDeps;
}): Promise<{ artefact: Artefact; content: PreSeePlanningMemoContent }> {
  const parsed = generateSeeArtefactSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid pre-SEE memo payload";
    throw new ArtefactValidationError(message);
  }

  const { projectId, title, sourceDetailedPlanningPackArtefactId, expectedProposalBrief } = parsed.data;
  const project = await assertProjectAccess(deps.prisma, projectId, userId);
  const projectWithContext = await deps.prisma.project.findUnique({
    where: { id: project.id },
    include: { siteContext: true },
  });

  if (!projectWithContext) {
    throw new ArtefactAccessError("Project not found or access denied", 404);
  }

  if (!projectWithContext.siteContext) {
    throw new ArtefactValidationError("Set a confirmed site before generating a pre-SEE planning memo");
  }

  const resolvedPack = await resolveNewestCurrentDetailedPlanningPack({
    prismaClient: deps.prisma,
    project: projectWithContext,
    requireCommercialReady: true,
    sourceDetailedPlanningPackArtefactId,
    expectedProposalBrief,
  });
  const proposedWorksSummary = resolvedPack.pack.proposalBrief;
  const quickSiteCheck = resolvedPack.quickSiteCheck;
  const verifiedQuickSiteControls = sanitiseQuickSiteLepControls(quickSiteCheck.controls);
  const lepInstrumentName = quickSiteCheck.lepInstrument?.name ?? null;
  const siteDescription = {
    address: resolvedPack.pack.site.address ?? quickSiteCheck.site.address ?? projectWithContext.siteContext.formattedAddress ?? null,
    lga: resolvedPack.pack.site.lga ?? quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaName ?? null,
    zoneCode: resolvedPack.pack.site.zoneCode ?? quickSiteCheck.site.zoneCode ?? null,
    zoneName: resolvedPack.pack.site.zoneName ?? quickSiteCheck.site.zoneName ?? null,
    zoneLabel: resolvedPack.pack.site.zoneLabel ?? quickSiteCheck.site.zoneLabel ?? null,
  };

  const dppCitations = resolvedPack.pack.dcpEvidence.flatMap((topic) =>
    topic.citations.map((citation) => ({ topic, citation })),
  );
  if (!dppCitations.length) {
    throw new ArtefactValidationError("The current Detailed Planning Pack has no applicable cited DCP evidence for SEE generation");
  }
  const citationForControl = (control: QuickSiteCheckControl) => {
    if (!hasVerifiedLepControlEvidence(control)) return [];
    const ref = buildLepCitationRef(lepInstrumentName, control.clauseRef);
    return ref ? [{ ref, type: "LEP" as const }] : [];
  };
  const permissibilityCitations =
    hasVerifiedLepPermissibilityEvidence(quickSiteCheck) && lepInstrumentName
      ? [{ ref: `${lepInstrumentName} cl. 2.3`, type: "LEP" as const }]
      : [];

  const controlAssessments = [
    buildControlAssessment(
      "Land use permissibility",
      quickSiteCheck.permissibility?.interpretation ??
        "Permissibility could not be confirmed from the saved Quick Site Check. Confirm the land use against the LEP before relying on this memo.",
      permissibilityCitations,
    ),
    buildControlAssessment(
      "Height of building",
      verifiedQuickSiteControls.heightOfBuilding.interpretation,
      citationForControl(verifiedQuickSiteControls.heightOfBuilding),
    ),
    buildControlAssessment(
      "Floor space ratio",
      verifiedQuickSiteControls.floorSpaceRatio.interpretation,
      citationForControl(verifiedQuickSiteControls.floorSpaceRatio),
    ),
    buildControlAssessment(
      "Minimum lot size",
      verifiedQuickSiteControls.minimumLotSize.interpretation,
      citationForControl(verifiedQuickSiteControls.minimumLotSize),
    ),
    ...resolvedPack.pack.topicMatrix.map((topic) => buildControlAssessment(
      topic.topicLabel,
      topic.summary,
      topic.sourceRefs.map((ref) => ({ ref, type: "DCP" as const })),
    )),
  ];

  const dcpPromptBlock = resolvedPack.pack.dcpEvidence
    .filter((topic) => topic.citations.length > 0)
    .map((topic) => buildDcpSectionPromptBlock(topic.citations.map((citation) => ({
      ref: citation.ref,
      title: citation.title,
      headingPath: citation.headingPath,
      bodyText: citation.excerpt,
      score: citation.score,
    } as ScoredDcpClause)), topic.topicLabel))
    .filter(Boolean)
    .join("\n\n");

  const content: PreSeePlanningMemoContent = {
    memoType: "pre_see_planning_memo",
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    dcpClauses: Object.fromEntries(resolvedPack.pack.topicMatrix.map((topic) => [topic.topicId, topic.sourceRefs.length])),
    siteDescription,
    proposedWorksSummary,
    applicableControls: {
      lepInstrument: quickSiteCheck.lepInstrument ?? null,
      permissibility: quickSiteCheck.permissibility ?? null,
      quickSiteControls: verifiedQuickSiteControls,
      dcpClauses: dppCitations.map(({ citation }) => ({
        ref: citation.ref,
        title: citation.title ?? null,
        headingPath: citation.headingPath,
        bodyText: citation.excerpt,
        score: citation.score,
      })),
      sourceExcerpts: dppCitations.map(({ topic, citation }) => ({
        id: `${topic.topicId}:${citation.ref}`,
        heading: citation.title ?? topic.topicLabel,
        sourceType: "detailed_planning_pack",
        content: citation.excerpt,
        score: citation.score,
      })),
      statutoryContext: dcpPromptBlock
        ? { promptBlock: dcpPromptBlock, lepClauses: [], dcpClauses: [], sourceTypes: ["detailed_planning_pack"] }
        : null,
      groundingInstructions: [
        "Use the persisted Detailed Planning Pack as the primary DCP evidence snapshot. Do not invent or replace pack citations.",
        "The proposed works summary, site, zone and DCP citations are server-derived from the saved Detailed Planning Pack.",
        "Every SEE section JSON object must include citations from the saved Quick Site Check or Detailed Planning Pack where available.",
      ],
    },
    consistencyAssessment: controlAssessments,
    limitations: [
      "This is an MVP pre-SEE planning memo, not a final legal Statement of Environmental Effects.",
      "This memo is derived from a saved Detailed Planning Pack and its cited Quick Site Check provenance chain.",
      "Confirm all controls against the current LEP, DCP, planning certificates, council mapping and specialist reports before lodgement.",
    ],
    sourceDetailedPlanningPack: {
      artefactId: resolvedPack.artefact.id,
      title: resolvedPack.artefact.title,
      generatedAt: resolvedPack.pack.generatedAt ?? resolvedPack.artefact.capturedAt?.toISOString?.() ?? null,
      commercialReady: resolvedPack.pack.commercialReady,
      sourceQuickSiteCheckArtefactId: resolvedPack.quickSiteCheckArtefact.id,
    },
  };

  const artefact = await deps.prisma.artefact.create({
    data: {
      projectId: project.id,
      createdById: userId === DEV_BYPASS_USER_ID ? null : userId,
      type: "pre_see_planning_memo" as ArtefactType,
      title: title || `Pre-SEE planning memo — ${siteDescription.address ?? project.title}`,
      source: siteDescription.address ?? "Pre-SEE planning memo",
      overlays: [],
      notes: content.limitations[0],
      payload: content,
      capturedAt: new Date(content.generatedAt),
    },
  });

  return { artefact, content };
}


export async function createPlanningFeasibilitySummaryArtefact({
  body,
  userId,
  deps = { prisma },
}: {
  body: unknown;
  userId: string;
  deps?: { prisma: ArtefactDependencies["prisma"] };
}): Promise<{ artefact: Artefact; content: FeasibilityContent }> {
  const parsed = planningFeasibilitySummaryInputSchema.safeParse(body);
  if (!parsed.success) throw new ArtefactValidationError(parsed.error.issues[0]?.message ?? "Invalid planning feasibility summary payload");

  const project = await assertProjectAccess(deps.prisma, parsed.data.projectId, userId);
  const projectWithContext = await deps.prisma.project.findUnique({ where: { id: project.id }, include: { siteContext: true } });
  if (!projectWithContext?.siteContext) throw new ArtefactValidationError("Set a confirmed site before generating a planning feasibility summary");

  const resolvedPack = await resolveNewestCurrentDetailedPlanningPack({
    prismaClient: deps.prisma,
    project: projectWithContext,
    requireCommercialReady: false,
    sourceDetailedPlanningPackArtefactId: parsed.data.sourceDetailedPlanningPackArtefactId,
    expectedProposalBrief: parsed.data.expectedProposalBrief,
  });
  const content = buildPlanningFeasibilitySummary({
    projectId: project.id,
    packArtefact: resolvedPack.artefact,
    pack: resolvedPack.pack,
    quickSiteCheckArtefact: resolvedPack.quickSiteCheckArtefact,
    quickSiteCheck: resolvedPack.quickSiteCheck,
  });
  const address = resolvedPack.pack.site.address ?? resolvedPack.quickSiteCheck.site.address ?? projectWithContext.siteContext.formattedAddress;
  const artefact = await deps.prisma.artefact.create({
    data: {
      projectId: project.id,
      createdById: userId === DEV_BYPASS_USER_ID ? null : userId,
      type: "feasibility" as ArtefactType,
      title: "Planning Feasibility Summary",
      source: address ?? "Planning Feasibility Summary",
      overlays: [],
      notes: content.summary,
      payload: content,
      capturedAt: new Date(content.generatedAt),
    },
  });

  return { artefact, content };
}

export async function createExpertReviewRequestArtefact({
  body,
  userId,
}: {
  body: unknown;
  userId: string;
}, deps: { prisma: unknown } = { prisma }) {
  const parsed = z.object({
    projectId: z.string().trim().min(1),
  }).merge(sourceDetailedPlanningPackBindingSchema).safeParse(body);
  if (!parsed.success) {
    throw new ArtefactValidationError(parsed.error.issues[0]?.message ?? "Invalid review request payload");
  }

  const prismaClient = deps.prisma as ArtefactDependencies["prisma"];
  const project = await assertProjectAccess(prismaClient, parsed.data.projectId, userId);
  const projectWithContext = await prismaClient.project.findUnique({ where: { id: project.id }, include: { siteContext: true } });
  if (!projectWithContext?.siteContext) throw new ArtefactValidationError("Set a confirmed site before requesting expert review");

  const resolvedPack = await resolveNewestCurrentDetailedPlanningPack({
    prismaClient,
    project: projectWithContext,
    requireCommercialReady: false,
    sourceDetailedPlanningPackArtefactId: parsed.data.sourceDetailedPlanningPackArtefactId,
    expectedProposalBrief: parsed.data.expectedProposalBrief,
  });
  const qsc = resolvedPack.quickSiteCheck;
  const pack = resolvedPack.pack;
  const quickSiteCheck = resolvedPack.quickSiteCheckArtefact;
  const detailedPlanningPack = resolvedPack.artefact;
  const currentScope = currentScopeForProject(projectWithContext);

  const seeCandidates = await prismaClient.artefact.findMany({
    where: { projectId: project.id, type: "pre_see_planning_memo" as ArtefactType },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });
  const seeMemoEntry = seeCandidates
    .map((artefact) => ({ artefact, see: parsePreSeePlanningMemoContent(artefact.payload) }))
    .find(({ see }) => Boolean(
      pack.commercialReady === true &&
      see &&
      see.sourceDetailedPlanningPack?.artefactId === detailedPlanningPack.id &&
      see.sourceDetailedPlanningPack?.sourceQuickSiteCheckArtefactId === quickSiteCheck.id &&
      isArtefactCurrentForSite(currentScope, preSeeScope(see)) &&
      isArtefactCurrentForSite(detailedPlanningPackScope(pack), preSeeScope(see)) &&
      hasExactSeeEvidenceProvenance(see, pack, qsc),
    ));
  const seeMemo = seeMemoEntry?.artefact;
  const see = seeMemoEntry?.see;

  const lepEvidenceSummary = qsc.lepEvidenceSummary ?? pack.carriedLepEvidenceSummary ?? null;
  const verifiedLepControls = sanitiseQuickSiteLepControls(qsc.controls);
  const controls = [
    verifiedLepControls.heightOfBuilding,
    verifiedLepControls.floorSpaceRatio,
    verifiedLepControls.minimumLotSize,
  ];
  const citedSources = new Map<string, { ref: string; type: "LEP" | "DCP" }>();
  [
    verifiedLepControls.heightOfBuilding,
    verifiedLepControls.floorSpaceRatio,
    verifiedLepControls.minimumLotSize,
  ].filter(hasVerifiedLepControlEvidence).forEach((control) => {
    citedSources.set(`LEP:${control.clauseRef}`, { ref: control.clauseRef, type: "LEP" });
  });
  pack.dcpEvidence.forEach((topic) =>
    topic.citations.forEach((citation) =>
      citedSources.set(`DCP:${citation.ref}`, { ref: citation.ref, type: "DCP" }),
    ),
  );

  const confidenceGaps = [
    !lepEvidenceSummary
      ? "LEP evidence quality: unavailable in the saved Quick Site Check; planner should verify LEP provenance before relying on the handoff."
      : lepEvidenceSummary.label === "Unavailable"
        ? `LEP evidence quality: ${lepEvidenceSummary.detail}`
        : null,
    ...controls.filter((control) => control.confidence !== "Cited").map((control) => `${control.label}: ${control.interpretation}`),
    ...pack.unresolvedTopics.map((topic) => `Detailed Planning Pack unresolved topic: ${topic}`),
    ...(see?.limitations ?? []),
  ].filter((item): item is string => Boolean(item));
  const missingInputs = [
    !qsc.site?.address && "Confirmed street address",
    !qsc.site?.zoneLabel && "Confirmed zoning layer",
    !pack.proposalBrief && "Detailed Planning Pack proposal brief",
    citedSources.size === 0 && "Cited LEP/DCP sources",
    pack.commercialReady && !seeMemo && "Matching SEE generated from the current Detailed Planning Pack",
  ].filter((item): item is string => Boolean(item));
  const assumptions = [
    `Proposed works from Detailed Planning Pack: ${pack.proposalBrief}`,
    qsc.permissibility?.interpretation ?? null,
    pack.commercialReady ? "Detailed Planning Pack is marked commercial-ready." : "Detailed Planning Pack is unresolved; this referral does not claim SEE readiness.",
    "Planner to verify currency of council controls before lodgement advice.",
  ].filter((item): item is string => Boolean(item));

  const generatedAt = new Date().toISOString();
  const includedArtefacts: import("@/types/workspace").ReviewRequestContent["includedArtefacts"] = [
    {
      type: "quick_site_check",
      id: quickSiteCheck.id,
      title: quickSiteCheck.title,
      generatedAt: quickSiteCheck.capturedAt?.toISOString() ?? quickSiteCheck.createdAt.toISOString(),
    },
    {
      type: "detailed_planning_pack",
      id: detailedPlanningPack.id,
      title: detailedPlanningPack.title,
      generatedAt: detailedPlanningPack.capturedAt?.toISOString() ?? detailedPlanningPack.createdAt.toISOString(),
    },
  ];
  if (seeMemo) {
    includedArtefacts.push({
      type: "pre_see_planning_memo",
      id: seeMemo.id,
      title: seeMemo.title,
      generatedAt: seeMemo.capturedAt?.toISOString() ?? seeMemo.createdAt.toISOString(),
    });
  }

  const citedRequirements = pack.dcpEvidence.flatMap((topic) =>
    topic.citations.map((citation) => ({
      topicId: topic.topicId,
      topicLabel: topic.topicLabel,
      ref: citation.ref,
      title: citation.title ?? null,
      headingPath: citation.headingPath,
      excerpt: citation.excerpt,
    })),
  );
  const consultantNeeds = buildConsultantNeedsMatrix({
    quickSiteCheck: qsc,
    detailedPlanningPack: pack,
  });
  const disciplinePackages = buildDisciplineReferralPackages({
    proposalBrief: pack.proposalBrief,
    consultantNeeds,
  });

  const payload: import("@/types/workspace").ReviewRequestContent = {
    requestType: "expert_review_request",
    generatedAt,
    projectId: project.id,
    site: {
      address: pack.site.address ?? qsc.site.address ?? project.address ?? null,
      lga: pack.site.lga ?? qsc.site.lga ?? null,
      zoneLabel: pack.site.zoneLabel ?? qsc.site.zoneLabel ?? project.zoning ?? project.zoningName ?? null,
    },
    packageSummary: seeMemo
      ? "Expert review package assembled from the current Quick Site Check, Detailed Planning Pack and matching SEE draft."
      : "Expert review package assembled from the current Quick Site Check and unresolved Detailed Planning Pack. No SEE readiness is claimed.",
    includedArtefacts,
    citedSources: Array.from(citedSources.values()),
    lepEvidenceSummary,
    detailedPlanningPack: {
      artefactId: detailedPlanningPack.id,
      title: detailedPlanningPack.title,
      generatedAt: pack.generatedAt ?? detailedPlanningPack.capturedAt?.toISOString() ?? null,
      proposalBrief: pack.proposalBrief,
      commercialReady: pack.commercialReady,
      topicMatrix: pack.topicMatrix,
      unresolvedTopics: pack.unresolvedTopics,
      sourceQuickSiteCheckArtefactId: quickSiteCheck.id,
      citedRequirements,
    },
    sourceSeeMemo: seeMemo ? {
      artefactId: seeMemo.id,
      title: seeMemo.title,
      generatedAt: see?.generatedAt ?? seeMemo.capturedAt?.toISOString() ?? null,
      sourceDetailedPlanningPackArtefactId: see?.sourceDetailedPlanningPack?.artefactId ?? null,
    } : null,
    confidenceGaps: confidenceGaps.length ? confidenceGaps : ["No explicit confidence gaps were found; planner should still verify assumptions."],
    missingInputs: missingInputs.length ? missingInputs : ["No obvious missing inputs detected by Plannera."],
    assumptions,
    recommendedReviewScope: [
      "Confirm permissibility pathway and consent requirements.",
      "Check Quick Site Check and Detailed Planning Pack citations against current council instruments.",
      ...(pack.unresolvedTopics.length ? ["Resolve the Detailed Planning Pack unresolved topics before treating this as SEE-ready."] : []),
      "Review SEE limitations, assumptions and any inferred controls before paid export or lodgement use.",
    ],
    consultantNeedsVersion: "consultant-needs.v1",
    consultantNeeds,
    disciplinePackages,
  };

  const artefact = await prismaClient.artefact.create({
    data: {
      projectId: project.id,
      createdById: userId === DEV_BYPASS_USER_ID ? null : userId,
      type: "review_request" as ArtefactType,
      title: `Expert review request — ${payload.site.address ?? project.title}`,
      source: payload.site.address ?? "Expert review request",
      overlays: [],
      notes: `${payload.includedArtefacts.length} artefacts · ${payload.citedSources.length} cited sources · ${payload.confidenceGaps.length} review gaps`,
      payload,
      capturedAt: new Date(generatedAt),
    },
  });

  return { artefact, content: payload };
}

export async function listProjectArtefacts(projectId: string, userId: string, deps = { prisma }) {
  const project = await assertProjectAccess(deps.prisma, projectId, userId);

  return deps.prisma.artefact.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: { spatialEvidence: { include: { reviewEvents: { orderBy: { createdAt: "asc" } } } } },
  });
}
