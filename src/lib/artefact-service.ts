import { z } from "zod";

import { NEXT_AUTH_SESSION_COOKIE, authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDCPContext } from "@/lib/dcp/get-dcp-context";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import { buildQuickSiteCheckReport } from "@/lib/quick-site-check";
import { buildQuickSiteCheckLep } from "@/lib/lep/quick-site-check";
import { getLepContextForProject, type LepClauseContext, type LepContext } from "@/lib/lep/lep-context";
import { serializeSiteContext } from "@/lib/site-context";
import { saveFileToUploads, type SavedFile } from "@/lib/storage";
import { getWorkspaceSourceContext } from "@/lib/workspace-source-context";
import { buildStatutoryContextBlock } from "@/lib/statutory-context-builder";
import { findProjectByExternalId } from "./project-identifiers";
import { getServerSession } from "next-auth";
import type { Artefact, ArtefactType, PrismaClient } from "@prisma/client";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";

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
    }),
    notes: z.array(z.string()),
    nextSteps: z.array(z.string()),
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
  const session = await getServerSession(authOptions);
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
    where: {
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

const findLepClause = (clauses: LepClauseContext[], refs: string[], keywords: string[]) => {
  const byRef = clauses.find((clause) => refs.some((ref) => clause.ref === ref || clause.ref.startsWith(`${ref}`)));
  if (byRef) return byRef;

  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return clauses.find((clause) => {
    const haystack = `${clause.title ?? ""} ${clause.text}`.toLowerCase();
    return normalizedKeywords.some((keyword) => haystack.includes(keyword));
  });
};

const extractNumericControlValue = (clause: LepClauseContext | null) => {
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
  control: QuickSiteCheckReport["controls"][keyof QuickSiteCheckReport["controls"]],
  clause: LepClauseContext | null,
) => {
  if (!clause) return { ...control, lepSource: false };

  const parsedValue = extractNumericControlValue(clause);
  const value = parsedValue ?? control.value;
  const clauseTitle = clause.title ? `${clause.ref}: ${clause.title}` : clause.ref;

  return {
    ...control,
    value,
    present: Boolean(value || clause.text),
    clauseRef: clause.ref,
    detail: truncatePromptText(clause.text),
    source: "lep",
    lepSource: true,
    interpretation: value
      ? `${control.label} is ${value} based on retrieved LEP clause ${clauseTitle}. Verify the mapped value against the official LEP map before lodgement.`
      : `${control.label} is addressed in retrieved LEP clause ${clauseTitle}, but no numeric mapped value was extracted. Verify the LEP map before lodgement.`,
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
      heightOfBuilding: withRealLepControl(report.controls.heightOfBuilding, heightClause ?? null),
      floorSpaceRatio: withRealLepControl(report.controls.floorSpaceRatio, fsrClause ?? null),
      minimumLotSize: withRealLepControl(report.controls.minimumLotSize, lotSizeClause ?? null),
    },
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
      createdById: userId,
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
      createdById: userId,
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

const generateSeeArtefactSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  title: z.string().trim().max(200).optional(),
  proposedWorksSummary: z.string().trim().max(4000).optional(),
});

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
  }>;
  limitations: string[];
};

const buildControlAssessment = (label: string, interpretation: string) => ({
  topic: label,
  assessment: interpretation,
});

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
  const lgaCode = normalizeCouncilLgaCode(quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaCode);
  const controlsQuery = [
    proposedWorksSummary,
    quickSiteCheck.site.lga,
    quickSiteCheck.site.zoneLabel,
    "development controls setbacks parking landscaping built form",
  ]
    .filter(Boolean)
    .join(" ");

  const [dcpClauses, sourceContext, statutoryContext] = await Promise.all([
    lgaCode ? deps.getDCPContext(lgaCode, controlsQuery) : Promise.resolve([]),
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
        })
      : Promise.resolve(null),
  ]);

  const siteDescription = {
    address: quickSiteCheck.site.address ?? null,
    lga: quickSiteCheck.site.lga ?? projectWithContext.siteContext.lgaName ?? null,
    zoneCode: quickSiteCheck.site.zoneCode ?? null,
    zoneName: quickSiteCheck.site.zoneName ?? null,
    zoneLabel: quickSiteCheck.site.zoneLabel ?? null,
  };

  const controlAssessments = [
    buildControlAssessment(
      "Land use permissibility",
      quickSiteCheck.permissibility?.interpretation ??
        "Permissibility could not be confirmed from the available LEP data. Confirm the land use against the LEP before relying on this memo.",
    ),
    buildControlAssessment("Height of building", quickSiteCheck.controls.heightOfBuilding.interpretation),
    buildControlAssessment("Floor space ratio", quickSiteCheck.controls.floorSpaceRatio.interpretation),
    buildControlAssessment("Minimum lot size", quickSiteCheck.controls.minimumLotSize.interpretation),
  ];

  const content: PreSeePlanningMemoContent = {
    memoType: "pre_see_planning_memo",
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    siteDescription,
    proposedWorksSummary:
      proposedWorksSummary ||
      "Proposed works summary not supplied. Add a concise description of the intended development before using this memo for application preparation.",
    applicableControls: {
      lepInstrument: quickSiteCheck.lepInstrument ?? null,
      permissibility: quickSiteCheck.permissibility ?? null,
      quickSiteControls: quickSiteCheck.controls,
      dcpClauses: dcpClauses.map((clause) => ({
        ref: clause.ref,
        title: clause.title,
        headingPath: clause.headingPath,
        bodyText: clause.bodyText,
        score: clause.score,
      })),
      sourceExcerpts: sourceContext.chunks.map((chunk) => ({
        id: chunk.id,
        heading: chunk.heading,
        sourceType: chunk.sourceType,
        content: chunk.content,
        score: chunk.score,
      })),
      statutoryContext: statutoryContext
        ? {
            promptBlock: [preSeeLepPromptBlock, statutoryContext.promptBlock].filter(Boolean).join("\n\n"),
            lepClauses: statutoryContext.lepClauses,
            dcpClauses: statutoryContext.dcpClauses,
            sourceTypes: statutoryContext.sourceTypes,
          }
        : preSeeLepPromptBlock
          ? {
              promptBlock: preSeeLepPromptBlock,
              lepClauses: [],
              dcpClauses: [],
              sourceTypes: ["cited"],
            }
          : null,
      groundingInstructions: [
        "Base all LEP and DCP references on the retrieved clause text provided below. Do not invent clause numbers or policy references.",
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
      createdById: userId,
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

export async function listProjectArtefacts(projectId: string, userId: string, deps = { prisma }) {
  const project = await assertProjectAccess(deps.prisma, projectId, userId);

  return deps.prisma.artefact.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });
}
