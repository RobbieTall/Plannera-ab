import { createSeeCheckoutHandler } from "@/lib/submission-see-checkout-http";
import { getSeePreviewCheckoutConfig } from "@/lib/submission-see-preview-checkout-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  return createSeeCheckoutHandler({
    getConfig: () => getSeePreviewCheckoutConfig(process.env),
    getActorId: async () => {
      const { getServerSession } = await import("next-auth");
      const { authOptions } = await import("@/lib/auth");
      return (await getServerSession(authOptions))?.user?.id ?? null;
    },
    getService: async (config) => {
      const { prisma } = await import("@/lib/prisma");
      const { SubmissionSeeCheckout } = await import("@/lib/submission-see-checkout");
      const { createSubmissionSeeStripeProvider } = await import("@/lib/submission-see-stripe-checkout");
      return new SubmissionSeeCheckout(prisma, createSubmissionSeeStripeProvider(process.env,
        async (parameters, options) => {
          const { default: Stripe } = await import("stripe");
          return new Stripe(config.secretKey, { maxNetworkRetries: 0, timeout: 15000 })
            .checkout.sessions.create(parameters, options);
        }), config.council);
    },
  })(request, params.projectId);
}
