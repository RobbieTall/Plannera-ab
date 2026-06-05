import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ArtefactAccessErrorMock, chatMessageFindManyMock, projectFindFirstMock, requireSessionUserMock } = vi.hoisted(() => {
  class ArtefactAccessErrorMock extends Error {
    constructor(message: string, public status = 403) {
      super(message);
    }
  }

  return {
    ArtefactAccessErrorMock,
    chatMessageFindManyMock: vi.fn(),
    projectFindFirstMock: vi.fn(),
    requireSessionUserMock: vi.fn(),
  };
});

vi.mock("@/lib/artefact-service", () => ({
  ArtefactAccessError: ArtefactAccessErrorMock,
  requireSessionUser: requireSessionUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst: projectFindFirstMock },
    chatMessage: { findMany: chatMessageFindManyMock },
  },
}));

import { GET } from "./route";

describe("GET /api/projects/[projectId]/chat-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the latest project messages oldest first", async () => {
    requireSessionUserMock.mockResolvedValue({ userId: "user-1" });
    projectFindFirstMock.mockResolvedValue({ id: "project-1" });
    chatMessageFindManyMock.mockResolvedValue([
      { role: "assistant", content: "Second", createdAt: new Date("2026-06-02T10:05:00.000Z") },
      { role: "user", content: "First", createdAt: new Date("2026-06-02T10:00:00.000Z") },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/projects/proj-1/chat-history"), {
      params: { projectId: "proj-1" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(projectFindFirstMock).toHaveBeenCalledWith({
      where: {
        OR: [{ id: "proj-1" }, { publicId: "proj-1" }],
        AND: [{ OR: [{ createdById: "user-1" }, { userId: "user-1" }, { collaborators: { some: { userId: "user-1" } } }] }],
      },
      select: { id: true },
    });
    expect(chatMessageFindManyMock).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      select: { role: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    expect(payload).toEqual({
      messages: [
        { role: "user", content: "First", createdAt: "2026-06-02T10:00:00.000Z" },
        { role: "assistant", content: "Second", createdAt: "2026-06-02T10:05:00.000Z" },
      ],
    });
  });

  it("returns 401 when unauthenticated", async () => {
    requireSessionUserMock.mockRejectedValue(new ArtefactAccessErrorMock("Authentication required", 401));

    const response = await GET(new NextRequest("http://localhost/api/projects/proj-1/chat-history"), {
      params: { projectId: "proj-1" },
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when project is not found", async () => {
    requireSessionUserMock.mockResolvedValue({ userId: "user-1" });
    projectFindFirstMock.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/projects/missing/chat-history"), {
      params: { projectId: "missing" },
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Project not found or access denied" });
    expect(chatMessageFindManyMock).not.toHaveBeenCalled();
  });
});
