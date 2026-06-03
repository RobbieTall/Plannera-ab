import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { promoteMaturityMock } = vi.hoisted(() => ({
  promoteMaturityMock: vi.fn(),
}));

vi.mock("@/lib/lga-coverage-qa", () => ({
  promoteMaturity: promoteMaturityMock,
}));

import { POST } from "./route";

describe("POST /api/admin/lga-coverage/promote", () => {
  const originalAdminSecret = process.env.ADMIN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.ADMIN_SECRET = originalAdminSecret;
  });

  it("promotes coverage when ADMIN_SECRET is valid", async () => {
    promoteMaturityMock.mockResolvedValue({
      from: "SEARCHABLE_READY",
      to: "STRUCTURED_PARTIAL",
      result: { passed: true, checks: [], clauseCount: 12, instrumentSlugsChecked: ["kempsey-lep-2013"] },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/lga-coverage/promote", {
        method: "POST",
        headers: { "x-admin-secret": "test-secret", "content-type": "application/json" },
        body: JSON.stringify({ lgaCode: "kempsey" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(promoteMaturityMock).toHaveBeenCalledWith("KEMPSEY");
    expect(payload).toEqual({
      lgaCode: "KEMPSEY",
      from: "SEARCHABLE_READY",
      to: "STRUCTURED_PARTIAL",
      result: { passed: true, checks: [], clauseCount: 12, instrumentSlugsChecked: ["kempsey-lep-2013"] },
    });
  });

  it("rejects requests with an invalid ADMIN_SECRET", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/lga-coverage/promote", {
        method: "POST",
        headers: { "x-admin-secret": "wrong", "content-type": "application/json" },
        body: JSON.stringify({ lgaCode: "KEMPSEY" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(promoteMaturityMock).not.toHaveBeenCalled();
  });
});
