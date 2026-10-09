import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { createSubmissionSeeWebhookHandler } from "./submission-see-webhook-http";
import type { SeePreviewCheckoutConfig } from "./submission-see-preview-checkout-config";

const config: SeePreviewCheckoutConfig = {
  council: "BYRON", origin: "https://preview.example.test",
  secretKey: "sk_test_synthetic", webhookSecret: "whsec_synthetic",
};
const event = (livemode: boolean, type = "checkout.session.completed") => ({
  type, livemode,
  data: { object: {
    livemode, id: "cs_test_synthetic", metadata: { purchase_id: "purchase-1" },
    payment_status: "paid", payment_intent: "pi_synthetic",
    mode: "payment", amount_total: 74900, currency: "aud",
  } },
}) as unknown as Stripe.Event;
const request = (body = "synthetic", signature: string | null = "t=1,v1=synthetic") =>
  new Request("https://preview.example.test/api/webhooks/stripe/see", {
    method: "POST", body,
    headers: signature ? { "stripe-signature": signature } : {},
  });
const setup = () => {
  const verifyWebhook = vi.fn(() => event(false));
  const receive = vi.fn(async (input: unknown) => ({ action: "settle", input }));
  const getConfig = vi.fn<() => SeePreviewCheckoutConfig | null>(() => config);
  const getProvider = vi.fn(() => ({ verifyWebhook }));
  const getService = vi.fn(async () => ({ receive }));
  return {
    verifyWebhook, receive, getConfig, getProvider, getService,
    handler: createSubmissionSeeWebhookHandler({ getConfig, getProvider, getService }),
  };
};

describe("separate Preview SEE webhook boundary", () => {
  it("fails closed before provider and database when Preview is disabled", async () => {
    const s = setup(); s.getConfig.mockReturnValue(null);
    expect((await s.handler(request())).status).toBe(404);
    expect(s.getProvider).not.toHaveBeenCalled();
    expect(s.getService).not.toHaveBeenCalled();
  });
  it("rejects missing signatures and oversized bodies without opening the database", async () => {
    const s = setup();
    expect((await s.handler(request("synthetic", null))).status).toBe(400);
    expect((await s.handler(request("x".repeat(128 * 1024 + 1)))).status).toBe(413);
    expect(s.getProvider).not.toHaveBeenCalled();
    expect(s.getService).not.toHaveBeenCalled();
  });
  it("rejects invalid signatures before opening the database", async () => {
    const s = setup(); s.verifyWebhook.mockImplementation(() => { throw new Error("bad signature"); });
    expect((await s.handler(request())).status).toBe(400);
    expect(s.getService).not.toHaveBeenCalled();
  });
  it("rejects signed live-mode events before opening the database", async () => {
    const s = setup(); s.verifyWebhook.mockReturnValue(event(true));
    expect((await s.handler(request())).status).toBe(400);
    expect(s.getService).not.toHaveBeenCalled();
  });
  it("acknowledges unrelated signed test events without opening the database", async () => {
    const s = setup(); s.verifyWebhook.mockReturnValue(event(false, "customer.created"));
    expect((await s.handler(request())).status).toBe(200);
    expect(s.getService).not.toHaveBeenCalled();
  });
  it("passes signed test events to persistence and keeps the response private", async () => {
    const s = setup();
    const result = await s.handler(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(s.receive).toHaveBeenCalledOnce();
    expect(s.receive.mock.calls[0]?.[0]).toMatchObject({
      rawBody: "synthetic", signature: "t=1,v1=synthetic", webhookSecret: "whsec_synthetic",
    });
  });
  it("does not acknowledge a failed database transition", async () => {
    const s = setup();
    s.receive.mockRejectedValueOnce(new Error("synthetic transition failure"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await s.handler(request())).status).toBe(500);
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
  });
});
