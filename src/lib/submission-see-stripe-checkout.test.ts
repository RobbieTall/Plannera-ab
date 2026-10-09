import { describe, expect, it, vi } from "vitest";
import { createSubmissionSeeStripeProvider, type CreateSeeStripeSession } from "./submission-see-stripe-checkout";

const env = () => ({
  VERCEL_ENV: "preview", VERCEL: "1",
  SUBMISSION_SEE_PREVIEW_CHECKOUT_ENABLED: "true", PLANNERA_WORKING_SEE_GENERATION_ENABLED: "1",
  STRIPE_SECRET_KEY: "sk_test_synthetic", STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
  VERCEL_GIT_COMMIT_REF: "see-doc-byron-20260930",
  VERCEL_BRANCH_URL: "plannera-ab-git-see-doc-byron-20260930-robbietalls-projects.vercel.app",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-sweet-glade-a74ukspj.ap-southeast-2.aws.neon.tech/neondb?sslmode=require",
});
const input = { purchaseId: "purchase-1", projectId: "project-1", amountMinor: 70000,
  currency: "AUD" as const, idempotencyKey: "a".repeat(64) };
const session = () => ({
  id: "cs_test_synthetic", url: "https://checkout.stripe.com/c/pay/cs_test_synthetic",
  livemode: false, mode: "payment" as const, status: "open" as const, payment_status: "unpaid" as const,
  amount_total: 70000, currency: "aud", client_reference_id: "purchase-1",
  metadata: { purchase_id: "purchase-1", project_id: "project-1", product_code: "submission_see", product_version: "v1" },
});

describe("Submission SEE test-only Stripe adapter", () => {
  it("sends approved credit-adjusted amount, deterministic idempotency and metadata on session and intent", async () => {
    const transport = vi.fn<CreateSeeStripeSession>().mockResolvedValue(session());
    const provider = createSubmissionSeeStripeProvider(env(), transport);
    await expect(provider.create(input)).resolves.toEqual({ id: session().id, url: session().url });
    const [params, options] = transport.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: input.idempotencyKey });
    expect(params.line_items).toEqual([expect.objectContaining({ quantity: 1,
      price_data: expect.objectContaining({ currency: "aud", unit_amount: 70000 }) })]);
    expect(params.payment_intent_data?.metadata).toEqual(params.metadata);
    expect(params.metadata).toEqual(session().metadata);
    expect(params.payment_method_types).toEqual(["card"]);
    expect(params.automatic_tax).toEqual({ enabled: false });
    expect(params.allow_promotion_codes).toBe(false);
    expect(params.success_url).toBe("https://" + env().VERCEL_BRANCH_URL + "/projects/project-1/workspace?seeCheckout=returned");
    expect(JSON.stringify(params)).not.toContain("synthetic:synthetic");
    expect(params).not.toHaveProperty("customer_email");
  });
  it("accepts the approved full price without manufacturing a credit", async () => {
    const transport = vi.fn<CreateSeeStripeSession>().mockResolvedValue({ ...session(), amount_total: 74900 });
    await createSubmissionSeeStripeProvider(env(), transport).create({ ...input, amountMinor: 74900 });
    expect(transport.mock.calls[0][0].line_items?.[0].price_data?.unit_amount).toBe(74900);
  });
  it.each([
    { VERCEL_ENV: "production" }, { STRIPE_SECRET_KEY: "sk_live_synthetic" },
    { SUBMISSION_SEE_PREVIEW_CHECKOUT_ENABLED: "false" }, { VERCEL_GIT_COMMIT_REF: "main" },
    { DATABASE_URL: "postgresql://synthetic:synthetic@other.invalid/neondb?sslmode=require" },
  ])("does not contact provider with disabled or wrong target %j", async (change) => {
    const transport = vi.fn<CreateSeeStripeSession>();
    await expect(createSubmissionSeeStripeProvider({ ...env(), ...change }, transport).create(input))
      .rejects.toThrow("checkout_disabled");
    expect(transport).not.toHaveBeenCalled();
  });
  it.each([0, 49, 4900, 69999, 74901, NaN])("rejects unapproved amount %s before provider call", async (amountMinor) => {
    const transport = vi.fn<CreateSeeStripeSession>();
    await expect(createSubmissionSeeStripeProvider(env(), transport).create({ ...input, amountMinor }))
      .rejects.toThrow("provider_checkout_invalid");
    expect(transport).not.toHaveBeenCalled();
  });
  it.each([
    { livemode: true }, { amount_total: 1 }, { currency: "usd" }, { mode: "subscription" as const },
    { client_reference_id: "other-purchase" }, { metadata: {} }, { status: "expired" as const },
    { payment_status: "paid" as const }, { id: "cs_live_other" },
    { url: "https://attacker.invalid/c/pay/cs_test_synthetic" },
    { url: "https://checkout.stripe.com/c/pay/cs_test_other" },
    { url: "https://user:password@checkout.stripe.com/c/pay/cs_test_synthetic" },
    { url: null },
  ])("rejects mismatched provider response %j", async (change) => {
    const transport = vi.fn<CreateSeeStripeSession>().mockResolvedValue({ ...session(), ...change });
    await expect(createSubmissionSeeStripeProvider(env(), transport).create(input))
      .rejects.toThrow("provider_checkout_invalid");
  });
  it("uses identical provider parameters on retry", async () => {
    const transport = vi.fn<CreateSeeStripeSession>().mockResolvedValue(session());
    const provider = createSubmissionSeeStripeProvider(env(), transport);
    await provider.create(input);
    await provider.create(input);
    expect(transport.mock.calls[1]).toEqual(transport.mock.calls[0]);
  });
  it("redacts upstream failures", async () => {
    const transport = vi.fn<CreateSeeStripeSession>().mockRejectedValue(new Error("private-provider-payload"));
    await expect(createSubmissionSeeStripeProvider(env(), transport).create(input))
      .rejects.toThrow(/^provider_checkout_invalid$/);
  });
});
