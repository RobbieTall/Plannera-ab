import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ingestByronDcpMock, ingestCouncilDcpMock } = vi.hoisted(() => ({
  ingestByronDcpMock: vi.fn(),
  ingestCouncilDcpMock: vi.fn(),
}));

vi.mock("@/lib/dcp/byron-ingestion", () => ({ ingestByronDcp: ingestByronDcpMock }));
vi.mock("@/lib/dcp/council-dcp-ingestion", () => ({ ingestCouncilDcp: ingestCouncilDcpMock }));

import { POST } from "./route";

const makeRequest = (lga: string) =>
  new Request(`https://example.com/api/admin/ingest-dcp?lga=${lga}&secret=test-secret`, { method: "POST" });

describe("POST /api/admin/ingest-dcp", () => {
  const originalAdminAccessToken = process.env.ADMIN_ACCESS_TOKEN;
  const originalIngestAdminSecret = process.env.INGEST_ADMIN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_ACCESS_TOKEN;
    process.env.INGEST_ADMIN_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.ADMIN_ACCESS_TOKEN = originalAdminAccessToken;
    process.env.INGEST_ADMIN_SECRET = originalIngestAdminSecret;
  });

  it("triggers council DCP ingestion for Kempsey and returns 200", async () => {
    ingestCouncilDcpMock.mockResolvedValue({
      chunksCreated: 3,
      councilDocumentId: "council-document-1",
      title: "Kempsey Development Control Plan 2026",
    });

    const response = await POST(makeRequest("KEMPSEY"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(ingestCouncilDcpMock).toHaveBeenCalledWith("KEMPSEY");
    expect(ingestByronDcpMock).not.toHaveBeenCalled();
    expect(payload).toEqual({
      ok: true,
      chunksCreated: 3,
      councilDocumentId: "council-document-1",
      title: "Kempsey Development Control Plan 2026",
    });
  });

  it("returns 400 for unsupported LGAs", async () => {
    const response = await POST(makeRequest("BALLINA"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ ok: false, error: "unsupported_lga", lga: "BALLINA" });
    expect(ingestCouncilDcpMock).not.toHaveBeenCalled();
    expect(ingestByronDcpMock).not.toHaveBeenCalled();
  });
});
