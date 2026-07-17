import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionFromRequestMock, deleteProjectForRequesterMock } = vi.hoisted(() => ({
  getSessionFromRequestMock: vi.fn(),
  deleteProjectForRequesterMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getSessionFromRequest: getSessionFromRequestMock,
}));

vi.mock("@/lib/projects", () => ({
  deleteProjectForRequester: deleteProjectForRequesterMock,
  getProjectForRequester: vi.fn(),
  renameProjectForRequester: vi.fn(),
}));

import { DELETE } from "./route";

describe("DELETE /api/projects/[projectId] requester scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes guest projects with current session identity only", async () => {
    getSessionFromRequestMock.mockReturnValue({ sessionId: "session-1", userId: null });
    deleteProjectForRequesterMock.mockResolvedValue({ count: 1 });

    const response = await DELETE(new NextRequest("http://localhost/api/projects/project-1", { method: "DELETE" }), {
      params: { projectId: "project-1" },
    });

    expect(response.status).toBe(200);
    expect(deleteProjectForRequesterMock).toHaveBeenCalledWith("project-1", null, "session-1");
  });

  it("returns not found when another requester cannot delete", async () => {
    getSessionFromRequestMock.mockReturnValue({ sessionId: "session-2", userId: null });
    deleteProjectForRequesterMock.mockResolvedValue({ count: 0 });

    const response = await DELETE(new NextRequest("http://localhost/api/projects/project-1", { method: "DELETE" }), {
      params: { projectId: "project-1" },
    });

    expect(response.status).toBe(404);
  });
});
