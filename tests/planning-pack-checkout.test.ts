import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getPlanningPackCheckoutConfig, PLANNING_CONTROLS_PACK_TERMS } from "../src/lib/planning-pack-commerce";

test("server owns the approved Planning Controls Pack commercial terms", () => {
  assert.deepEqual(PLANNING_CONTROLS_PACK_TERMS, { productCode: "planning_controls_pack", productVersion: "v1", amountMinor: 4900, currency: "aud" });
});

test("checkout remains secret-free when disabled and fails closed when enabled without config", () => {
  const values = ["PLANNING_PACK_CHECKOUT_ENABLED", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PLANNING_PACK_CHECKOUT_SUCCESS_URL", "PLANNING_PACK_CHECKOUT_CANCEL_URL"] as const;
  const previous = Object.fromEntries(values.map((key) => [key, process.env[key]]));
  try {
    values.forEach((key) => delete process.env[key]);
    assert.equal(getPlanningPackCheckoutConfig().enabled, false);
    process.env.PLANNING_PACK_CHECKOUT_ENABLED = "true";
    assert.throws(() => getPlanningPackCheckoutConfig(), /temporarily unavailable/);
  } finally {
    values.forEach((key) => previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]);
  }
});

test("routes keep price out of browser input and require verified raw-body webhooks", async () => {
  const checkout = await readFile("src/app/api/planning-pack/checkout/route.ts", "utf8");
  const webhook = await readFile("src/app/api/webhooks/stripe/route.ts", "utf8");
  const generation = await readFile("src/app/api/artefacts/generate-detailed-planning-pack/route.ts", "utf8");
  assert.doesNotMatch(checkout, /body\.(amount|currency|product|gst)/i);
  assert.match(checkout, /PLANNING_CONTROLS_PACK_TERMS\.amountMinor/);
  assert.match(webhook, /request\.text\(\)/);
  assert.match(webhook, /stripe-signature/);
  assert.match(webhook, /verifyWebhook/);
  for (const event of ["checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired", "charge.refunded"]) assert.match(webhook, new RegExp(event.replaceAll(".", "\\.")));
  assert.ok(generation.indexOf("findActiveEntitlementForCurrentScope") < generation.indexOf("createDetailedPlanningPackArtefact({"));
});

test("Stripe metadata and persistence remain opaque and privacy-minimal", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  const provider = await readFile("src/lib/stripe-commerce.ts", "utf8");
  assert.doesNotMatch(schema, /providerPayload|stripePayload|paymentMetadata/);
  assert.deepEqual([...provider.matchAll(/metadata:\s*\{([^}]+)\}/g)].map((match) => match[1].trim()), ["purchase_id: input.purchaseId", "purchase_id: input.purchaseId"]);
  assert.doesNotMatch(provider, /proposal|address|zoning|clause|email|contact/i);
});
