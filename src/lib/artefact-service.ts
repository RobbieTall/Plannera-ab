import { z } from "zod";

import { NEXT_AUTH_SESSION_COOKIE, authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDCPContext } from "@/lib/dcp/get-dcp-context";
import type { ScoredDcpClause } from "@/lib/dcp/search";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import { buildQuickSiteCheckReport } from "@/lib/quick-site-check";
import { summariseQuickSiteCheckEvidence } from "@/lib/quick-site-check-evidence";
import { buildQuickSiteCheckLep } from "@/lib/lep/quick-site-check";
import { getLepContextForProject, type LepClauseContext, type LepContext } from "@/lib/lep/lep-context";
import { serializeSiteContext } from "@/lib/site-context";
import { saveFileToUploads, type SavedFile } from "@/lib/storage";
import { getWorkspaceSourceContext } from "@/lib/workspace-source-context";
import { buildStatutoryContextBlock } from "@/lib/statutory-context-builder";
import { callModel } from "@/lib/modelRouter";
import { findProjectByExternalId } from "./project-identifiers";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { Artefact, ArtefactType, PrismaClient } from "@prisma/client";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type { FeasibilityContent } from "@/types/workspace";

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
  .transform((values) => values.filter((entry) => entry.length > 0));

const mapSnapshotSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  title: z.string().trim().min(1, "title is required").max(200),
  source: z.string().trim().min(1, "source is required").max(200),
  sourceUrl: z.string().url().trim().optional(),
  overlays: overlayEntrySchema.default([]),
  notes: z.string().trim().max(2000).optional(),
  capturedAt: z.preprocess((value) => (value ? new Date(value as string) : undefined), z.date().optional()),
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

const quickSiteCheckReportSchema = z
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
        zoneLabel: z.string().nullable().optional(),
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
    lepEvidenceSummary: quickSiteCheckEvidenceSummarySchema.nullable().optional(),
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
  sourceUrl?: string;
  overlays: string[];
  notes?: string;
  capturedAt?: Date;
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

const withRealLepControl = (
  control: QuickSiteCheckReport["controls"]["heightOfBuilding"],
  clause: LepClauseContext | null,
) => {
  if (!clause) return { ...control, lepSource: false };

  const parsedValue = extractNumericControlValue(clause);
  if (!parsedValue) return { ...control, lepSource: false };

  const clauseTitle = clause.title ? `${clause.ref}: ${clause.title}` : clause.ref;

  return {
    ...control,
    value: parsedValue,
    present: true,
    clauseRef: clause.ref,
    detail: truncatePromptText(clause.text),
    source: "lep",
    lepSource: true,
    interpretation: `${control.label} is ${parsedValue} based on retrieved LEP clause ${clauseTitle}. Verify the mapped value against the official LEP map before lodgement.`,
  } satisfies QuickSiteCheckReport["controls"][keyof QuickSiteCheckReport["controls"]];
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
      heightOfBuilding: withRealLepControl(report.controls.heightOfBuilding, heightClause ?? null),
      floorSpaceRatio: withRealLepControl(report.controls.floorSpaceRatio, fsrClause ?? null),
      minimumLotSize: withRealLepControl(report.controls.minimumLotSize, lotSizeClause ?? null),
    },
    lepEvidenceSummary,
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

const SEE_SECTION_DCP_QUERIES = [
  { id: "setbacks", label: "Setbacks", query: "setback building line street side rear boundary" },
  { id: "height", label: "Building Height", query: "height storey building height plane levels" },
  { id: "parking", label: "Car Parking", query: "parking car space visitor bicycle driveway" },
  { id: "landscaping", label: "Landscaping", query: "landscaping deep soil tree vegetation planting" },
  { id: "site_coverage", label: "Site Coverage", query: "site coverage floor area plot ratio site density" },
  { id: "private_open_space", label: "Private Open Space", query: "private open space POS courtyard balcony" },
  { id: "character", label: "Character and Appearance", query: "character streetscape appearance context" },
  { id: "flooding", label: "Flood Risk", query: "flood flooding floodplain" },
];

const buildDcpSectionPromptContext = (sectionClauses: Map<string, ScoredDcpClause[]>) =>
  SEE_SECTION_DCP_QUERIES.map((section) => buildDcpSectionPromptBlock(sectionClauses.get(section.id) ?? [], section.label))
    .filter(Boolean)
    .join("\n\n");

const countDcpClausesBySection = (sectionClauses: Map<string, ScoredDcpClause[]>) =>
  SEE_SECTION_DCP_QUERIES.reduce<Record<string, number>>((counts, section) => {
    counts[section.id] = sectionClauses.get(section.id)?.length ?? 0;
    return counts;
  }, {});

const buildPreSeeLepPromptBlock = (enrichment: LepEnrichment, quickSiteCheck: QuickSiteCheckReport) => {
  const lepResponse = isRealLepResponse(enrichment.lepResponse) ? enrichment.lepResponse : null;
  if (!enrichment.lepContext && !lepResponse) return null;

  const controls = quickSiteCheck.controls;
  const clauseLines = (enrichment.lepContext?.clauses ?? []).slice(0, 5).map((clause) => {
    const title = clause.title ? ` ${clause.title}` : "";
    return `- Clause ${clause.ref}${title}: ${truncatePromptText(clause.text)}`;
  });

  return [
    "=== REAL LEP ZONE CONTEXT FOR PRE-SEE MEMO ===",
    `Zone: ${lepResponse?.zone ?? quickSiteCheck.site.zoneLabel ?? quickSiteCheck.site.zoneCode ?? "Not found in retrieved LEP data"}`,
    `Objectives: ${formatPromptList(lepResponse?.objectives)}`,
    `Permissible uses with consent: ${formatPromptList(lepResponse?.landUse.withConsent)}`,
    `Permissible uses without consent: ${formatPromptList(lepResponse?.landUse.withoutConsent)}`,
    `Height limit: ${controls.heightOfBuilding.value ?? "Not found in retrieved LEP data"}`,
    `FSR: ${controls.floorSpaceRatio.value ?? "Not found in retrieved LEP data"}`,
    `Minimum lot size: ${controls.minimumLotSize.value ?? "Not found in retrieved LEP data"}`,
    "Top LEP clauses (verbatim excerpts, truncated):",
    clauseLines.length ? clauseLines.join("\n") : "No LEP clause excerpts were retrieved.",
    "=== END REAL LEP ZONE CONTEXT ===",
  ].join("\n");
};

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
      capturedAt: payload.capturedAt ?? new Date(),
    },
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


const feasibilityItemSchema = z.object({
  label: z.string().trim().min(1),
  verdict: z.enum(["proceed", "caution", "redesign", "blocked", "unresolved"]),
  detail: z.string().trim().min(1),
  confidence: z.enum(["cited", "inferred", "unavailable"]),
  source: z.string().trim().min(1).optional(),
});

const feasibilityContentSchema = z.object({
  developmentType: z.string().trim().min(1),
  overallVerdict: z.enum(["proceed", "caution", "redesign", "blocked", "unresolved"]),
  summary: z.string().trim().min(1),
  items: z.array(feasibilityItemSchema).min(1),
  generatedAt: z.string().trim().min(1),
});

const fallbackFeasibilityContent = (
  developmentType: string,
  siteContext: { lga?: string; zone?: string },
  address: string,
  reason?: string,
): FeasibilityContent => ({
  developmentType,
  overallVerdict: "unresolved",
  summary: [
    `Feasibility for ${developmentType} at ${address} could not be confirmed from available retrieved planning data.`,
    siteContext.zone ? `Known zone: ${siteContext.zone}.` : "Zone was not available in the workspace context.",
    reason ? `Reason: ${reason}.` : "Confirm LEP permissibility, development standards and site constraints before proceeding.",
  ].join(" "),
  items: [
    {
      label: "Land use permissibility",
      verdict: "unresolved",
      detail: "Retrieved LEP permissibility data was unavailable or insufficient for a reliable go/no-go finding.",
      confidence: "unavailable",
    },
    {
      label: "Height, FSR and lot size standards",
      verdict: "unresolved",
      detail: "Development standards could not be verified from the retrieved controls for this assessment.",
      confidence: "unavailable",
    },
    {
      label: "Decision guidance",
      verdict: "unresolved",
      detail: "Treat this as a hold point: obtain professional planning review before proceeding, redesigning, delaying or walking away.",
      confidence: "unavailable",
    },
  ],
  generatedAt: new Date().toISOString(),
});

export const parseFeasibilityModelJson = (raw: string, developmentType: string, generatedAt = new Date().toISOString()): FeasibilityContent | null => {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? raw);
    const result = feasibilityContentSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[feasibility] Model returned invalid feasibility JSON", result.error.issues);
      return null;
    }

    return {
      ...result.data,
      developmentType: result.data.developmentType || developmentType,
      generatedAt,
      items: result.data.items.map((item) => ({
        ...item,
        source: item.confidence === "cited" ? item.source : item.source || undefined,
      })),
    } satisfies FeasibilityContent;
  } catch (error) {
    console.warn("[feasibility] Unable to parse feasibility model JSON", error);
    return null;
  }
};

const buildFeasibilityPrompt = (params: {
  address: string;
  developmentType: string;
  siteContext: { lga?: string; zone?: string };
  statutoryPromptBlock: string;
}) => [
  `Address: ${params.address}`,
  `Development type: ${params.developmentType}`,
  `LGA: ${params.siteContext.lga || "Not supplied"}`,
  `Zone: ${params.siteContext.zone || "Not supplied"}`,
  "",
  params.statutoryPromptBlock,
  "",
  "Return JSON only with this exact shape:",
  '{"developmentType":"string","overallVerdict":"proceed|caution|redesign|blocked|unresolved","summary":"string","items":[{"label":"string","verdict":"proceed|caution|redesign|blocked|unresolved","detail":"string","confidence":"cited|inferred|unavailable","source":"optional string"}],"generatedAt":"ISO timestamp"}',
  "Use cited confidence only when the retrieved LEP/DCP text supports the item. Use unavailable where data is missing. Do not invent clause references.",
].join("\n");

const generateSeeArtefactSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  title: z.string().trim().max(200).optional(),
  proposedWorksSummary: z.string().trim().max(4000).optional(),
});

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
};


const APPLICABILITY_CONFLICT_TERMS = /\b(rural zones?|rural land|rural boundary|residential zones?|residential d1|residential accommodation|dual occupanc(?:y|ies)|secondary dwelling|dwelling houses?|bed and breakfast|large lot residential|environmental conservation|top[- ]?up housing)\b/i;
const NSW_ZONE_CODE = /\b(?:RU|R|E|MU|B|IN|SP|RE|C|W|DM)\d[A-Z]?\b/i;
const dcpEvidenceText = (clause: Pick<ScoredDcpClause, "ref" | "title" | "headingPath" | "bodyText">) =>
  [clause.ref, clause.title, clause.headingPath?.join(" "), clause.bodyText].filter(Boolean).join("\n");
const zoneCodeFromSiteLabel = (zoneLabel?: string | null, zoneCode?: string | null) =>
  zoneCode?.trim().toUpperCase() || zoneLabel?.match(NSW_ZONE_CODE)?.[0]?.toUpperCase() || null;
const evidenceMentionsZone = (text: string, zoneCode: string | null) => Boolean(zoneCode && new RegExp(`\\b${zoneCode}\\b`, "i").test(text));

export const isSiteApplicableDcpEvidence = (params: { text: string; siteZoneLabel?: string | null; siteZoneCode?: string | null; controlTopic?: string | null }) => {
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
  if (params.controlTopic && !new RegExp(params.controlTopic, "i").test(params.text) && !/\bpart b\b/i.test(params.text)) return false;
  return true;
};

export const filterSiteApplicableDcpClauses = <T extends Pick<ScoredDcpClause, "ref" | "title" | "headingPath" | "bodyText">>(clauses: T[], site: { zoneLabel?: string | null; zoneCode?: string | null }, controlTopic?: string | null) =>
  clauses.filter((clause) => isSiteApplicableDcpEvidence({ text: dcpEvidenceText(clause), siteZoneLabel: site.zoneLabel, siteZoneCode: site.zoneCode, controlTopic }));

export const hasApplicableSeeReadinessEvidence = (memo: Pick<PreSeePlanningMemoContent, "siteDescription" | "applicableControls" | "consistencyAssessment"> | null) => {
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
    const clauseRef = typeof control?.clauseRef === "string" ? control.clauseRef.trim() : "";
    if (!clauseRef) return;
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

const buildDcpCitationRef = (clause: ScoredDcpClause) => clause.title || clause.ref || clause.headingPath.join(" > ");

const uniqueCitations = (citations: SeeSourceCitation[]) => {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.type}:${citation.ref}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  const { projectId, proposedWorksSummary, title } = parsed.data;
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

  const quickSiteCheckFallback = await deps.buildQuickSiteCheckReport(projectWithContext);
  const lepEnrichment = await loadLepEnrichmentForProject(projectWithContext, deps);
  const quickSiteCheck = applyRealLepEnrichmentToReport(quickSiteCheckFallback, lepEnrichment);
  const preSeeLepPromptBlock = buildPreSeeLepPromptBlock(lepEnrichment, quickSiteCheck);
  const lepInstrumentName = quickSiteCheck.lepInstrument?.name ?? null;
  const lgaCode = normalizeCouncilLgaCode(quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaCode);
  const controlsQuery = [
    proposedWorksSummary,
    quickSiteCheck.site.lga,
    quickSiteCheck.site.zoneLabel,
    "development controls setbacks parking landscaping built form",
  ]
    .filter(Boolean)
    .join(" ");

  const [dcpClauses, dcpSectionClauses, sourceContext, statutoryContext] = await Promise.all([
    lgaCode ? deps.getDCPContext(lgaCode, controlsQuery) : Promise.resolve([]),
    lgaCode ? loadDcpClausesForSections(deps.getDCPContext, lgaCode, SEE_SECTION_DCP_QUERIES) : Promise.resolve(new Map<string, ScoredDcpClause[]>()),
    deps.getWorkspaceSourceContext({
      projectId: project.id,
      lgaCode,
      lgaName: quickSiteCheck.site.lga ?? null,
      query: controlsQuery || "pre SEE planning memo",
      limit: 6,
    }),
    lgaCode && deps.buildStatutoryContextBlock
      ? deps.buildStatutoryContextBlock({
          lgaCode,
          query: controlsQuery || "pre SEE planning memo LEP DCP controls",
          maxDcpClauses: 5,
          maxLepClauses: 3,
          siteZone: quickSiteCheck.site.zoneLabel ?? ([quickSiteCheck.site.zoneCode, quickSiteCheck.site.zoneName].filter(Boolean).join(" – ") || null),
        })
      : Promise.resolve(null),
  ]);

  const filteredDcpClauses = filterSiteApplicableDcpClauses(dcpClauses, { zoneLabel: quickSiteCheck.site.zoneLabel ?? quickSiteCheck.site.zoneName, zoneCode: quickSiteCheck.site.zoneCode });
  const filteredDcpSectionClauses = new Map(Array.from(dcpSectionClauses.entries()).map(([section, clauses]) => [section, filterSiteApplicableDcpClauses(clauses, { zoneLabel: quickSiteCheck.site.zoneLabel ?? quickSiteCheck.site.zoneName, zoneCode: quickSiteCheck.site.zoneCode }, section)]));
  const dcpSectionPromptContext = buildDcpSectionPromptContext(filteredDcpSectionClauses);
  const dcpClauseCounts = countDcpClausesBySection(filteredDcpSectionClauses);

  const siteDescription = {
    address: quickSiteCheck.site.address ?? null,
    lga: quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaName ?? null,
    zoneCode: quickSiteCheck.site.zoneCode ?? null,
    zoneName: quickSiteCheck.site.zoneName ?? null,
    zoneLabel: quickSiteCheck.site.zoneLabel ?? null,
  };

  const availableLepClauseRefs = new Set((lepEnrichment.lepContext?.clauses ?? []).map((clause) => clause.ref));
  const dcpControlCitations = uniqueCitations(
    filteredDcpClauses
      .map((clause) => buildDcpCitationRef(clause))
      .filter((ref): ref is string => Boolean(ref))
      .map((ref) => ({ ref, type: "DCP" as const })),
  );
  const citationForControl = (clauseRef: string | null | undefined) => {
    if (!clauseRef || !availableLepClauseRefs.has(clauseRef)) return [];
    const ref = buildLepCitationRef(lepInstrumentName, clauseRef);
    return ref ? [{ ref, type: "LEP" as const }] : [];
  };

  const controlAssessments = [
    buildControlAssessment(
      "Land use permissibility",
      quickSiteCheck.permissibility?.interpretation ??
        "Permissibility could not be confirmed from the available LEP data. Confirm the land use against the LEP before relying on this memo.",
      uniqueCitations([
        ...citationForControl("2.3"),
        ...dcpControlCitations.slice(0, 2),
      ]),
    ),
    buildControlAssessment(
      "Height of building",
      quickSiteCheck.controls.heightOfBuilding.interpretation,
      uniqueCitations([
        ...citationForControl(quickSiteCheck.controls.heightOfBuilding.clauseRef),
        ...dcpControlCitations.slice(0, 2),
      ]),
    ),
    buildControlAssessment(
      "Floor space ratio",
      quickSiteCheck.controls.floorSpaceRatio.interpretation,
      uniqueCitations([
        ...citationForControl(quickSiteCheck.controls.floorSpaceRatio.clauseRef),
        ...dcpControlCitations.slice(0, 2),
      ]),
    ),
    buildControlAssessment(
      "Minimum lot size",
      quickSiteCheck.controls.minimumLotSize.interpretation,
      uniqueCitations([
        ...citationForControl(quickSiteCheck.controls.minimumLotSize.clauseRef),
        ...dcpControlCitations.slice(0, 2),
      ]),
    ),
  ];

  const content: PreSeePlanningMemoContent = {
    memoType: "pre_see_planning_memo",
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    dcpClauses: dcpClauseCounts,
    siteDescription,
    proposedWorksSummary:
      proposedWorksSummary ||
      "Proposed works summary not supplied. Add a concise description of the intended development before using this memo for application preparation.",
    applicableControls: {
      lepInstrument: quickSiteCheck.lepInstrument ?? null,
      permissibility: quickSiteCheck.permissibility ?? null,
      quickSiteControls: quickSiteCheck.controls,
      dcpClauses: filteredDcpClauses.map((clause) => ({
        ref: clause.ref,
        title: clause.title,
        headingPath: clause.headingPath,
        bodyText: clause.bodyText,
        score: clause.score,
      })),
      sourceExcerpts: sourceContext.chunks.filter((chunk) => isSiteApplicableDcpEvidence({ text: [chunk.heading, chunk.content].filter(Boolean).join("\n"), siteZoneLabel: siteDescription.zoneLabel ?? siteDescription.zoneName, siteZoneCode: siteDescription.zoneCode })).map((chunk) => ({
        id: chunk.id,
        heading: chunk.heading,
        sourceType: chunk.sourceType,
        content: chunk.content,
        score: chunk.score,
      })),
      statutoryContext: statutoryContext
        ? {
            promptBlock: [dcpSectionPromptContext, preSeeLepPromptBlock, statutoryContext.promptBlock].filter(Boolean).join("\n\n"),
            lepClauses: statutoryContext.lepClauses,
            dcpClauses: statutoryContext.dcpClauses,
            sourceTypes: statutoryContext.sourceTypes,
          }
        : dcpSectionPromptContext || preSeeLepPromptBlock
          ? {
              promptBlock: [dcpSectionPromptContext, preSeeLepPromptBlock].filter(Boolean).join("\n\n"),
              lepClauses: [],
              dcpClauses: [],
              sourceTypes: ["cited"],
            }
          : null,
      groundingInstructions: [
        "Base all LEP and DCP references on the retrieved clause text provided below. Do not invent clause numbers or policy references.",
        "Each SEE section must cite the specific DCP source title exactly as provided in the retrieved `DCP Source — [title]: [chunk text]` line whenever that DCP chunk is used.",
        "When using retrieved LEP material, cite the LEP instrument and clause number in the form `<Instrument Name> cl. <clause number>` (for example, `Byron LEP 2014 cl. 4.3`).",
        "Do not quote generic control numbers (for example, a typical setback or parking rate) unless that number appears verbatim in a retrieved DCP chunk, LEP clause, quick-site-check control, or statutory-context excerpt.",
        "Every SEE section JSON object must include a `citations` array listing each cited source as `{ ref: string, type: \"LEP\" | \"DCP\" }`; leave it empty only where no retrieved source supports that section.",
        "Development Description, Site Context, LEP Compliance, DCP Compliance and Conclusion must cite retrieved clause text where available.",
        "Use retrieved LEP zone, FSR and height controls from the quick site check/statutory context; if a value is missing, say it was not found in retrieved data.",
      ],
    },
    consistencyAssessment: controlAssessments,
    limitations: [
      "This is an MVP pre-SEE planning memo, not a final legal Statement of Environmental Effects.",
      "Confirm all controls against the current LEP, DCP, planning certificates, council mapping and specialist reports before lodgement.",
      "Hazards, servicing, biodiversity, flooding, bushfire, heritage and engineering constraints may require separate assessment.",
    ],
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


type FeasibilityDeps = {
  prisma: ArtefactDependencies["prisma"];
  buildStatutoryContextBlock: typeof buildStatutoryContextBlock;
  callModel: typeof callModel;
};

const defaultFeasibilityDeps: FeasibilityDeps = {
  prisma,
  buildStatutoryContextBlock,
  callModel,
};

export async function createFeasibilityArtefact(
  projectId: string,
  address: string,
  developmentType: string,
  siteContext: { lga?: string; zone?: string },
  userId?: string,
  deps: FeasibilityDeps = defaultFeasibilityDeps,
): Promise<{ artefactId: string; content: FeasibilityContent }> {
  const normalizedSiteContext = {
    lga: normalizeCouncilLgaCode(siteContext?.lga) ?? siteContext?.lga?.trim() ?? undefined,
    zone: siteContext?.zone?.trim() || undefined,
  };

  let content = fallbackFeasibilityContent(developmentType, normalizedSiteContext, address);
  let project: Awaited<ReturnType<typeof findProjectByExternalId>> | null = null;

  try {
    project = await findProjectByExternalId(deps.prisma as unknown as PrismaClient, projectId);
  } catch (error) {
    console.warn("[feasibility] Project lookup failed; returning fallback content", error);
    return { artefactId: "", content: fallbackFeasibilityContent(developmentType, normalizedSiteContext, address, "Project lookup failed") };
  }

  if (!project) {
    return { artefactId: "", content: fallbackFeasibilityContent(developmentType, normalizedSiteContext, address, "Project was not found") };
  }

  let statutoryPromptBlock = "No LEP or DCP clauses were retrieved for this feasibility assessment.";

  try {
    if (normalizedSiteContext.lga) {
      const statutoryContext = await deps.buildStatutoryContextBlock({
        lgaCode: normalizedSiteContext.lga,
        query: [developmentType, normalizedSiteContext.zone, "permissibility height floor space ratio minimum lot size"].filter(Boolean).join(" "),
        maxDcpClauses: 3,
        maxLepClauses: 5,
        siteZone: normalizedSiteContext.zone ?? null,
      });
      statutoryPromptBlock = statutoryContext.promptBlock;
    }
  } catch (error) {
    console.warn("[feasibility] Statutory context lookup failed; continuing with fallback context", error);
    statutoryPromptBlock = "Retrieved planning controls were unavailable because the LEP/DCP lookup failed.";
  }

  try {
    const raw = await deps.callModel(
      "planning_chat",
      [
        {
          role: "system",
          content:
            "You are a NSW planning expert. Return ONLY valid JSON matching FeasibilityContent. Base findings on retrieved LEP/DCP snippets where available and do not invent citations.",
        },
        {
          role: "user",
          content: buildFeasibilityPrompt({
            address,
            developmentType,
            siteContext: normalizedSiteContext,
            statutoryPromptBlock,
          }),
        },
      ],
      { maxTokens: 900, temperature: 0 },
    );
    const generatedAt = new Date().toISOString();
    content = parseFeasibilityModelJson(raw, developmentType, generatedAt) ?? fallbackFeasibilityContent(developmentType, normalizedSiteContext, address, "The model response was not valid JSON");
  } catch (error) {
    console.warn("[feasibility] OpenAI feasibility generation failed; using fallback content", error);
    content = fallbackFeasibilityContent(developmentType, normalizedSiteContext, address, "AI generation was unavailable");
  }

  try {
    const artefact = await deps.prisma.artefact.create({
      data: {
        projectId: project.id,
        createdById: userId === DEV_BYPASS_USER_ID ? null : userId,
        type: "feasibility" as ArtefactType,
        title: `Feasibility: ${developmentType}`,
        source: address,
        overlays: [],
        notes: content.summary,
        payload: content,
        capturedAt: new Date(content.generatedAt),
      },
    });

    return { artefactId: artefact.id, content };
  } catch (error) {
    console.warn("[feasibility] Failed to persist feasibility artefact; returning generated content", error);
    return { artefactId: "", content };
  }
}

export async function createExpertReviewRequestArtefact({
  body,
  userId,
}: {
  body: unknown;
  userId: string;
}, deps: { prisma: unknown } = { prisma }) {
  const parsed = z.object({ projectId: z.string().trim().min(1) }).safeParse(body);
  if (!parsed.success) {
    throw new ArtefactValidationError(parsed.error.issues[0]?.message ?? "Invalid review request payload");
  }

  const prismaClient = deps.prisma as ArtefactDependencies["prisma"];
  const project = await assertProjectAccess(prismaClient, parsed.data.projectId, userId);
  const existingArtefacts = await prismaClient.artefact.findMany({
    where: { projectId: project.id, type: { in: ["quick_site_check", "pre_see_planning_memo"] as ArtefactType[] } },
    orderBy: { createdAt: "desc" },
  });
  const quickSiteCheck = existingArtefacts.find((artefact) => artefact.type === "quick_site_check");
  const seeMemo = existingArtefacts.find((artefact) => artefact.type === "pre_see_planning_memo");

  if (!quickSiteCheck || !seeMemo) {
    throw new ArtefactValidationError("Run and save a Quick Site Check and SEE draft before requesting expert review");
  }

  const qsc = quickSiteCheck.payload as QuickSiteCheckReport | null;
  const see = seeMemo.payload as import("@/types/workspace").WorkspacePreSeePlanningMemoContent | null;
  const lepEvidenceSummary = qsc?.lepEvidenceSummary ?? null;
  const controls = qsc?.controls ? Object.values(qsc.controls) : [];
  const citedSources = new Map<string, { ref: string; type: "LEP" | "DCP" }>();
  controls.forEach((control) => {
    if (control.clauseRef) citedSources.set(control.clauseRef, { ref: control.clauseRef, type: "LEP" });
  });
  see?.consistencyAssessment?.forEach((item) =>
    item.citations?.forEach((citation) => citedSources.set(`${citation.type}:${citation.ref}`, citation)),
  );
  see?.applicableControls?.dcpClauses?.forEach((clause) => {
    if (clause.ref) citedSources.set(`DCP:${clause.ref}`, { ref: clause.ref, type: "DCP" });
  });

  const confidenceGaps = [
    !lepEvidenceSummary
      ? "LEP evidence quality: unavailable in the saved Quick Site Check; planner should verify LEP provenance before relying on the handoff."
      : lepEvidenceSummary.label === "Unavailable"
        ? `LEP evidence quality: ${lepEvidenceSummary.detail}`
        : null,
    ...controls.filter((control) => control.confidence !== "Cited").map((control) => `${control.label}: ${control.interpretation}`),
    ...(see?.limitations ?? []),
  ].filter((item): item is string => Boolean(item));
  const missingInputs = [
    !qsc?.site?.address && "Confirmed street address",
    !qsc?.site?.zoneLabel && "Confirmed zoning layer",
    !see?.proposedWorksSummary && "Proposed works summary",
    citedSources.size === 0 && "Cited LEP/DCP sources",
  ].filter((item): item is string => Boolean(item));
  const assumptions = [
    see?.proposedWorksSummary ? `Proposed works: ${see.proposedWorksSummary}` : null,
    qsc?.permissibility?.interpretation ?? null,
    "Planner to verify currency of council controls before lodgement advice.",
  ].filter((item): item is string => Boolean(item));

  const generatedAt = new Date().toISOString();
  const payload: import("@/types/workspace").ReviewRequestContent = {
    requestType: "expert_review_request",
    generatedAt,
    projectId: project.id,
    site: {
      address: qsc?.site?.address ?? see?.siteDescription?.address ?? project.address ?? null,
      lga: qsc?.site?.lga ?? see?.siteDescription?.lga ?? null,
      zoneLabel: qsc?.site?.zoneLabel ?? see?.siteDescription?.zoneLabel ?? project.zoning ?? project.zoningName ?? null,
    },
    packageSummary: "Expert review package assembled from the saved Quick Site Check and SEE draft for planner handoff.",
    includedArtefacts: [quickSiteCheck, seeMemo].map((artefact) => ({
      type: artefact.type as "quick_site_check" | "pre_see_planning_memo",
      id: artefact.id,
      title: artefact.title,
      generatedAt: artefact.capturedAt?.toISOString() ?? artefact.createdAt.toISOString(),
    })),
    citedSources: Array.from(citedSources.values()),
    lepEvidenceSummary,
    confidenceGaps: confidenceGaps.length ? confidenceGaps : ["No explicit confidence gaps were found; planner should still verify assumptions."],
    missingInputs: missingInputs.length ? missingInputs : ["No obvious missing inputs detected by Plannera."],
    assumptions,
    recommendedReviewScope: [
      "Confirm permissibility pathway and consent requirements.",
      "Check LEP/DCP citations against current council instruments.",
      "Review SEE limitations, assumptions and any inferred controls before paid export or lodgement use.",
    ],
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
  });
}
