import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeeCheckoutHandler, type SeeCheckoutService } from "./submission-see-checkout-http";
import { SeeCheckoutError, type SeePreviewCheckoutConfig } from "./submission-see-preview-checkout-config";

const origin = "https://plannera-ab-git-see-doc-byron-20260930-robbietalls-projects.vercel.app";
const config: SeePreviewCheckoutConfig = { council: "BYRON", origin,
  secretKey: "sk_test_synthetic", webhookSecret: "whsec_synthetic" };
const body = { action: "quote", acknowledgeWorkingDocument: true,
  sourceDetailedPlanningPackArtefactId: "pack-1", sourceMemoArtefactId: "memo-1" };
const quote = { state: "available" as const, quoteId: "a".repeat(64), currency: "AUD" as const,
  listAmountMinor: 74900, creditAmountMinor: 4900, payableAmountMinor: 70000 };
const request = (data: unknown = body, headers: Record<string, string> = {}) => new Request(origin + "/api/checkout", {
  method: "POST", headers: { origin, "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
  body: typeof data === "string" ? data : JSON.stringify(data),
});
const setup = () => {
  const service = { quote: vi.fn<SeeCheckoutService["quote"]>().mockResolvedValue(quote),
    checkout: vi.fn<SeeCheckoutService["checkout"]>().mockResolvedValue({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_synthetic" }) };
  const deps = { getConfig: vi.fn<() => SeePreviewCheckoutConfig | null>().mockReturnValue(config),
    getActorId: vi.fn<() => Promise<string | null>>().mockResolvedValue("owner-1"),
    getService: vi.fn<() => Promise<SeeCheckoutService>>().mockResolvedValue(service) };
  return { deps, service, handler: createSeeCheckoutHandler(deps) };
};
afterEach(() => vi.unstubAllEnvs());

describe("protected Submission SEE checkout HTTP boundary", () => {
  it("blocks before auth, DB or provider when configuration is disabled", async () => {
    const { deps, handler } = setup(); deps.getConfig.mockReturnValue(null);
    expect((await handler(request(), "project-1")).status).toBe(404);
    expect(deps.getActorId).not.toHaveBeenCalled(); expect(deps.getService).not.toHaveBeenCalled();
  });
  it.each([
    { origin: "https://attacker.invalid" }, { origin: "null" }, { origin: "" },
    { "sec-fetch-site": "cross-site" }, { "content-type": "text/plain" },
  ])("rejects unsafe request headers %j before authentication", async (headers) => {
    const { deps, handler } = setup();
    const requestHeaders: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
      if (value !== undefined) requestHeaders[name] = value;
    }
    expect((await handler(request(body, requestHeaders), "project-1")).status).toBe(400);
    expect(deps.getActorId).not.toHaveBeenCalled(); expect(deps.getService).not.toHaveBeenCalled();
  });
  it.each([null, "dev-bypass-user"])("rejects absent or bypass actor %s", async (actor) => {
    const { deps, handler } = setup(); deps.getActorId.mockResolvedValue(actor);
    expect((await handler(request(), "project-1")).status).toBe(401);
    expect(deps.getService).not.toHaveBeenCalled();
  });
  it.each([
    { ...body, actorId: "other-owner" }, { ...body, projectId: "other-project" },
    { ...body, amountMinor: 1 }, { ...body, acknowledgeWorkingDocument: false },
    { ...body, sourceMemoArtefactId: "../other" }, { ...body, action: "pay" },
    { ...body, action: "checkout" }, { ...body, action: "checkout", quoteId: "tampered" },
    [], null, "{invalid", " ".repeat(2049),
  ])("rejects malformed or customer-priced input without service access %j", async (data) => {
    const { deps, handler } = setup();
    expect((await handler(request(data), "project-1")).status).toBe(400);
    expect(deps.getService).not.toHaveBeenCalled();
  });
  it("returns a private quote using server identity, without starting checkout", async () => {
    const { service, handler } = setup();
    const response = await handler(request(), "project-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ quote });
    expect(service.quote).toHaveBeenCalledWith({
      actorId: "owner-1", projectId: "project-1",
      sourceDetailedPlanningPackArtefactId: "pack-1", sourceMemoArtefactId: "memo-1",
    });
    expect(service.checkout).not.toHaveBeenCalled();
  });
  it("passes only the server-owned selection and exact acknowledged quote to checkout", async () => {
    const { service, handler } = setup();
    const response = await handler(request({ ...body, action: "checkout", quoteId: quote.quoteId }), "project-1");
    expect(response.status).toBe(200);
    expect(service.checkout).toHaveBeenCalledWith(expect.objectContaining({ actorId: "owner-1", projectId: "project-1" }), quote.quoteId);
    expect(service.quote).not.toHaveBeenCalled();
  });
  it("allows only the configured branch origin when a platform proxy has an internal URL", async () => {
    const { handler } = setup();
    const req = new Request("http://internal.invalid/api/checkout", {
      method: "POST", headers: { origin, "content-type": "application/json", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    });
    expect((await handler(req, "project-1")).status).toBe(200);
  });
  it.each(["source_scope_mismatch", "quote_changed", "already_paid"] as const)("returns bounded %s without underlying details", async (code) => {
    const { service, handler } = setup(); service.quote.mockRejectedValue(new SeeCheckoutError(code));
    const response = await handler(request(), "project-1");
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ error: code });
  });
  it("never serializes unknown upstream errors or the credential-bearing configuration", async () => {
    const { service, handler } = setup(); service.quote.mockRejectedValue(new Error("private-database-value"));
    const response = await handler(request(), "project-1");
    expect(await response.json()).toEqual({ error: "checkout_unavailable" });
  });
  it("the real route is disabled on Production without importing its live dependencies", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { POST } = await import("../app/api/projects/[projectId]/working-see/checkout/route");
    const response = await POST(request(), { params: { projectId: "project-1" } });
    expect(response.status).toBe(404);
  });
});
