import { describe, expect, it, vi } from "vitest";

import {
  buildCommercialFunnelReport,
  buildFunnelIdempotencyKey,
  COMMERCIAL_FUNNEL_RETENTION_DAYS,
  type CommercialFunnelEventName,
  type FunnelEventDependencies,
  recordCommercialFunnelEvent,
  recordDetailedPlanningPackMilestones,
  recordQuickSiteCheckMilestones,
  resolveCommercialFunnelCollectionEnabled,
  resolveCommercialFunnelExcludedProjectIds,
  resolveFunnelEnvironment,
  resolveFunnelExclusionReason,
} from "@/lib/commercial-funnel-events";

const NOW = new Date("2026-07-24T00:00:00.000Z");

const makeDeps = ({
  environment = "production",
  isDemo = false,
  rows = [],
}: {
  environment?: FunnelEventDependencies["environment"];
  isDemo?: boolean;
  rows?: Array<{ eventName: CommercialFunnelEventName; projectId: string }>;
} = {}) => {
  const upsert = vi.fn(async (args) => args.create);
  const deleteMany = vi.fn(async () => ({ count: 0 }));
  const findMany = vi.fn(async () => rows);
  const deps: FunnelEventDependencies = {
    environment,
    collectionEnabled: true,
    developmentBypassEnabled: false,
    excludedProjectIds: new Set(),
    now: () => NOW,
    prisma: {
      project: {
        findUnique: vi.fn(async () => ({ isDemo, publicId: "public-project-1" })),
      },
      commercialFunnelEvent: {
        upsert,
        deleteMany,
        findMany,
      },
    },
  };
  return { deps, upsert, deleteMany, findMany };
};

describe("commercial funnel event contract", () => {
  it("derives environment and exclusion only from server state", () => {
    expect(resolveFunnelEnvironment({ VERCEL_ENV: "production", NODE_ENV: "test" })).toBe(
      "production",
    );
    expect(resolveFunnelEnvironment({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(
      "preview",
    );
    expect(resolveCommercialFunnelCollectionEnabled({
      COMMERCIAL_FUNNEL_ENABLED: "true",
      CRON_SECRET: "retention-secret",
    })).toBe(true);
    expect(resolveCommercialFunnelCollectionEnabled({
      COMMERCIAL_FUNNEL_ENABLED: "true",
    })).toBe(false);
    expect(Array.from(resolveCommercialFunnelExcludedProjectIds(
      " project-1, public-project-2, 45 Broken Head Road ",
    ))).toEqual(["project-1", "public-project-2"]);
    expect(resolveFunnelExclusionReason({
      environment: "production",
      isDemoProject: false,
      actorUserId: "user-1",
    })).toBeNull();
    expect(resolveFunnelExclusionReason({
      environment: "production",
      isDemoProject: true,
      actorUserId: "user-1",
    })).toBe("DEMO_PROJECT");
    expect(resolveFunnelExclusionReason({
      environment: "production",
      isDemoProject: false,
      actorUserId: "dev-bypass-user",
    })).toBe("DEV_BYPASS");
    expect(resolveFunnelExclusionReason({
      environment: "production",
      isDemoProject: false,
      actorUserId: null,
      developmentBypassEnabled: true,
    })).toBe("DEV_BYPASS");
    expect(resolveFunnelExclusionReason({
      environment: "production",
      isDemoProject: false,
      actorUserId: "user-1",
      isInternalProject: true,
    })).toBe("INTERNAL_PROJECT");
    expect(resolveFunnelExclusionReason({
      environment: "preview",
      isDemoProject: false,
      actorUserId: "user-1",
    })).toBe("NON_PRODUCTION");
  });

  it("rejects raw or descriptive values as idempotency identifiers", () => {
    expect(() =>
      buildFunnelIdempotencyKey({
        eventName: "SITE_RESOLVED",
        projectId: "project-1",
        sourceRecordId: "45 Broken Head Road, Byron Bay",
      }),
    ).toThrow("opaque internal IDs");
  });

  it("stores a fixed, property-free event with 90-day expiry and stable deduplication", async () => {
    const { deps, upsert, deleteMany } = makeDeps();
    const input = {
      eventName: "SEE_GENERATED" as const,
      projectId: "project-1",
      sourceRecordId: "artefact-1",
      artefactId: "artefact-1",
      actorUserId: "user-1",
    };

    await recordCommercialFunnelEvent(input, deps);
    await recordCommercialFunnelEvent(input, deps);

    const first = upsert.mock.calls[0][0];
    const second = upsert.mock.calls[1][0];
    expect(first.where.idempotencyKey).toBe(second.where.idempotencyKey);
    expect(first.create).toMatchObject({
      projectId: "project-1",
      artefactId: "artefact-1",
      eventName: "SEE_GENERATED",
      source: "SERVER_CONFIRMED",
      schemaVersion: 1,
      includedInConversion: true,
      exclusionReason: null,
      occurredAt: NOW,
    });
    expect(first.create).not.toHaveProperty("properties");
    expect(first.create.expiresAt.getTime() - NOW.getTime()).toBe(
      COMMERCIAL_FUNNEL_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    expect(deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: NOW } } });
  });

  it("does not persist anything until collection and retention are both configured", async () => {
    const { deps, upsert, deleteMany } = makeDeps();
    deps.collectionEnabled = false;
    await expect(recordCommercialFunnelEvent({
      eventName: "CHECK_STARTED",
      projectId: "project-1",
      sourceRecordId: "project-1",
    }, deps)).resolves.toBeNull();
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("excludes preview activity without trusting event input", async () => {
    const { deps, upsert } = makeDeps({ environment: "preview" });
    await recordCommercialFunnelEvent({
      eventName: "CHECK_STARTED",
      projectId: "project-1",
      sourceRecordId: "project-1",
    }, deps);

    expect(upsert.mock.calls[0][0].create).toMatchObject({
      includedInConversion: false,
      exclusionReason: "NON_PRODUCTION",
    });
  });

  it("excludes a server-configured internal project by public ID", async () => {
    const { deps, upsert } = makeDeps();
    deps.excludedProjectIds = new Set(["public-project-1"]);
    await recordCommercialFunnelEvent({
      eventName: "CHECK_STARTED",
      projectId: "project-1",
      sourceRecordId: "project-1",
    }, deps);

    expect(upsert.mock.calls[0][0].create).toMatchObject({
      includedInConversion: false,
      exclusionReason: "INTERNAL_PROJECT",
    });
  });

  it("records only quality-valid QSC and derives promotion from persisted intent", async () => {
    const { deps, upsert } = makeDeps();
    await recordQuickSiteCheckMilestones({
      projectId: "project-1",
      artefactId: "qsc-1",
      actorUserId: "user-1",
      payload: {
        lepEvidenceSummary: { label: "Cited" },
        developmentIntent: { description: "Dwelling houses" },
      },
    }, deps);
    await recordQuickSiteCheckMilestones({
      projectId: "project-1",
      artefactId: "qsc-2",
      actorUserId: "user-1",
      payload: {
        lepEvidenceSummary: { label: "Unavailable" },
        developmentIntent: { description: "Dwelling houses" },
      },
    }, deps);

    expect(upsert.mock.calls.map(([args]) => args.create.eventName)).toEqual([
      "QUICK_SITE_CHECK_SAVED",
      "PROJECT_PROMOTED",
    ]);
  });

  it("records generated and exact readiness state for each DPP", async () => {
    const { deps, upsert } = makeDeps();
    await recordDetailedPlanningPackMilestones({
      projectId: "project-1",
      artefactId: "dpp-1",
      commercialReady: false,
      actorUserId: "user-1",
    }, deps);
    expect(upsert.mock.calls.map(([args]) => args.create.eventName)).toEqual([
      "DETAILED_PLANNING_PACK_GENERATED",
      "DETAILED_PLANNING_PACK_UNRESOLVED",
    ]);
  });
});

describe("commercial funnel aggregate report", () => {
  it("returns unique-project counts and cohort intersections without identifiers", async () => {
    const { deps } = makeDeps({
      rows: [
        { eventName: "CHECK_STARTED", projectId: "p1" },
        { eventName: "CHECK_STARTED", projectId: "p2" },
        { eventName: "QUICK_SITE_CHECK_SAVED", projectId: "p1" },
        { eventName: "QUICK_SITE_CHECK_SAVED", projectId: "outside-cohort" },
        { eventName: "PROJECT_PROMOTED", projectId: "p1" },
      ],
    });
    const report = await buildCommercialFunnelReport({
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: NOW,
    }, deps);

    expect(report.counts).toMatchObject({
      CHECK_STARTED: 2,
      QUICK_SITE_CHECK_SAVED: 2,
      PROJECT_PROMOTED: 1,
    });
    expect(report.conversions[0]).toEqual({
      from: "CHECK_STARTED",
      to: "QUICK_SITE_CHECK_SAVED",
      eligibleProjects: 2,
      convertedProjects: 1,
      rate: 0.5,
    });
    expect(JSON.stringify(report)).not.toContain("p1");
  });
});
