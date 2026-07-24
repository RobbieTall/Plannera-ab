import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserContextMock, getProjectMock, artefactFindFirstMock, recordEventMock } = vi.hoisted(
  () => ({
    getUserContextMock: vi.fn(),
    getProjectMock: vi.fn(),
    artefactFindFirstMock: vi.fn(),
    recordEventMock: vi.fn(),
  }),
);

vi.mock("@/lib/getUserContext", () => ({ getUserContext: getUserContextMock }));
vi.mock("@/lib/projects", () => ({ getProjectForRequester: getProjectMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { artefact: { findFirst: artefactFindFirstMock } },
}));
vi.mock("@/lib/commercial-funnel-events", () => ({
  recordCommercialFunnelEvent: recordEventMock,
}));

import { POST } from "@/app/api/commercial-funnel/handoff/route";

const request = (body: unknown) =>
  new Request("http://localhost/api/commercial-funnel/handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("verified handoff interaction route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserContextMock.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    getProjectMock.mockResolvedValue({ id: "project-db-1" });
    artefactFindFirstMock.mockResolvedValue({ id: "review-1", projectId: "project-db-1" });
    recordEventMock.mockResolvedValue({});
  });

  it("rejects additional raw planning or personal fields", async () => {
    const response = await POST(request({
      projectId: "project-1",
      artefactId: "review-1",
      action: "copied",
      address: "45 Broken Head Road",
    }));
    expect(response.status).toBe(400);
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("rejects a project outside the requester scope", async () => {
    getProjectMock.mockResolvedValue(null);
    const response = await POST(request({
      projectId: "project-2",
      artefactId: "review-1",
      action: "copied",
    }));
    expect(response.status).toBe(404);
    expect(artefactFindFirstMock).not.toHaveBeenCalled();
  });

  it("rejects a handoff artefact outside the resolved project", async () => {
    artefactFindFirstMock.mockResolvedValue(null);
    const response = await POST(request({
      projectId: "project-1",
      artefactId: "review-other",
      action: "downloaded",
    }));
    expect(response.status).toBe(404);
    expect(artefactFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "review-other",
        projectId: "project-db-1",
        type: "review_request",
      },
      select: { id: true, projectId: true },
    });
  });

  it("records only the server-verified project, package and action", async () => {
    const response = await POST(request({
      projectId: "project-public-1",
      artefactId: "review-1",
      action: "downloaded",
    }));
    expect(response.status).toBe(202);
    expect(recordEventMock).toHaveBeenCalledWith({
      eventName: "HANDOFF_DOWNLOADED",
      projectId: "project-db-1",
      artefactId: "review-1",
      sourceRecordId: "review-1",
      actorUserId: "user-1",
    });
  });
});
