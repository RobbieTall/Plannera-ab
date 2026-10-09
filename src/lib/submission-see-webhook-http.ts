import type { PaymentProvider } from "./stripe-commerce";
import { SubmissionSeePaymentPolicyError, verifySubmissionSeePreviewEvent } from "./submission-see-payment-policy";
import type { SeePreviewCheckoutConfig } from "./submission-see-preview-checkout-config";

type SignedInput = Parameters<typeof verifySubmissionSeePreviewEvent>[0];
type Service = { receive(input: SignedInput): Promise<unknown> };

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const response = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), { status, headers });

async function readRawBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "";
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 128 * 1024) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(part.value, { stream: true });
    }
    return body + decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

/** Separate test-only destination; never falls through to the live Planning Pack handler. */
export function createSubmissionSeeWebhookHandler(deps: {
  getConfig(): SeePreviewCheckoutConfig | null;
  getProvider(config: SeePreviewCheckoutConfig): Pick<PaymentProvider, "verifyWebhook">;
  getService(): Promise<Service>;
}) {
  return async (request: Request) => {
    const config = deps.getConfig();
    if (!config) return response(404, { error: "Not found" });
    const signature = request.headers.get("stripe-signature");
    if (!signature) return response(400, { error: "Invalid signature" });
    const rawBody = await readRawBody(request);
    if (rawBody === null) return response(413, { error: "Invalid event body" });
    try {
      const input: SignedInput = {
        gate: { deploymentEnvironment: "preview", enabled: "true", secretKey: config.secretKey },
        rawBody, signature, webhookSecret: config.webhookSecret,
        provider: deps.getProvider(config),
      };
      // Signature and test-mode checks precede every database access.
      const event = verifySubmissionSeePreviewEvent(input);
      if (!event) return response(200, { received: true });
      const service = await deps.getService();
      await service.receive(input);
      return response(200, { received: true });
    } catch (error) {
      if (error instanceof SubmissionSeePaymentPolicyError &&
        ["invalid_signature", "not_test_event"].includes(error.code)) {
        return response(400, { error: "Invalid event" });
      }
      // Do not log the signed payload, keys, customer data or provider errors.
      console.error("[submission-see-webhook] Signed Preview event needs retry or reconciliation");
      return response(500, { error: "Event could not be applied" });
    }
  };
}
