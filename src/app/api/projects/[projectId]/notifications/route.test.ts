import { beforeEach, describe, expect, it, vi } from "vitest";

const { notificationsFindManyMock, projectFindFirstMock, requireSessionUserMock } = vi.hoisted(() => ({
  notificationsFindManyMock: vi.fn(),
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
    project: { findFirst: projectFindFirstMock },
    projectNotification: { findMany: notificationsFindManyMock },
  },
}));

import { GET } from "./route";

describe("GET /api/projects/[projectId]/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches unread project notifications for an authorised project", async () => {
    const createdAt = new Date("2026-06-02T10:00:00.000Z");

    requireSessionUserMock.mockResolvedValue({ userId: "user-1" });
    projectFindFirstMock.mockResolvedValue({ id: "project-1" });
    notificationsFindManyMock.mockResolvedValue([
      {
        id: "notification-1",
        type: "LGA_SEARCHABLE_READY",
        title: "Local planning controls are searchable",
        message: "Local planning controls for KEMPSEY are now searchable. You can refresh affected project outputs where needed.",
        lgaCode: "KEMPSEY",
        createdAt,
      },
    ]);

    const response = await GET(new Request("http://localhost/api/projects/project-1/notifications"), {
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
    expect(notificationsFindManyMock).toHaveBeenCalledWith({
      where: { projectId: "project-1", readAt: null },
      select: { id: true, type: true, title: true, message: true, lgaCode: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    expect(payload).toEqual({
      notifications: [
        {
          id: "notification-1",
          type: "LGA_SEARCHABLE_READY",
          title: "Local planning controls are searchable",
          message:
            "Local planning controls for KEMPSEY are now searchable. You can refresh affected project outputs where needed.",
          lgaCode: "KEMPSEY",
          createdAt: "2026-06-02T10:00:00.000Z",
        },
      ],
    });
  });
});
