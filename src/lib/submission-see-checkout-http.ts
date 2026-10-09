import type { SeeCheckoutSelection } from "./submission-see-checkout-scope";
import type { SeeCheckoutQuote } from "./submission-see-checkout";
import { documentIdentifier } from "./see-document-version-summary";
import { workingSeeRequestRejection } from "./working-see-preview-policy";
import { SeeCheckoutError, type SeePreviewCheckoutConfig } from "./submission-see-preview-checkout-config";

const headers = {
  "Content-Type": "application/json", "Cache-Control": "private, no-store",
  "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
const response = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), { status, headers });

export interface SeeCheckoutService {
  quote(selection: SeeCheckoutSelection): Promise<SeeCheckoutQuote>;
  checkout(selection: SeeCheckoutSelection, quoteId: string): Promise<{ checkoutUrl: string }>;
}

async function readBoundedBody(request: Request): Promise<Record<string, unknown> | null> {
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
      if (bytes > 2048) { await reader.cancel(); return null; }
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export function createSeeCheckoutHandler(deps: {
  getConfig(): SeePreviewCheckoutConfig | null;
  getActorId(): Promise<string | null>;
  getService(config: SeePreviewCheckoutConfig): Promise<SeeCheckoutService>;
}) {
  return async (request: Request, projectId: string) => {
    // Configuration and browser-origin checks precede auth, DB and provider access.
    const config = deps.getConfig();
    if (!config) return response(404, { error: "checkout_disabled" });
    if (request.headers.get("origin") !== config.origin ||
      workingSeeRequestRejection(request, projectId, {
        deploymentEnvironment: "preview", vercel: "1",
        branchUrl: new URL(config.origin).host,
      })) return response(400, { error: "invalid_checkout_request" });
    try {
      const actorId = await deps.getActorId();
      if (!actorId || actorId === "dev-bypass-user") return response(401, { error: "sign_in_required" });
      const data = await readBoundedBody(request);
      if (!data) return response(400, { error: "invalid_checkout_request" });
      const baseKeys = "acknowledgeWorkingDocument,action,sourceDetailedPlanningPackArtefactId,sourceMemoArtefactId";
      const keys = Object.keys(data).sort().join(",");
      const quote = data.action === "quote" && keys === baseKeys;
      const checkout = data.action === "checkout" &&
        keys === "acknowledgeWorkingDocument,action,quoteId,sourceDetailedPlanningPackArtefactId,sourceMemoArtefactId" &&
        typeof data.quoteId === "string" && /^[a-f0-9]{64}$/.test(data.quoteId);
      if ((!quote && !checkout) || data.acknowledgeWorkingDocument !== true ||
        !documentIdentifier(data.sourceDetailedPlanningPackArtefactId) ||
        !documentIdentifier(data.sourceMemoArtefactId)) {
        return response(400, { error: "invalid_checkout_request" });
      }
      const selection = { actorId, projectId,
        sourceDetailedPlanningPackArtefactId: data.sourceDetailedPlanningPackArtefactId,
        sourceMemoArtefactId: data.sourceMemoArtefactId };
      const service = await deps.getService(config);
      if (quote) {
        const result = await service.quote(selection);
        return response(200, { quote: {
          state: result.state, quoteId: result.quoteId, currency: result.currency,
          listAmountMinor: result.listAmountMinor, creditAmountMinor: result.creditAmountMinor,
          payableAmountMinor: result.payableAmountMinor,
        } });
      }
      const result = await service.checkout(selection, data.quoteId as string);
      return response(200, { checkoutUrl: result.checkoutUrl });
    } catch (error) {
      if (error instanceof SeeCheckoutError) return response(409, { error: error.code });
      return response(409, { error: "checkout_unavailable" });
    }
  };
}
