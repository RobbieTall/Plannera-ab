import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

export const COMMERCIAL_FUNNEL_VERSION = "commercial-launch-v1";
export const COMMERCIAL_FUNNEL_SCHEMA_VERSION = 1;
export const COMMERCIAL_FUNNEL_RETENTION_DAYS = 90;

export const commercialFunnelEventNames = [
  "CHECK_STARTED",
  "SITE_RESOLVED",
  "QUICK_SITE_CHECK_SAVED",
  "PROJECT_PROMOTED",
  "DETAILED_PLANNING_PACK_GENERATED",
  "DETAILED_PLANNING_PACK_READY",
  "DETAILED_PLANNING_PACK_UNRESOLVED",
  "PLANNING_FEASIBILITY_SUMMARY_GENERATED",
  "SEE_GENERATED",
  "EXPERT_REVIEW_PACKAGE_GENERATED",
  "HANDOFF_COPIED",
  "HANDOFF_DOWNLOADED",
  "CONSULTANT_REFERRAL_SUBMITTED",
] as const;

export type CommercialFunnelEventName = (typeof commercialFunnelEventNames)[number];
export type CommercialFunnelEventSource = "SERVER_CONFIRMED" | "VERIFIED_INTERACTION";
export type CommercialFunnelExclusionReason =
  | "NON_PRODUCTION"
  | "DEMO_PROJECT"
  | "INTERNAL_PROJECT"
  | "DEV_BYPASS";

const eventSources: Record<CommercialFunnelEventName, CommercialFunnelEventSource> = {
  CHECK_STARTED: "SERVER_CONFIRMED",
  SITE_RESOLVED: "SERVER_CONFIRMED",
  QUICK_SITE_CHECK_SAVED: "SERVER_CONFIRMED",
  PROJECT_PROMOTED: "SERVER_CONFIRMED",
  DETAILED_PLANNING_PACK_GENERATED: "SERVER_CONFIRMED",
  DETAILED_PLANNING_PACK_READY: "SERVER_CONFIRMED",
  DETAILED_PLANNING_PACK_UNRESOLVED: "SERVER_CONFIRMED",
  PLANNING_FEASIBILITY_SUMMARY_GENERATED: "SERVER_CONFIRMED",
  SEE_GENERATED: "SERVER_CONFIRMED",
  EXPERT_REVIEW_PACKAGE_GENERATED: "SERVER_CONFIRMED",
  HANDOFF_COPIED: "VERIFIED_INTERACTION",
  HANDOFF_DOWNLOADED: "VERIFIED_INTERACTION",
  CONSULTANT_REFERRAL_SUBMITTED: "SERVER_CONFIRMED",
};

type FunnelEnvironment = "production" | "preview" | "development" | "test";

type FunnelEventRow = {
  eventName: CommercialFunnelEventName;
  projectId: string;
};

type FunnelEventPrisma = {
  project: {
    findUnique(args: {
      where: { id: string };
      select: { isDemo: true; publicId: true };
    }): Promise<{ isDemo: boolean; publicId: string | null } | null>;
  };
  commercialFunnelEvent: {
    upsert(args: {
      where: { idempotencyKey: string };
      update: Record<string, never>;
      create: {
        projectId: string;
        artefactId: string | null;
        eventName: CommercialFunnelEventName;
        source: CommercialFunnelEventSource;
        funnelVersion: string;
        schemaVersion: number;
        idempotencyKey: string;
        includedInConversion: boolean;
        exclusionReason: CommercialFunnelExclusionReason | null;
        occurredAt: Date;
        expiresAt: Date;
      };
    }): Promise<unknown>;
    deleteMany(args: { where: { expiresAt: { lt: Date } } }): Promise<{ count: number }>;
    findMany(args: {
      where: {
        funnelVersion: string;
        includedInConversion: true;
        occurredAt: { gte: Date; lt: Date };
      };
      select: { eventName: true; projectId: true };
    }): Promise<FunnelEventRow[]>;
  };
};

export type FunnelEventDependencies = {
  prisma: FunnelEventPrisma;
  now: () => Date;
  environment: FunnelEnvironment;
  collectionEnabled: boolean;
  developmentBypassEnabled: boolean;
  excludedProjectIds: ReadonlySet<string>;
};

const defaultDependencies = (): FunnelEventDependencies => ({
  prisma: prisma as unknown as FunnelEventPrisma,
  now: () => new Date(),
  environment: resolveFunnelEnvironment(),
  collectionEnabled: resolveCommercialFunnelCollectionEnabled(),
  developmentBypassEnabled: process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true",
  excludedProjectIds: resolveCommercialFunnelExcludedProjectIds(),
});

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;
const DEV_BYPASS_USER_ID = "dev-bypass-user";

export const resolveFunnelEnvironment = (
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
): FunnelEnvironment => {
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  if (env.NODE_ENV === "test") return "test";
  if (env.NODE_ENV === "production") return "production";
  return "development";
};

export const resolveCommercialFunnelCollectionEnabled = (
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
) => env.COMMERCIAL_FUNNEL_ENABLED === "true" && Boolean(env.CRON_SECRET?.trim());

export const resolveCommercialFunnelExcludedProjectIds = (
  value = process.env.COMMERCIAL_FUNNEL_EXCLUDED_PROJECT_IDS,
) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => OPAQUE_ID_PATTERN.test(entry)),
  );

export const resolveFunnelExclusionReason = ({
  environment,
  isDemoProject,
  actorUserId,
  developmentBypassEnabled = false,
  isInternalProject = false,
}: {
  environment: FunnelEnvironment;
  isDemoProject: boolean;
  actorUserId?: string | null;
  developmentBypassEnabled?: boolean;
  isInternalProject?: boolean;
}): CommercialFunnelExclusionReason | null => {
  if (environment !== "production") return "NON_PRODUCTION";
  if (isDemoProject) return "DEMO_PROJECT";
  if (isInternalProject) return "INTERNAL_PROJECT";
  if (developmentBypassEnabled || actorUserId === DEV_BYPASS_USER_ID) return "DEV_BYPASS";
  return null;
};

export const buildFunnelIdempotencyKey = ({
  eventName,
  projectId,
  sourceRecordId,
}: {
  eventName: CommercialFunnelEventName;
  projectId: string;
  sourceRecordId: string;
}) => {
  if (![projectId, sourceRecordId].every((value) => OPAQUE_ID_PATTERN.test(value))) {
    throw new Error("Commercial funnel identifiers must be opaque internal IDs");
  }

  const digest = createHash("sha256")
    .update([COMMERCIAL_FUNNEL_VERSION, eventName, projectId, sourceRecordId].join(":"))
    .digest("hex");
  return `${COMMERCIAL_FUNNEL_VERSION}:${eventName}:${digest}`;
};

export async function recordCommercialFunnelEvent(
  {
    eventName,
    projectId,
    sourceRecordId,
    artefactId = null,
    actorUserId = null,
  }: {
    eventName: CommercialFunnelEventName;
    projectId: string;
    sourceRecordId: string;
    artefactId?: string | null;
    actorUserId?: string | null;
  },
  deps: FunnelEventDependencies = defaultDependencies(),
) {
  if (!deps.collectionEnabled) return null;

  if (artefactId && !OPAQUE_ID_PATTERN.test(artefactId)) {
    throw new Error("Commercial funnel artefact IDs must be opaque internal IDs");
  }

  const project = await deps.prisma.project.findUnique({
    where: { id: projectId },
    select: { isDemo: true, publicId: true },
  });
  if (!project) throw new Error("Commercial funnel project was not found");

  const occurredAt = deps.now();
  const expiresAt = new Date(
    occurredAt.getTime() + COMMERCIAL_FUNNEL_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const exclusionReason = resolveFunnelExclusionReason({
    environment: deps.environment,
    isDemoProject: project.isDemo,
    actorUserId,
    developmentBypassEnabled: deps.developmentBypassEnabled,
    isInternalProject:
      deps.excludedProjectIds.has(projectId) ||
      Boolean(project.publicId && deps.excludedProjectIds.has(project.publicId)),
  });
  const idempotencyKey = buildFunnelIdempotencyKey({ eventName, projectId, sourceRecordId });

  await deps.prisma.commercialFunnelEvent.deleteMany({
    where: { expiresAt: { lt: occurredAt } },
  });

  return deps.prisma.commercialFunnelEvent.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      projectId,
      artefactId,
      eventName,
      source: eventSources[eventName],
      funnelVersion: COMMERCIAL_FUNNEL_VERSION,
      schemaVersion: COMMERCIAL_FUNNEL_SCHEMA_VERSION,
      idempotencyKey,
      includedInConversion: exclusionReason === null,
      exclusionReason,
      occurredAt,
      expiresAt,
    },
  });
}

export async function recordCommercialFunnelEventSafely(
  input: Parameters<typeof recordCommercialFunnelEvent>[0],
  deps: FunnelEventDependencies = defaultDependencies(),
) {
  try {
    await recordCommercialFunnelEvent(input, deps);
  } catch (error) {
    console.error("[commercial-funnel-event] unable to record milestone", {
      eventName: input.eventName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export async function recordQuickSiteCheckMilestones({
  projectId,
  artefactId,
  payload,
  actorUserId,
}: {
  projectId: string;
  artefactId: string;
  payload: unknown;
  actorUserId?: string | null;
}, deps: FunnelEventDependencies = defaultDependencies()) {
  if (!isRecord(payload)) return;
  const evidenceSummary = isRecord(payload.lepEvidenceSummary) ? payload.lepEvidenceSummary : null;
  if (evidenceSummary?.label !== "Cited") return;

  const common = { projectId, artefactId, sourceRecordId: artefactId, actorUserId };
  await recordCommercialFunnelEventSafely(
    { eventName: "QUICK_SITE_CHECK_SAVED", ...common },
    deps,
  );

  const developmentIntent = isRecord(payload.developmentIntent) ? payload.developmentIntent : null;
  if (typeof developmentIntent?.description === "string" && developmentIntent.description.trim()) {
    await recordCommercialFunnelEventSafely(
      { eventName: "PROJECT_PROMOTED", ...common },
      deps,
    );
  }
}

export async function recordDetailedPlanningPackMilestones({
  projectId,
  artefactId,
  commercialReady,
  actorUserId,
}: {
  projectId: string;
  artefactId: string;
  commercialReady: boolean;
  actorUserId?: string | null;
}, deps: FunnelEventDependencies = defaultDependencies()) {
  const common = { projectId, artefactId, sourceRecordId: artefactId, actorUserId };
  await recordCommercialFunnelEventSafely(
    {
      eventName: "DETAILED_PLANNING_PACK_GENERATED",
      ...common,
    },
    deps,
  );
  await recordCommercialFunnelEventSafely(
    {
      eventName: commercialReady
        ? "DETAILED_PLANNING_PACK_READY"
        : "DETAILED_PLANNING_PACK_UNRESOLVED",
      ...common,
    },
    deps,
  );
}

const transition = (
  from: CommercialFunnelEventName,
  to: CommercialFunnelEventName,
  sets: Map<CommercialFunnelEventName, Set<string>>,
) => {
  const denominator = sets.get(from) ?? new Set<string>();
  const reached = sets.get(to) ?? new Set<string>();
  const converted = Array.from(denominator).filter((projectId) => reached.has(projectId)).length;
  return {
    from,
    to,
    eligibleProjects: denominator.size,
    convertedProjects: converted,
    rate: denominator.size ? Number((converted / denominator.size).toFixed(4)) : null,
  };
};

export async function buildCommercialFunnelReport(
  {
    from,
    to,
  }: {
    from: Date;
    to: Date;
  },
  deps: Pick<FunnelEventDependencies, "prisma" | "now"> = defaultDependencies(),
) {
  const now = deps.now();
  await deps.prisma.commercialFunnelEvent.deleteMany({ where: { expiresAt: { lt: now } } });
  const rows = await deps.prisma.commercialFunnelEvent.findMany({
    where: {
      funnelVersion: COMMERCIAL_FUNNEL_VERSION,
      includedInConversion: true,
      occurredAt: { gte: from, lt: to },
    },
    select: { eventName: true, projectId: true },
  });

  const sets = new Map<CommercialFunnelEventName, Set<string>>(
    commercialFunnelEventNames.map((eventName) => [eventName, new Set<string>()]),
  );
  rows.forEach((row) => sets.get(row.eventName)?.add(row.projectId));

  return {
    funnelVersion: COMMERCIAL_FUNNEL_VERSION,
    schemaVersion: COMMERCIAL_FUNNEL_SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    window: { from: from.toISOString(), to: to.toISOString() },
    counts: Object.fromEntries(
      commercialFunnelEventNames.map((eventName) => [eventName, sets.get(eventName)?.size ?? 0]),
    ),
    conversions: [
      transition("CHECK_STARTED", "QUICK_SITE_CHECK_SAVED", sets),
      transition("QUICK_SITE_CHECK_SAVED", "PROJECT_PROMOTED", sets),
      transition("PROJECT_PROMOTED", "DETAILED_PLANNING_PACK_GENERATED", sets),
      transition(
        "DETAILED_PLANNING_PACK_GENERATED",
        "PLANNING_FEASIBILITY_SUMMARY_GENERATED",
        sets,
      ),
      transition("DETAILED_PLANNING_PACK_READY", "SEE_GENERATED", sets),
      transition("DETAILED_PLANNING_PACK_GENERATED", "EXPERT_REVIEW_PACKAGE_GENERATED", sets),
      transition("EXPERT_REVIEW_PACKAGE_GENERATED", "CONSULTANT_REFERRAL_SUBMITTED", sets),
    ],
  };
}

export async function pruneExpiredCommercialFunnelEvents(
  deps: Pick<FunnelEventDependencies, "prisma" | "now"> = defaultDependencies(),
) {
  const now = deps.now();
  return deps.prisma.commercialFunnelEvent.deleteMany({
    where: { expiresAt: { lt: now } },
  });
}
