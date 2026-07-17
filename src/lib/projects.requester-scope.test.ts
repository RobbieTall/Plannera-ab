import { beforeEach, describe, expect, it, vi } from "vitest";

const { projectFindManyMock, projectUpdateManyMock, projectDeleteManyMock } = vi.hoisted(() => ({
  projectFindManyMock: vi.fn(),
  projectUpdateManyMock: vi.fn(),
  projectDeleteManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: projectFindManyMock,
      updateMany: projectUpdateManyMock,
      deleteMany: projectDeleteManyMock,
    },
  },
}));

import { deleteProjectForRequester, listProjectsForRequester } from "@/lib/projects";

const projectRow = { id: "project-1", publicId: null, title: "Site", address: null, zoning: null, updatedAt: new Date("2026-07-17T00:00:00.000Z") };

describe("requester-scoped project continuity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only current-session guest projects", async () => {
    projectFindManyMock.mockResolvedValue([projectRow]);

    await expect(listProjectsForRequester(null, "session-1")).resolves.toEqual([projectRow]);
    expect(projectUpdateManyMock).not.toHaveBeenCalled();
    expect(projectFindManyMock).toHaveBeenCalledWith({
      where: { sessionId: "session-1", userId: null },
      orderBy: { updatedAt: "desc" },
      select: expect.any(Object),
    });
  });

  it("claims safe session projects then lists signed-in user projects", async () => {
    projectUpdateManyMock.mockResolvedValue({ count: 1 });
    projectFindManyMock.mockResolvedValue([projectRow]);

    await listProjectsForRequester("user-1", "session-1");
    expect(projectUpdateManyMock).toHaveBeenCalledWith({
      where: { sessionId: "session-1", userId: null },
      data: { userId: "user-1", sessionId: null },
    });
    expect(projectFindManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
      select: expect.any(Object),
    });
  });

  it("deletes guest projects by session without accepting another owner", async () => {
    projectDeleteManyMock.mockResolvedValue({ count: 1 });
    await deleteProjectForRequester("project-1", null, "session-1");
    expect(projectDeleteManyMock).toHaveBeenCalledWith({ where: { id: "project-1", sessionId: "session-1", userId: null } });
  });

  it("deletes signed-in projects by user", async () => {
    projectDeleteManyMock.mockResolvedValue({ count: 1 });
    await deleteProjectForRequester("project-1", "user-1", "session-1");
    expect(projectDeleteManyMock).toHaveBeenCalledWith({ where: { id: "project-1", userId: "user-1" } });
  });
});
