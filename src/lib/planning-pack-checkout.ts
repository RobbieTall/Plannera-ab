import { ArtefactAccessError } from "@/lib/artefact-service";
import type { PurchaseEntitlementService } from "@/lib/purchase-entitlements";
import type { PaymentProvider } from "@/lib/stripe-commerce";
import { PLANNING_CONTROLS_PACK_TERMS } from "@/lib/planning-pack-commerce";

export async function createPlanningPackCheckout(
  service: PurchaseEntitlementService,
  provider: PaymentProvider,
  params: { userId: string; projectId: string; proposalBrief: string },
) {
  const active = await service.findActiveEntitlementForCurrentScope(params);
  if (active) {
    throw new ArtefactAccessError(
      "This exact Planning Controls Pack scope is already paid",
      409,
    );
  }
  const purchase = await service.createOrReusePendingIntent(params);
  const checkout = await provider.createHostedCheckout({
    purchaseId: purchase.id,
    amountMinor: PLANNING_CONTROLS_PACK_TERMS.amountMinor,
    currency: PLANNING_CONTROLS_PACK_TERMS.currency,
    productName: "Planning Controls Pack — A$49 incl. GST",
    idempotencyKey: purchase.idempotencyKey,
  });
  await service.attachProviderCheckout(purchase.id, checkout.id);
  return checkout;
}
