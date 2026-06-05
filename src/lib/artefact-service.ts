import { z } from "zod";

import { NEXT_AUTH_SESSION_COOKIE, authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDCPContext } from "@/lib/dcp/get-dcp-context";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import { buildQuickSiteCheckReport } from "@/lib/quick-site-check";
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
  deps?: Pick<ArtefactDependencies, "prisma">;
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

  const generatedAt = new Date(report.generatedAt ?? Date.now());
  const capturedAt = Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt;

  const lgaCode = normalizeCouncilLgaCode(report.site?.lga ?? report.lepInstrument?.lga ?? null);
  const shouldEnrichWithStatutoryGrounding = Boolean(lgaCode && deps.prisma.lgaCoverageState);
  const statutoryContext = shouldEnrichWithStatutoryGrounding && lgaCode
    ? await buildStatutoryContextBlock({
        lgaCode,
        query: [
          report.site?.zoneLabel,
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
    ...report,
    controls: {
      heightOfBuilding: {
        ...report.controls.heightOfBuilding,
        source: sourceForControl(report.controls.heightOfBuilding.clauseRef, report.controls.heightOfBuilding.present),
        interpretation: report.controls.heightOfBuilding.present
          ? report.controls.heightOfBuilding.interpretation
          : "Not found in retrieved LEP data",
      },
      floorSpaceRatio: {
        ...report.controls.floorSpaceRatio,
        source: sourceForControl(report.controls.floorSpaceRatio.clauseRef, report.controls.floorSpaceRatio.present),
        interpretation: report.controls.floorSpaceRatio.present
          ? report.controls.floorSpaceRatio.interpretation
          : "Not found in retrieved LEP data",
      },
      minimumLotSize: {
        ...report.controls.minimumLotSize,
        source: sourceForControl(report.controls.minimumLotSize.clauseRef, report.controls.minimumLotSize.present),
        interpretation: report.controls.minimumLotSize.present
          ? report.controls.minimumLotSize.interpretation
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
  } : report;

  const source = report.site?.address ?? report.site?.zoneLabel ?? "Quick Site Check";
  const notes = report.notes.length ? report.notes.join(" ") : null;

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

  const quickSiteCheck = await deps.buildQuickSiteCheckReport(projectWithContext);
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
            promptBlock: statutoryContext.promptBlock,
            lepClauses: statutoryContext.lepClauses,
            dcpClauses: statutoryContext.dcpClauses,
            sourceTypes: statutoryContext.sourceTypes,
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
