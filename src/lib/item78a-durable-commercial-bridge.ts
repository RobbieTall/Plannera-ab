export const ITEM78A_DURABLE_COMMERCIAL_BRIDGE_VERSION =
  "item78a-durable-commercial-bridge.v1" as const;

export type Item78aDurableCommercialBridgeFacts = {
  environment: "preview";
  paidSource: {
    stripeTestMode: boolean;
    paidPurchaseResolved: boolean;
    activeEntitlementResolved: boolean;
    exactProject: boolean;
    exactQuickSiteCheck: boolean;
    exactProposal: boolean;
    exactProductAndPrice: boolean;
    exactlyOnePlanningPack: boolean;
  };
  evidence: {
    quarantinedBeforeScan: boolean;
    cleanServerScan: boolean;
    unreviewedEvidenceDenied: boolean;
    operatorReviewPersisted: boolean;
    promotionReplaySafe: boolean;
    evidenceDigestChanged: boolean;
    changedEvidenceDenied: boolean;
  };
  credit: {
    exactQuote: boolean;
    reservedOnce: boolean;
    consumedOnce: boolean;
    consumedReplaySafe: boolean;
    crossScopeDenied: boolean;
  };
  workingSee: {
    sameProject: boolean;
    exactSourcePack: boolean;
    twoIntentionalVersions: boolean;
    versionReplaySafe: boolean;
    outputHashesChanged: boolean;
    docxGenerated: boolean;
    pdfGenerated: boolean;
    notSubmissionReady: boolean;
    operatorReviewStillRequired: boolean;
  };
  safety: {
    productionCheckoutDisabled: boolean;
    productionMutationPerformed: false;
    sensitiveValuesEmitted: false;
    syntheticDatabaseResidue: number;
    syntheticObjectResidue: number;
  };
};

export type Item78aDurableCommercialBridgeCheck =
  | "protected_preview"
  | "paid_source"
  | "exact_scope"
  | "single_pack"
  | "evidence_boundaries"
  | "evidence_regeneration"
  | "single_use_credit"
  | "cross_scope_denial"
  | "working_outputs"
  | "replay_safety"
  | "production_disabled"
  | "zero_residue";

export type Item78aDurableCommercialBridgeSummary = {
  runnerVersion: typeof ITEM78A_DURABLE_COMMERCIAL_BRIDGE_VERSION;
  passed: boolean;
  checks: Record<Item78aDurableCommercialBridgeCheck, boolean>;
  failedCheck: Item78aDurableCommercialBridgeCheck | null;
  productionCheckoutEnabled: false;
  productionMutationPerformed: false;
  syntheticOnly: true;
  containsSensitiveValues: false;
};

export function summarizeItem78aDurableCommercialBridge(
  facts: Item78aDurableCommercialBridgeFacts,
): Item78aDurableCommercialBridgeSummary {
  const checks: Record<Item78aDurableCommercialBridgeCheck, boolean> = {
    protected_preview: facts.environment === "preview",
    paid_source:
      facts.paidSource.stripeTestMode &&
      facts.paidSource.paidPurchaseResolved &&
      facts.paidSource.activeEntitlementResolved &&
      facts.paidSource.exactProductAndPrice,
    exact_scope:
      facts.paidSource.exactProject &&
      facts.paidSource.exactQuickSiteCheck &&
      facts.paidSource.exactProposal,
    single_pack: facts.paidSource.exactlyOnePlanningPack,
    evidence_boundaries:
      facts.evidence.quarantinedBeforeScan &&
      facts.evidence.cleanServerScan &&
      facts.evidence.unreviewedEvidenceDenied &&
      facts.evidence.operatorReviewPersisted &&
      facts.evidence.promotionReplaySafe &&
      facts.evidence.changedEvidenceDenied,
    evidence_regeneration:
      facts.evidence.evidenceDigestChanged &&
      facts.workingSee.twoIntentionalVersions &&
      facts.workingSee.outputHashesChanged,
    single_use_credit:
      facts.credit.exactQuote &&
      facts.credit.reservedOnce &&
      facts.credit.consumedOnce &&
      facts.credit.consumedReplaySafe,
    cross_scope_denial: facts.credit.crossScopeDenied,
    working_outputs:
      facts.workingSee.sameProject &&
      facts.workingSee.exactSourcePack &&
      facts.workingSee.docxGenerated &&
      facts.workingSee.pdfGenerated &&
      facts.workingSee.notSubmissionReady &&
      facts.workingSee.operatorReviewStillRequired,
    replay_safety:
      facts.workingSee.versionReplaySafe &&
      facts.credit.consumedReplaySafe &&
      facts.evidence.promotionReplaySafe,
    production_disabled:
      facts.safety.productionCheckoutDisabled &&
      facts.safety.productionMutationPerformed === false &&
      facts.safety.sensitiveValuesEmitted === false,
    zero_residue:
      facts.safety.syntheticDatabaseResidue === 0 &&
      facts.safety.syntheticObjectResidue === 0,
  };
  const failedCheck =
    (Object.entries(checks).find(([, passed]) => !passed)?.[0] as
      | Item78aDurableCommercialBridgeCheck
      | undefined) ?? null;

  return {
    runnerVersion: ITEM78A_DURABLE_COMMERCIAL_BRIDGE_VERSION,
    passed: failedCheck === null,
    checks,
    failedCheck,
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
    syntheticOnly: true,
    containsSensitiveValues: false,
  };
}
