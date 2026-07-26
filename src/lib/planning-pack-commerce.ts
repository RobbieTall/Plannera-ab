import { ArtefactAccessError } from "@/lib/artefact-service";

export const PLANNING_CONTROLS_PACK_TERMS = {
  productCode: "planning_controls_pack",
  productVersion: "v1",
  amountMinor: 4900,
  currency: "AUD",
} as const;

export type PlanningPackCheckoutConfig = {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export const getPlanningPackCheckoutConfig = (): PlanningPackCheckoutConfig => {
  const enabled = process.env.PLANNING_PACK_CHECKOUT_ENABLED === "true";
  const config = {
    enabled,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    successUrl: process.env.PLANNING_PACK_CHECKOUT_SUCCESS_URL,
    cancelUrl: process.env.PLANNING_PACK_CHECKOUT_CANCEL_URL,
  };
  if (
    enabled &&
    (!config.secretKey ||
      !config.webhookSecret ||
      !config.successUrl ||
      !config.cancelUrl)
  ) {
    throw new ArtefactAccessError(
      "Planning Controls Pack checkout is temporarily unavailable",
      503,
    );
  }
  return config;
};

export async function requirePlanningPackEntitlement(
  enabled: boolean,
  service: { findActiveEntitlementForCurrentScope(params: { userId: string; projectId: string; proposalBrief: string }): Promise<unknown> },
  params: { userId: string; projectId: string; proposalBrief: string },
) {
  if (!enabled) return;
  const entitlement = await service.findActiveEntitlementForCurrentScope(params);
  if (!entitlement) throw new ArtefactAccessError("Payment is required for this exact Planning Controls Pack scope", 402);
}
