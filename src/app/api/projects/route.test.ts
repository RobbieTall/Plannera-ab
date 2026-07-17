import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionFromRequestMock, createProjectForRequesterMock, listProjectsForRequesterMock } = vi.hoisted(() => ({
  getSessionFromRequestMock: vi.fn(),
  createProjectForRequesterMock: vi.fn(),
  listProjectsForRequesterMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getSessionFromRequest: getSessionFromRequestMock,
}));

vi.mock("@/lib/projects", () => ({
  createProjectForRequester: createProjectForRequesterMock,
  listProjectsForRequester: listProjectsForRequesterMock,
}));

import { GET, POST } from "./route";

const updatedAt = new Date("2026-07-17T00:00:00.000Z");

describe("/api/projects requester identity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates projects from server-derived requester identity and ignores client owner fields", async () => {
    getSessionFromRequestMock.mockReturnValue({ sessionId: "session-1", userId: null });
    createProjectForRequesterMock.mockResolvedValue({ id: "project-1", title: "Site", updatedAt });

    const response = await POST(
      new NextRequest("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ title: "Site", userId: "attacker", sessionId: "other-session", ownerId: "other-user" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createProjectForRequesterMock).toHaveBeenCalledWith("session-1", null, "Site");
  });

  it("lists guest/current-session projects from server-derived requester identity", async () => {
    getSessionFromRequestMock.mockReturnValue({ sessionId: "session-1", userId: null });
    listProjectsForRequesterMock.mockResolvedValue([{ id: "project-1", publicId: null, title: "Site", address: null, zoning: null, updatedAt }]);

    const response = await GET(new NextRequest("http://localhost/api/projects"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listProjectsForRequesterMock).toHaveBeenCalledWith(null, "session-1");
    expect(payload.projects[0].updatedAt).toBe("2026-07-17T00:00:00.000Z");
  });

  it("lists signed/session-bound requester projects coherently", async () => {
    getSessionFromRequestMock.mockReturnValue({ sessionId: "session-1", userId: "user-1" });
    listProjectsForRequesterMock.mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/projects"));

    expect(response.status).toBe(200);
    expect(listProjectsForRequesterMock).toHaveBeenCalledWith("user-1", "session-1");
  });
});
