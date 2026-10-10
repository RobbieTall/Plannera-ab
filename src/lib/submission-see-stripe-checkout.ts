import type Stripe from "stripe";
import type { SeeCheckoutProvider } from "./submission-see-checkout";
import { SUBMISSION_SEE_COMMERCIAL_TERMS as terms } from "./submission-see-credit";
import { getSeePreviewCheckoutConfig, SeeCheckoutError } from "./submission-see-preview-checkout-config";
import { documentIdentifier } from "./see-document-version-summary";

type Session = Pick<Stripe.Checkout.Session, "id" | "url" | "livemode" | "mode" |
  "status" | "payment_status" | "amount_total" | "currency" | "client_reference_id" | "metadata">;
export type CreateSeeStripeSession = (
  params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions,
) => Promise<Session>;

/** The caller supplies the SDK transport; tests supply an in-memory fake only. */
export function createSubmissionSeeStripeProvider(
  env: Record<string, string | undefined>, createSession: CreateSeeStripeSession,
): SeeCheckoutProvider {
  return {
    async create(input) {
      const config = getSeePreviewCheckoutConfig(env);
      if (!config) throw new SeeCheckoutError("checkout_disabled");
      if (!documentIdentifier(input.purchaseId) || !documentIdentifier(input.projectId) ||
        !/^[a-f0-9]{64}$/.test(input.idempotencyKey) || input.currency !== terms.currency ||
        ![terms.listAmountMinor, terms.creditedPayableMinor].includes(input.amountMinor)) {
        throw new SeeCheckoutError("provider_checkout_invalid");
      }
      const metadata = {
        purchase_id: input.purchaseId, project_id: input.projectId,
        product_code: terms.productCode, product_version: terms.productVersion,
      };
      const workspace = config.origin + "/projects/" + encodeURIComponent(input.projectId) + "/workspace";
      let session: Session;
      try {
        session = await createSession({
          mode: "payment",
          payment_method_types: ["card"],
          client_reference_id: input.purchaseId,
          metadata,
          payment_intent_data: { metadata },
          line_items: [{ quantity: 1, price_data: {
            currency: "aud", unit_amount: input.amountMinor,
            product_data: {
              name: "Plannera working SEE - Preview test",
              description: "Working document only; outstanding evidence requires review before submission.",
            },
          } }],
          // Gross approved rehearsal amount only. This does not validate live tax setup.
          automatic_tax: { enabled: false },
          allow_promotion_codes: false,
          success_url: workspace + "?seeCheckout=returned",
          cancel_url: workspace + "?seeCheckout=cancelled",
        }, { idempotencyKey: input.idempotencyKey });
      } catch {
        // Never forward SDK errors, credentials, payment details or request bodies.
        throw new SeeCheckoutError("provider_checkout_invalid");
      }
      if (session.livemode !== false || session.mode !== "payment" ||
        session.status !== "open" || session.payment_status !== "unpaid" ||
        session.amount_total !== input.amountMinor || session.currency !== "aud" ||
        session.client_reference_id !== input.purchaseId ||
        Object.entries(metadata).some(([key, value]) => session.metadata?.[key] !== value) ||
        !/^cs_test_[A-Za-z0-9]+$/.test(session.id)) {
        throw new SeeCheckoutError("provider_checkout_invalid");
      }
      try {
        const url = new URL(session.url ?? "");
        if (url.origin !== "https://checkout.stripe.com" || url.username || url.password ||
          url.pathname !== "/c/pay/" + session.id) throw new Error("invalid");
      } catch { throw new SeeCheckoutError("provider_checkout_invalid"); }
      return { id: session.id, url: session.url! };
    },
  };
}
