import Stripe from "stripe";
import { createSubmissionSeeWebhookHandler } from "@/lib/submission-see-webhook-http";
import { getSeePreviewCheckoutConfig } from "@/lib/submission-see-preview-checkout-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return createSubmissionSeeWebhookHandler({
    getConfig: () => getSeePreviewCheckoutConfig(process.env),
    getProvider: (config) => {
      const stripe = new Stripe(config.secretKey, { maxNetworkRetries: 0, timeout: 15000 });
      return { verifyWebhook: (body, signature, secret) =>
        stripe.webhooks.constructEvent(body, signature, secret) };
    },
    getService: async () => {
      const { prisma } = await import("@/lib/prisma");
      const { SubmissionSeePaymentPersistence } = await import("@/lib/submission-see-payment-persistence");
      return new SubmissionSeePaymentPersistence(prisma);
    },
  })(request);
}
