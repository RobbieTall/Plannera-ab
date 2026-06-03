import { beforeEach, describe, expect, it, vi } from "vitest";

const { notificationUpdateManyMock, projectFindFirstMock, requireSessionUserMock } = vi.hoisted(() => ({
  notificationUpdateManyMock: vi.fn(),
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
    projectNotification: { updateMany: notificationUpdateManyMock },
  },
}));

import { POST } from "./route";

describe("POST /api/projects/[projectId]/notifications/[notificationId]/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a project notification as read for an authorised project", async () => {
    requireSessionUserMock.mockResolvedValue({ userId: "user-1" });
    projectFindFirstMock.mockResolvedValue({ id: "project-1" });
    notificationUpdateManyMock.mockResolvedValue({ count: 1 });

    const response = await POST(new Request("http://localhost/api/projects/project-1/notifications/notification-1/read"), {
      params: { projectId: "project-1", notificationId: "notification-1" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(notificationUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "notification-1", projectId: "project-1" },
      data: { readAt: expect.any(Date) },
    });
    expect(payload).toEqual({ success: true });
  });
});
