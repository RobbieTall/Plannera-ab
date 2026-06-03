import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  artefactCreateMock,
  artefactFindManyMock,
  artefactUpdateMock,
  buildQuickSiteCheckReportMock,
  createPreSeePlanningMemoArtefactMock,
  createQuickSiteCheckArtefactMock,
  lgaCoverageFindUniqueMock,
  projectFindUniqueMock,
} = vi.hoisted(() => ({
  artefactCreateMock: vi.fn(),
  artefactFindManyMock: vi.fn(),
  artefactUpdateMock: vi.fn(),
  buildQuickSiteCheckReportMock: vi.fn(),
  createPreSeePlanningMemoArtefactMock: vi.fn(),
  createQuickSiteCheckArtefactMock: vi.fn(),
  lgaCoverageFindUniqueMock: vi.fn(),
  projectFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artefact: {
      create: artefactCreateMock,
      findMany: artefactFindManyMock,
      update: artefactUpdateMock,
    },
    lgaCoverageState: {
      findUnique: lgaCoverageFindUniqueMock,
    },
    project: {
      findUnique: projectFindUniqueMock,
    },
  },
}));

vi.mock("@/lib/quick-site-check", () => ({ buildQuickSiteCheckReport: buildQuickSiteCheckReportMock }));

vi.mock("@/lib/artefact-service", () => ({
  createPreSeePlanningMemoArtefact: createPreSeePlanningMemoArtefactMock,
  createQuickSiteCheckArtefact: createQuickSiteCheckArtefactMock,
}));

import { getStaleArtefactsForLga, triggerArtefactRegeneration } from "./artefact-regeneration";

describe("getStaleArtefactsForLga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns regenerable artefacts created before the LGA coverage update", async () => {
    const coverageUpdatedAt = new Date("2026-06-02T10:00:00.000Z");
    const createdAt = new Date("2026-06-01T10:00:00.000Z");

    lgaCoverageFindUniqueMock.mockResolvedValue({ updatedAt: coverageUpdatedAt });
    artefactFindManyMock.mockResolvedValue([
      {
        id: "artefact-1",
        projectId: "project-1",
        type: "quick_site_check",
        createdAt,
      },
    ]);

    await expect(getStaleArtefactsForLga(" kempsey ")).resolves.toEqual([
      {
        projectId: "project-1",
        artefactId: "artefact-1",
        artefactType: "quick_site_check",
        createdAt,
      },
    ]);

    expect(lgaCoverageFindUniqueMock).toHaveBeenCalledWith({
      where: { lgaCode: "KEMPSEY" },
      select: { updatedAt: true },
    });
    expect(artefactFindManyMock).toHaveBeenCalledWith({
      where: {
        type: { in: ["quick_site_check", "pre_see_planning_memo"] },
        createdAt: { lt: coverageUpdatedAt },
        project: { siteContext: { is: { lgaCode: "KEMPSEY" } } },
      },
      select: { id: true, projectId: true, type: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns an empty list when the LGA coverage record does not exist", async () => {
    lgaCoverageFindUniqueMock.mockResolvedValue(null);

    await expect(getStaleArtefactsForLga("KEMPSEY")).resolves.toEqual([]);
    expect(artefactFindManyMock).not.toHaveBeenCalled();
  });
});

describe("triggerArtefactRegeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("regenerates a Quick Site Check artefact from the current project context", async () => {
    const project = { id: "project-1", title: "Test project", siteContext: { id: "site-1" } };
    const report = { projectId: "project-1", generatedAt: "2026-06-03T00:00:00.000Z" };

    projectFindUniqueMock.mockResolvedValue(project);
    buildQuickSiteCheckReportMock.mockResolvedValue(report);
    createQuickSiteCheckArtefactMock.mockResolvedValue({ id: "new-quick-site-check" });

    await expect(triggerArtefactRegeneration("project-1", "user-1", "QUICK_SITE_CHECK")).resolves.toEqual({
      queued: true,
      newArtefactId: "new-quick-site-check",
    });

    expect(createQuickSiteCheckArtefactMock).toHaveBeenCalledWith({
      body: {
        projectId: "project-1",
        title: "Quick Site Check — Test project",
        type: "quick_site_check",
        report,
      },
      projectId: "project-1",
      userId: "user-1",
    });
  });

  it("regenerates a pre-SEE planning memo artefact", async () => {
    createPreSeePlanningMemoArtefactMock.mockResolvedValue({ artefact: { id: "new-memo" }, content: {} });

    await expect(triggerArtefactRegeneration("project-1", "user-1", "PRE_SEE_PLANNING_MEMO")).resolves.toEqual({
      queued: true,
      newArtefactId: "new-memo",
    });

    expect(createPreSeePlanningMemoArtefactMock).toHaveBeenCalledWith({
      body: { projectId: "project-1" },
      userId: "user-1",
    });
  });

  it("rejects unsupported artefact types", async () => {
    await expect(triggerArtefactRegeneration("project-1", "user-1", "map_snapshot")).resolves.toEqual({
      queued: false,
      reason: "Unsupported artefact type",
    });
  });
});
