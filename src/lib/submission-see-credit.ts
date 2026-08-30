import { createHash } from "crypto";

import { PLANNING_CONTROLS_PACK_TERMS } from "./planning-pack-commerce";
import { fingerprintPurchaseProposal } from "./purchase-entitlements";
import { SUBMISSION_SEE_PRICE_AUD } from "./submission-see-acceptance";

export const SUBMISSION_SEE_COMMERCIAL_TERMS = {
  productCode: "submission_see",
  productVersion: "v1",
  listAmountMinor: SUBMISSION_SEE_PRICE_AUD * 100,
  planningPackCreditMinor: PLANNING_CONTROLS_PACK_TERMS.amountMinor,
  creditedPayableMinor:
    SUBMISSION_SEE_PRICE_AUD * 100 -
    PLANNING_CONTROLS_PACK_TERMS.amountMinor,
  currency: "AUD",
} as const;

export type SubmissionSeeScope = {
  userId: string;
  projectId: string;
  quickSiteCheckArtefactId: string;
  proposalFingerprint: string;
};

export type PlanningPackCreditSource = SubmissionSeeScope & {
  entitlementId: string;
  productCode: string;
  productVersion: string;
  status: "ACTIVE" | "REFUNDED" | "REVOKED";
};

export type SubmissionSeeCreditStatus =
  | "RESERVED"
  | "CONSUMED"
  | "RELEASED";

export type SubmissionSeeCreditLedgerEntry = {
  idempotencyKey: string;
  sourceEntitlementId: string;
  targetPurchaseId: string;
  scopeKey: string;
  amountMinor: number;
  currency: "AUD";
  status: SubmissionSeeCreditStatus;
  reservedAt: string;
  consumedAt: string | null;
  releasedAt: string | null;
};

export type SubmissionSeeCreditIneligibilityReason =
  | "no_active_planning_pack"
  | "planning_pack_scope_mismatch"
  | "planning_pack_product_mismatch"
  | "planning_pack_inactive"
  | "credit_reserved"
  | "credit_consumed";

export type SubmissionSeeCreditQuote = {
  productCode: "submission_see";
  productVersion: "v1";
  currency: "AUD";
  listAmountMinor: number;
  creditAmountMinor: number;
  payableAmountMinor: number;
  creditEligible: boolean;
  creditSourceEntitlementId: string | null;
  ineligibilityReason: SubmissionSeeCreditIneligibilityReason | null;
  scope: SubmissionSeeScope;
  scopeKey: string;
};

export type SubmissionSeeCreditErrorCode =
  | "credit_not_eligible"
  | "credit_scope_mismatch"
  | "credit_already_reserved"
  | "credit_already_consumed"
  | "credit_source_inactive"
  | "credit_release_denied"
  | "invalid_credit_transition";

export class SubmissionSeeCreditError extends Error {
  constructor(readonly code: SubmissionSeeCreditErrorCode) {
    super(code);
  }
}

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const required = (value: string, label: string) => {
  const clean = value.trim();
  if (!clean) throw new Error(`${label} is required`);
  return clean;
};

const validTime = (value: string) =>
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export const buildSubmissionSeeScope = (input: {
  userId: string;
  projectId: string;
  quickSiteCheckArtefactId: string;
  proposalBrief: string;
}): SubmissionSeeScope => ({
  userId: required(input.userId, "Requester"),
  projectId: required(input.projectId, "Project"),
  quickSiteCheckArtefactId: required(
    input.quickSiteCheckArtefactId,
    "Quick Site Check",
  ),
  proposalFingerprint: fingerprintPurchaseProposal(input.proposalBrief),
});

export const submissionSeeScopeKey = (scope: SubmissionSeeScope) =>
  [
    scope.userId,
    scope.projectId,
    scope.quickSiteCheckArtefactId,
    scope.proposalFingerprint,
    SUBMISSION_SEE_COMMERCIAL_TERMS.productCode,
    SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion,
  ].join(":");

const sameScope = (
  left: SubmissionSeeScope,
  right: SubmissionSeeScope,
) =>
  left.userId === right.userId &&
  left.projectId === right.projectId &&
  left.quickSiteCheckArtefactId === right.quickSiteCheckArtefactId &&
  left.proposalFingerprint === right.proposalFingerprint;

const fullPriceQuote = (
  scope: SubmissionSeeScope,
  reason: SubmissionSeeCreditIneligibilityReason,
): SubmissionSeeCreditQuote => ({
  productCode: SUBMISSION_SEE_COMMERCIAL_TERMS.productCode,
  productVersion: SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion,
  currency: SUBMISSION_SEE_COMMERCIAL_TERMS.currency,
  listAmountMinor: SUBMISSION_SEE_COMMERCIAL_TERMS.listAmountMinor,
  creditAmountMinor: 0,
  payableAmountMinor: SUBMISSION_SEE_COMMERCIAL_TERMS.listAmountMinor,
  creditEligible: false,
  creditSourceEntitlementId: null,
  ineligibilityReason: reason,
  scope,
  scopeKey: submissionSeeScopeKey(scope),
});

export function quoteSubmissionSeeCredit(input: {
  scope: SubmissionSeeScope;
  planningPackEntitlement: PlanningPackCreditSource | null;
  ledgerEntries: SubmissionSeeCreditLedgerEntry[];
}): SubmissionSeeCreditQuote {
  const { scope, planningPackEntitlement: source, ledgerEntries } = input;
  if (!source) return fullPriceQuote(scope, "no_active_planning_pack");
  if (
    source.productCode !== PLANNING_CONTROLS_PACK_TERMS.productCode ||
    source.productVersion !== PLANNING_CONTROLS_PACK_TERMS.productVersion
  ) {
    return fullPriceQuote(scope, "planning_pack_product_mismatch");
  }
  if (!sameScope(scope, source)) {
    return fullPriceQuote(scope, "planning_pack_scope_mismatch");
  }
  if (source.status !== "ACTIVE") {
    return fullPriceQuote(scope, "planning_pack_inactive");
  }

  const activeEntry = ledgerEntries.find(
    (entry) =>
      entry.sourceEntitlementId === source.entitlementId &&
      entry.status !== "RELEASED",
  );
  if (activeEntry?.status === "RESERVED") {
    return fullPriceQuote(scope, "credit_reserved");
  }
  if (activeEntry?.status === "CONSUMED") {
    return fullPriceQuote(scope, "credit_consumed");
  }

  return {
    productCode: SUBMISSION_SEE_COMMERCIAL_TERMS.productCode,
    productVersion: SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion,
    currency: SUBMISSION_SEE_COMMERCIAL_TERMS.currency,
    listAmountMinor: SUBMISSION_SEE_COMMERCIAL_TERMS.listAmountMinor,
    creditAmountMinor:
      SUBMISSION_SEE_COMMERCIAL_TERMS.planningPackCreditMinor,
    payableAmountMinor:
      SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor,
    creditEligible: true,
    creditSourceEntitlementId: source.entitlementId,
    ineligibilityReason: null,
    scope,
    scopeKey: submissionSeeScopeKey(scope),
  };
}

export function reserveSubmissionSeeCredit(input: {
  quote: SubmissionSeeCreditQuote;
  targetPurchaseId: string;
  ledgerEntries: SubmissionSeeCreditLedgerEntry[];
  now: string;
}): SubmissionSeeCreditLedgerEntry {
  const targetPurchaseId = required(
    input.targetPurchaseId,
    "Target SEE purchase",
  );
  if (!validTime(input.now)) {
    throw new SubmissionSeeCreditError("invalid_credit_transition");
  }

  const targetReplay = input.ledgerEntries.find(
    (entry) => entry.targetPurchaseId === targetPurchaseId,
  );
  if (targetReplay) {
    if (
      input.quote.creditEligible &&
      targetReplay.sourceEntitlementId ===
        input.quote.creditSourceEntitlementId &&
      targetReplay.scopeKey === input.quote.scopeKey &&
      targetReplay.amountMinor ===
        SUBMISSION_SEE_COMMERCIAL_TERMS.planningPackCreditMinor &&
      targetReplay.currency === SUBMISSION_SEE_COMMERCIAL_TERMS.currency &&
      targetReplay.status !== "RELEASED"
    ) {
      return targetReplay;
    }
    throw new SubmissionSeeCreditError("credit_scope_mismatch");
  }

  if (
    !input.quote.creditEligible ||
    !input.quote.creditSourceEntitlementId ||
    input.quote.creditAmountMinor !==
      SUBMISSION_SEE_COMMERCIAL_TERMS.planningPackCreditMinor ||
    input.quote.payableAmountMinor !==
      SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor
  ) {
    throw new SubmissionSeeCreditError("credit_not_eligible");
  }

  const activeSourceEntry = input.ledgerEntries.find(
    (entry) =>
      entry.sourceEntitlementId ===
        input.quote.creditSourceEntitlementId &&
      entry.status !== "RELEASED",
  );
  if (activeSourceEntry?.status === "RESERVED") {
    throw new SubmissionSeeCreditError("credit_already_reserved");
  }
  if (activeSourceEntry?.status === "CONSUMED") {
    throw new SubmissionSeeCreditError("credit_already_consumed");
  }

  return {
    idempotencyKey: sha256(
      [
        "submission-see-credit.v1",
        input.quote.creditSourceEntitlementId,
        targetPurchaseId,
        input.quote.scopeKey,
      ].join(":"),
    ),
    sourceEntitlementId: input.quote.creditSourceEntitlementId,
    targetPurchaseId,
    scopeKey: input.quote.scopeKey,
    amountMinor:
      SUBMISSION_SEE_COMMERCIAL_TERMS.planningPackCreditMinor,
    currency: SUBMISSION_SEE_COMMERCIAL_TERMS.currency,
    status: "RESERVED",
    reservedAt: input.now,
    consumedAt: null,
    releasedAt: null,
  };
}

export function consumeSubmissionSeeCredit(input: {
  entry: SubmissionSeeCreditLedgerEntry;
  targetPurchaseId: string;
  sourceEntitlementStatus: PlanningPackCreditSource["status"];
  now: string;
}): SubmissionSeeCreditLedgerEntry {
  if (
    input.entry.targetPurchaseId !== input.targetPurchaseId ||
    !validTime(input.now)
  ) {
    throw new SubmissionSeeCreditError("credit_scope_mismatch");
  }
  if (input.entry.status === "CONSUMED") return input.entry;
  if (input.entry.status !== "RESERVED") {
    throw new SubmissionSeeCreditError("invalid_credit_transition");
  }
  if (input.sourceEntitlementStatus !== "ACTIVE") {
    throw new SubmissionSeeCreditError("credit_source_inactive");
  }
  return {
    ...input.entry,
    status: "CONSUMED",
    consumedAt: input.now,
  };
}

export function releaseSubmissionSeeCredit(input: {
  entry: SubmissionSeeCreditLedgerEntry;
  targetPurchaseId: string;
  now: string;
}): SubmissionSeeCreditLedgerEntry {
  if (
    input.entry.targetPurchaseId !== input.targetPurchaseId ||
    !validTime(input.now)
  ) {
    throw new SubmissionSeeCreditError("credit_scope_mismatch");
  }
  if (input.entry.status === "RELEASED") return input.entry;
  if (input.entry.status === "CONSUMED") {
    throw new SubmissionSeeCreditError("credit_release_denied");
  }
  if (input.entry.status !== "RESERVED") {
    throw new SubmissionSeeCreditError("invalid_credit_transition");
  }
  return {
    ...input.entry,
    status: "RELEASED",
    releasedAt: input.now,
  };
}
