import { documentIdentifier } from "./see-document-version-summary";

export type SeeCheckoutQuote = {
  state: "available" | "paid";
  quoteId: string;
  currency: "AUD";
  listAmountMinor: number;
  creditAmountMinor: number;
  payableAmountMinor: number;
};

const endpoint = (projectId: string) =>
  "/api/projects/" + encodeURIComponent(projectId) + "/working-see/checkout";
const options = (signal: AbortSignal) => ({
  cache: "no-store" as const,
  credentials: "same-origin" as const,
  mode: "same-origin" as const,
  redirect: "error" as const,
  signal,
});
const genericFailure = () => new Error("Preview checkout is unavailable. No payment has been confirmed.");
const errorMessage = (status: number, code: unknown) => {
  if (status === 401) return "Sign in again before checking paid access.";
  if (status === 404) return "Preview test checkout is not enabled here.";
  if (code === "pending_reconciliation_required") return "A previous payment needs review. Do not pay again.";
  if (code === "source_scope_mismatch" || code === "quote_changed") return "The selected planning sources changed. Refresh this project before continuing.";
  if (code === "credit_unavailable") return "The planning-pack credit needs review before checkout. Do not pay again.";
  return "Preview checkout is unavailable. No payment has been confirmed.";
};
async function readJson(response: Response): Promise<Record<string, unknown>> {
  if (response.redirected || !response.headers.get("content-type")?.includes("application/json")) throw genericFailure();
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw genericFailure();
  return data as Record<string, unknown>;
}
async function post(input: {
  projectId: string; sourceDetailedPlanningPackArtefactId: string; sourceMemoArtefactId: string;
  action: "quote" | "checkout"; quoteId?: string; signal: AbortSignal;
}, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  if (![input.projectId, input.sourceDetailedPlanningPackArtefactId, input.sourceMemoArtefactId].every(documentIdentifier)) {
    throw new Error("Select a saved planning pack and matching assessment first.");
  }
  const body = {
    action: input.action, acknowledgeWorkingDocument: true,
    sourceDetailedPlanningPackArtefactId: input.sourceDetailedPlanningPackArtefactId,
    sourceMemoArtefactId: input.sourceMemoArtefactId,
    ...(input.action === "checkout" ? { quoteId: input.quoteId } : {}),
  };
  const response = await fetcher(endpoint(input.projectId), {
    ...options(input.signal), method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(response.status, data.error));
  return data;
}

export async function fetchSeeCheckoutAvailability(projectId: string, signal: AbortSignal,
  fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!documentIdentifier(projectId)) return false;
  const response = await fetcher(endpoint(projectId), options(signal));
  if (response.status === 404) return false;
  if (!response.ok) return false;
  const data = await readJson(response);
  return data.enabled === true;
}

export async function requestSeeCheckoutQuote(input: {
  projectId: string; sourceDetailedPlanningPackArtefactId: string; sourceMemoArtefactId: string;
  signal: AbortSignal;
}, fetcher: typeof fetch = fetch): Promise<SeeCheckoutQuote> {
  const data = await post({ ...input, action: "quote" }, fetcher);
  const q = data.quote;
  if (!q || typeof q !== "object" || Array.isArray(q)) throw genericFailure();
  const quote = q as Record<string, unknown>;
  if (!["available", "paid"].includes(String(quote.state)) || quote.currency !== "AUD" ||
    typeof quote.quoteId !== "string" ||
    !["listAmountMinor", "creditAmountMinor", "payableAmountMinor"].every(
      (key) => { const value = quote[key]; return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000; },
    )) throw genericFailure();
  if (quote.state === "available" &&
    (!/^[a-f0-9]{64}$/.test(quote.quoteId) ||
      Number(quote.creditAmountMinor) + Number(quote.payableAmountMinor) !== Number(quote.listAmountMinor))) {
    throw genericFailure();
  }
  if (quote.state === "paid" && (quote.quoteId !== "" || quote.payableAmountMinor !== 0)) throw genericFailure();
  return {
    state: quote.state as "available" | "paid", quoteId: quote.quoteId,
    currency: "AUD", listAmountMinor: quote.listAmountMinor as number,
    creditAmountMinor: quote.creditAmountMinor as number,
    payableAmountMinor: quote.payableAmountMinor as number,
  };
}

export async function createSeeTestCheckout(input: {
  projectId: string; sourceDetailedPlanningPackArtefactId: string; sourceMemoArtefactId: string;
  quoteId: string; signal: AbortSignal;
}, fetcher: typeof fetch = fetch): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(input.quoteId)) throw genericFailure();
  const data = await post({ ...input, action: "checkout" }, fetcher);
  if (typeof data.checkoutUrl !== "string") throw genericFailure();
  try {
    const url = new URL(data.checkoutUrl);
    if (url.origin !== "https://checkout.stripe.com" || url.username || url.password ||
      !/^\/c\/pay\/cs_test_[A-Za-z0-9]+$/.test(url.pathname)) throw genericFailure();
    return url.href;
  } catch {
    throw genericFailure();
  }
}
