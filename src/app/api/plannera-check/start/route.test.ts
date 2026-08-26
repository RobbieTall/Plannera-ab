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

const proposalAttestation = {
  proposalPurpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE",
  landAreaHectares: 2.5,
  proposedBuildingFootprintSquareMetres: 80,
  existingFarmBuildingFootprintSquareMetres: 0,
  proposedBuildingHeightMetres: 3.5,
  roadSetbackMetres: 100,
  sideSetbackMetres: 10,
  otherBoundarySetbackMetres: 50,
  roadCategory: "UNRESOLVED",
} as const;

describe("Plannera Check start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserContextMock.mockResolvedValue({ sessionId: "session-1", userId: null });
    createProjectMock.mockResolvedValue({
      id: "project-1",
      title: "1 Example Lane, Sampletown NSW 2000",
    });
    recordEventMock.mockResolvedValue(undefined);
  });

  it("rejects additional client analytics fields", async () => {
    const response = await POST(request({
      title: "1 Example Lane, Sampletown NSW 2000",
      internalTraffic: false,
    }) as never);
    expect(response.status).toBe(400);
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("rejects partial proposal attestations before creating a project", async () => {
    const response = await POST(request({
      title: "1 Example Lane, Sampletown NSW 2000",
      proposalAttestation: {
        proposalPurpose:
          "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE",
        landAreaHectares: 2.5,
      },
    }) as never);

    expect(response.status).toBe(400);
    expect(createProjectMock).not.toHaveBeenCalled();
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("rejects impossible aggregate footprint before creating a project", async () => {
    const response = await POST(request({
      title: "1 Example Lane, Sampletown NSW 2000",
      proposalAttestation: {
        ...proposalAttestation,
        landAreaHectares: 0.005,
      },
    }) as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_proposal_attestation",
    });
    expect(createProjectMock).not.toHaveBeenCalled();
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it("evaluates a complete attestation without promoting its trust", async () => {
    const response = await POST(request({
      title: "1 Example Lane, Sampletown NSW 2000",
      proposalAttestation,
    }) as never);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.proposalAttestation).toMatchObject({
      trust: "USER_ATTESTED",
      decision: "MORE_EVIDENCE_REQUIRED",
      paidArtefactsEligible: false,
      landAreaSquareMetres: 25_000,
      aggregateFarmBuildingFootprintSquareMetres: 80,
      preliminaryRoadSetbackOutcome: "MEETS_BOTH_POSSIBLE_MINIMUMS",
      roadDistanceRobustToUnresolvedCategory: true,
    });
  });

  it("records start only after the requester project is created", async () => {
    const response = await POST(request({ title: "1 Example Lane, Sampletown NSW 2000" }) as never);
    expect(response.status).toBe(200);
    expect(createProjectMock).toHaveBeenCalledWith(
      "session-1",
      null,
      "1 Example Lane, Sampletown NSW 2000",
    );
    expect(recordEventMock).toHaveBeenCalledWith({
      eventName: "CHECK_STARTED",
      projectId: "project-1",
      sourceRecordId: "project-1",
      actorUserId: null,
    });
    expect(await response.json()).toMatchObject({
      proposalAttestation: null,
    });
  });
});
