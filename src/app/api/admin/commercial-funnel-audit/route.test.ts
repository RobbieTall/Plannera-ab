/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/commercial-funnel-audit", () => ({ auditCommercialFunnel: vi.fn() }));

import { auditCommercialFunnel } from "@/lib/commercial-funnel-audit";
import { GET } from "./route";
const auditMock = vi.mocked(auditCommercialFunnel);

describe("GET /api/admin/commercial-funnel-audit", () => {
  beforeEach(() => { process.env.INGEST_ADMIN_SECRET = "secret"; auditMock.mockReset(); });
  it("rejects missing secret", async () => expect((await GET(new Request("http://x/api/admin/commercial-funnel-audit?projectId=p"))).status).toBe(401));
  it("rejects wrong secret", async () => expect((await GET(new Request("http://x/api/admin/commercial-funnel-audit?secret=bad&projectId=p"))).status).toBe(401));
  it("rejects missing project", async () => expect((await GET(new Request("http://x/api/admin/commercial-funnel-audit?secret=secret"))).status).toBe(400));
  it("returns unknown project honestly", async () => { auditMock.mockResolvedValue({ version: "commercial_funnel_audit.v1", checkedAt: "now", project: null, error: "project_not_found" }); const response = await GET(new Request("http://x/api/admin/commercial-funnel-audit?secret=secret&projectId=missing")); expect(response.status).toBe(404); expect(await response.json()).toMatchObject({ error: "project_not_found" }); });
  it("returns audit with valid secret", async () => { auditMock.mockResolvedValue({ version: "commercial_funnel_audit.v1", checkedAt: "now", project: { id: "p" } } as any); const response = await GET(new Request("http://x/api/admin/commercial-funnel-audit?secret=secret&projectId=p")); expect(response.status).toBe(200); expect(auditMock).toHaveBeenCalledWith("p"); });
});
