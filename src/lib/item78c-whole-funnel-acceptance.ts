import type { Item78aDurableCommercialBridgeSummary } from "./item78a-durable-commercial-bridge";

export const ITEM78C_WHOLE_FUNNEL_ACCEPTANCE_VERSION =
  "item78c-byron-kempsey-whole-funnel.v1" as const;
export const ITEM78C_SEE_COMPILER_VERSION = "see-builder-standard.v1" as const;

export type Item78cCouncil = "BYRON" | "KEMPSEY";
export type Item78cJourneyRole = "DIRECT_SEE" | "CONSULTANT_REFERRAL";
export type Item78cLaunchDecision =
  | "READY_FOR_NON_PRODUCTION_ACCEPTANCE"
  | "HOLD";

export type Item78cSeeCompilerCheck =
  | "candidate_contract"
  | "dynamic_sections"
  | "statutory_s415"
  | "variation_merit"
  | "specialist_reports"
  | "evidence_finality"
  | "docx_rendered"
  | "pdf_rendered";

export type Item78cSeeCompilerEvidence = {
  runnerVersion: typeof ITEM78C_SEE_COMPILER_VERSION;
  checks: Record<Item78cSeeCompilerCheck, boolean>;
};

export type Item78cConsultantReferralEvidence = {
  runnerVersion: "consultant_referral_acceptance.v1";
  passed: boolean;
  reason: string | null;
  checks: Record<string, boolean>;
  statuses: string[];
  containsSensitiveValues: false;
};

export type Item78cCouncilJourneyEvidence = {
  council: Item78cCouncil;
  role: Item78cJourneyRole;
  protectedPreviewFixture: boolean;
  persistedProject: boolean;
  authoritativeLineage: {
    quickSiteCheck: boolean;
    detailedPlanningPack: boolean;
    workingSee: boolean;
  };
  commercialBridge: Item78aDurableCommercialBridgeSummary;
  seeCompiler: Item78cSeeCompilerEvidence;
};

export type Item78cWholeFunnelFacts = {
  journeys: Item78cCouncilJourneyEvidence[];
  consultantReferral: Item78cConsultantReferralEvidence;
  safety: {
    productionCheckoutDisabled: boolean;
    productionMutationPerformed: false;
    containsSensitiveValues: false;
  };
};

export type Item78cWholeFunnelCheck =
  | "evidence_files"
  | "council_coverage"
  | "journey_roles"
  | "protected_preview_projects"
  | "authoritative_lineage"
  | "paid_commercial_bridge"
  | "evidence_regeneration"
  | "single_use_credit"
  | "canonical_see_compiler"
  | "rendered_outputs"
  | "consultant_referral"
  | "replay_and_zero_residue"
  | "production_disabled"
  | "privacy_minimal";

export type Item78cWholeFunnelSummary = {
  runnerVersion: typeof ITEM78C_WHOLE_FUNNEL_ACCEPTANCE_VERSION;
  passed: boolean;
  decision: Item78cLaunchDecision;
  failedCheck: Item78cWholeFunnelCheck | null;
  checks: Record<Item78cWholeFunnelCheck, boolean>;
  journeys: Array<{
    council: Item78cCouncil;
    role: Item78cJourneyRole;
  }>;
  productionCheckoutEnabled: false;
  productionMutationPerformed: false;
  containsSensitiveValues: false;
};

const CHECK_ORDER: Item78cWholeFunnelCheck[] = [
  "evidence_files",
  "council_coverage",
  "journey_roles",
  "protected_preview_projects",
  "authoritative_lineage",
  "paid_commercial_bridge",
  "evidence_regeneration",
  "single_use_credit",
  "canonical_see_compiler",
  "rendered_outputs",
  "consultant_referral",
  "replay_and_zero_residue",
  "production_disabled",
  "privacy_minimal",
];

const REFERRAL_STATUSES = [
  "SUBMITTED",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "CONSULTANT_ACKNOWLEDGED",
  "CLOSED",
];

const allTrue = (values: Record<string, boolean>) =>
  Object.values(values).every((value) => value === true);

const hasExactSet = <T extends string>(values: T[], expected: T[]) =>
  values.length === expected.length &&
  new Set(values).size === expected.length &&
  expected.every((value) => values.includes(value));

const safeJourneys = (journeys: Item78cCouncilJourneyEvidence[]) =>
  journeys
    .map(({ council, role }) => ({ council, role }))
    .sort((left, right) => left.council.localeCompare(right.council));

export function holdItem78cWholeFunnelSummary(
  failedCheck: Item78cWholeFunnelCheck = "evidence_files",
): Item78cWholeFunnelSummary {
  return {
    runnerVersion: ITEM78C_WHOLE_FUNNEL_ACCEPTANCE_VERSION,
    passed: false,
    decision: "HOLD",
    failedCheck,
    checks: Object.fromEntries(
      CHECK_ORDER.map((check) => [check, false]),
    ) as Record<Item78cWholeFunnelCheck, boolean>,
    journeys: [],
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
    containsSensitiveValues: false,
  };
}

export function summarizeItem78cWholeFunnelAcceptance(
  facts: Item78cWholeFunnelFacts,
): Item78cWholeFunnelSummary {
  const councils = facts.journeys.map((journey) => journey.council);
  const roles = facts.journeys.map((journey) => journey.role);
  const commercialPass = facts.journeys.every(
    ({ commercialBridge }) =>
      commercialBridge.runnerVersion ===
        "item78a-durable-commercial-bridge.v1" &&
      commercialBridge.passed &&
      commercialBridge.failedCheck === null &&
      commercialBridge.syntheticOnly &&
      commercialBridge.productionCheckoutEnabled === false &&
      commercialBridge.productionMutationPerformed === false &&
      commercialBridge.containsSensitiveValues === false &&
      allTrue(commercialBridge.checks),
  );
  const compilerPass = facts.journeys.every(
    ({ seeCompiler }) =>
      seeCompiler.runnerVersion === ITEM78C_SEE_COMPILER_VERSION &&
      allTrue(seeCompiler.checks),
  );
  const consultantPass =
    facts.consultantReferral.runnerVersion ===
      "consultant_referral_acceptance.v1" &&
    facts.consultantReferral.passed &&
    facts.consultantReferral.reason === null &&
    facts.consultantReferral.containsSensitiveValues === false &&
    allTrue(facts.consultantReferral.checks) &&
    hasExactSet(facts.consultantReferral.statuses, REFERRAL_STATUSES);

  const checks: Record<Item78cWholeFunnelCheck, boolean> = {
    evidence_files: true,
    council_coverage: hasExactSet(councils, ["BYRON", "KEMPSEY"]),
    journey_roles: hasExactSet(roles, ["DIRECT_SEE", "CONSULTANT_REFERRAL"]),
    protected_preview_projects: facts.journeys.every(
      (journey) => journey.protectedPreviewFixture && journey.persistedProject,
    ),
    authoritative_lineage: facts.journeys.every(
      ({ authoritativeLineage }) =>
        authoritativeLineage.quickSiteCheck &&
        authoritativeLineage.detailedPlanningPack &&
        authoritativeLineage.workingSee,
    ),
    paid_commercial_bridge:
      commercialPass &&
      facts.journeys.every(
        ({ commercialBridge }) =>
          commercialBridge.checks.paid_source &&
          commercialBridge.checks.exact_scope &&
          commercialBridge.checks.single_pack,
      ),
    evidence_regeneration:
      commercialPass &&
      facts.journeys.every(
        ({ commercialBridge }) =>
          commercialBridge.checks.evidence_boundaries &&
          commercialBridge.checks.evidence_regeneration,
      ),
    single_use_credit:
      commercialPass &&
      facts.journeys.every(
        ({ commercialBridge }) =>
          commercialBridge.checks.single_use_credit &&
          commercialBridge.checks.cross_scope_denial,
      ),
    canonical_see_compiler: compilerPass,
    rendered_outputs:
      compilerPass &&
      facts.journeys.every(
        ({ commercialBridge, seeCompiler }) =>
          commercialBridge.checks.working_outputs &&
          seeCompiler.checks.docx_rendered &&
          seeCompiler.checks.pdf_rendered,
      ),
    consultant_referral:
      roles.filter((role) => role === "CONSULTANT_REFERRAL").length === 1 &&
      consultantPass,
    replay_and_zero_residue:
      commercialPass &&
      facts.journeys.every(
        ({ commercialBridge }) =>
          commercialBridge.checks.replay_safety &&
          commercialBridge.checks.zero_residue,
      ),
    production_disabled:
      facts.safety.productionCheckoutDisabled &&
      facts.safety.productionMutationPerformed === false &&
      facts.journeys.every(
        ({ commercialBridge }) =>
          commercialBridge.checks.production_disabled &&
          commercialBridge.productionCheckoutEnabled === false &&
          commercialBridge.productionMutationPerformed === false,
      ),
    privacy_minimal:
      facts.safety.containsSensitiveValues === false &&
      facts.consultantReferral.containsSensitiveValues === false &&
      facts.journeys.every(
        ({ commercialBridge }) =>
          commercialBridge.containsSensitiveValues === false,
      ),
  };

  const failedCheck =
    CHECK_ORDER.find((check) => checks[check] !== true) ?? null;
  const passed = failedCheck === null;

  return {
    runnerVersion: ITEM78C_WHOLE_FUNNEL_ACCEPTANCE_VERSION,
    passed,
    decision: passed ? "READY_FOR_NON_PRODUCTION_ACCEPTANCE" : "HOLD",
    failedCheck,
    checks,
    journeys: safeJourneys(facts.journeys),
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
    containsSensitiveValues: false,
  };
}
