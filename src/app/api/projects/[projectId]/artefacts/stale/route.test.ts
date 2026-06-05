import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { artefactFindManyMock, projectFindFirstMock, requireSessionUserMock } = vi.hoisted(() => ({
  artefactFindManyMock: vi.fn(),
  projectFindFirstMock: vi.fn(),
  requireSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/artefact-service", () => ({
  ArtefactAccessError: class ArtefactAccessError extends Error {
    constructor(message: string, public status = 403) {
      super(message);
    }
  },
  requireSessionUser: requireSessionUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artefact: {
      findMany: artefactFindManyMock,
    },
    project: {
      findFirst: projectFindFirstMock,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/projects/[projectId]/artefacts/stale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stale regenerable artefacts for an authorised project", async () => {
    const staleAt = new Date("2026-06-02T10:00:00.000Z");
    const createdAt = new Date("2026-06-01T10:00:00.000Z");

    requireSessionUserMock.mockResolvedValue({ userId: "user-1" });
    projectFindFirstMock.mockResolvedValue({ id: "project-1" });
    artefactFindManyMock.mockResolvedValue([
      { id: "artefact-1", type: "quick_site_check", staleAt, createdAt },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/projects/project-1/artefacts/stale"), {
      params: { projectId: "project-1" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(projectFindFirstMock).toHaveBeenCalledWith({
      where: {
        OR: [{ id: "project-1" }, { publicId: "project-1" }],
        AND: [{ OR: [{ createdById: "user-1" }, { userId: "user-1" }, { collaborators: { some: { userId: "user-1" } } }] }],
      },
      select: { id: true },
    });
    expect(artefactFindManyMock).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        staleAt: { not: null },
        type: { in: ["quick_site_check", "pre_see_planning_memo"] },
      },
      select: { id: true, type: true, staleAt: true, createdAt: true },
      orderBy: { staleAt: "desc" },
    });
    expect(payload).toEqual({
      staleArtefacts: [
        {
          id: "artefact-1",
          type: "quick_site_check",
          staleAt: "2026-06-02T10:00:00.000Z",
          createdAt: "2026-06-01T10:00:00.000Z",
        },
      ],
    });
  });
});
