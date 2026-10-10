import { describe, expect, it } from "vitest";
import {
  createSeeTestCheckout, fetchSeeCheckoutAvailability, requestSeeCheckoutQuote,
} from "./submission-see-checkout-client";

const input = () => ({
  projectId: "project-1", sourceDetailedPlanningPackArtefactId: "pack-1",
  sourceMemoArtefactId: "memo-1", signal: new AbortController().signal,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const available = { state: "available", quoteId: "a".repeat(64), currency: "AUD",
  listAmountMinor: 74900, creditAmountMinor: 4900, payableAmountMinor: 70000 };

describe("customer Preview SEE checkout client", () => {
  it("hides disabled Preview checkout without assuming payment", async () => {
    const fetcher: typeof fetch = async () => json({ error: "checkout_disabled" }, 404);
    expect(await fetchSeeCheckoutAvailability("project-1", input().signal, fetcher)).toBe(false);
  });
  it("recognises only a valid same-origin availability response", async () => {
    const fetcher: typeof fetch = async (url, init) => {
      expect(String(url)).toBe("/api/projects/project-1/working-see/checkout");
      expect(init?.credentials).toBe("same-origin");
      return json({ enabled: true });
    };
    expect(await fetchSeeCheckoutAvailability("project-1", input().signal, fetcher)).toBe(true);
  });
  it("quotes the exact selected sources without starting checkout", async () => {
    const fetcher: typeof fetch = async (url, init) => {
      expect(String(url)).toBe("/api/projects/project-1/working-see/checkout");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("same-origin");
      expect(JSON.parse(String(init?.body))).toEqual({
        action: "quote", acknowledgeWorkingDocument: true,
        sourceDetailedPlanningPackArtefactId: "pack-1", sourceMemoArtefactId: "memo-1",
      });
      return json({ quote: available });
    };
    expect(await requestSeeCheckoutQuote(input(), fetcher)).toEqual(available);
  });
  it("rejects an invalid quote rather than assuming payment", async () => {
    const fetcher: typeof fetch = async () => json({ quote: { ...available, quoteId: "bad" } });
    await expect(requestSeeCheckoutQuote(input(), fetcher)).rejects.toThrow("unavailable");
  });
  it("accepts paid status only from a validated server quote", async () => {
    const paid = { state: "paid", quoteId: "", currency: "AUD",
      listAmountMinor: 74900, creditAmountMinor: 0, payableAmountMinor: 0 };
    const fetcher: typeof fetch = async () => json({ quote: paid });
    expect(await requestSeeCheckoutQuote(input(), fetcher)).toEqual(paid);
  });
  it("requires a test-mode Stripe checkout URL", async () => {
    const fetcher: typeof fetch = async (url, init) => {
      expect(String(url)).toContain("/working-see/checkout");
      expect(JSON.parse(String(init?.body)).quoteId).toBe("a".repeat(64));
      return json({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_synthetic" });
    };
    expect(await createSeeTestCheckout({ ...input(), quoteId: "a".repeat(64) }, fetcher))
      .toBe("https://checkout.stripe.com/c/pay/cs_test_synthetic");
    const bad: typeof fetch = async () => json({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_synthetic" });
    await expect(createSeeTestCheckout({ ...input(), quoteId: "a".repeat(64) }, bad)).rejects.toThrow("unavailable");
  });
  it("warns against a second payment when reconciliation is required", async () => {
    const fetcher: typeof fetch = async () => json({ error: "pending_reconciliation_required" }, 409);
    await expect(requestSeeCheckoutQuote(input(), fetcher)).rejects.toThrow("Do not pay again");
  });
});
