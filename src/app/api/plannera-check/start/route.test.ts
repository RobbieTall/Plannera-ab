import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserContextMock, createProjectMock, recordEventMock } = vi.hoisted(() => ({
  getUserContextMock: vi.fn(),
  createProjectMock: vi.fn(),
  recordEventMock: vi.fn(),
}));

vi.mock("@/lib/getUserContext", () => ({ getUserContext: getUserContextMock }));
vi.mock("@/lib/projects", () => ({ createProjectForRequester: createProjectMock }));
vi.mock("@/lib/commercial-funnel-events", () => ({
  recordCommercialFunnelEventSafely: recordEventMock,
}));

import { POST } from "@/app/api/plannera-check/start/route";

const request = (body: unknown) =>
  new Request("http://localhost/api/plannera-check/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("Plannera Check start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserContextMock.mockResolvedValue({ sessionId: "session-1", userId: null });
    createProjectMock.mockResolvedValue({
      id: "project-1",
      title: "45 Broken Head Road",
    });
    recordEventMock.mockResolvedValue(undefined);
  });

  it("rejects additional client analytics fields", async () => {
    const response = await POST(request({
      title: "45 Broken Head Road",
      internalTraffic: false,
    }) as never);
    expect(response.status).toBe(400);
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("records start only after the requester project is created", async () => {
    const response = await POST(request({ title: "45 Broken Head Road" }) as never);
    expect(response.status).toBe(200);
    expect(createProjectMock).toHaveBeenCalledWith(
      "session-1",
      null,
      "45 Broken Head Road",
    );
    expect(recordEventMock).toHaveBeenCalledWith({
      eventName: "CHECK_STARTED",
      projectId: "project-1",
      sourceRecordId: "project-1",
      actorUserId: null,
    });
  });
});
