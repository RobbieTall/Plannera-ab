export const ITEM74H_VISUAL_ACCEPTANCE_BRANCH =
  "agent/item74h-visual-route-guard-20260901" as const;

export const ITEM74H_VISUAL_ACCEPTANCE_PATH =
  "/internal/item74h-commercial-acceptance" as const;
export const ITEM74H_VISUAL_ACCEPTANCE_VIEW_PATH =
  "/internal/item74h-commercial-acceptance/view" as const;

type VisualAcceptanceEnvironment = {
  VERCEL?: string;
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  PLANNING_PACK_CHECKOUT_ENABLED?: string;
  SUBMISSION_SEE_CHECKOUT_ENABLED?: string;
};

export function item74hVisualAcceptanceAllowed(
  environment: VisualAcceptanceEnvironment,
): boolean {
  return (
    environment.VERCEL === "1" &&
    environment.VERCEL_ENV === "preview" &&
    environment.VERCEL_GIT_COMMIT_REF === ITEM74H_VISUAL_ACCEPTANCE_BRANCH &&
    environment.PLANNING_PACK_CHECKOUT_ENABLED !== "true" &&
    environment.SUBMISSION_SEE_CHECKOUT_ENABLED !== "true"
  );
}

export type Item74hEvidenceChecklistCommercialState =
  | "BLOCKED"
  | "WORKING"
  | "FINAL";

export function item74hEvidenceChecklistCopy(
  state: Item74hEvidenceChecklistCommercialState,
): { introduction: string; footer: string } {
  if (state === "WORKING") {
    return {
      introduction:
        "These requests come from the saved evidence gates. They do not predict approval. Working outputs keep every unresolved claim visibly qualified.",
      footer:
        "You can start the working A$49 and A$749 outputs now. Adding this evidence strengthens the same purchased project and is required before final or submission-ready status.",
    };
  }
  if (state === "FINAL") {
    return {
      introduction:
        "These requests record follow-up evidence for the saved pathway. They do not predict approval or alter the reviewed final status.",
      footer:
        "Keep the cited evidence with the same project so future regeneration preserves provenance and currentness.",
    };
  }
  return {
    introduction:
      "These requests come from the saved blocking gates. They do not predict approval or activate checkout.",
    footer:
      "Working and final A$49 and A$749 outputs remain unavailable until the required evidence is reviewed against the same confirmed site and proposal.",
  };
}

export function item74hVisualAcceptanceRequestAllowed(
  pathname: string,
  environment: VisualAcceptanceEnvironment,
): boolean {
  return (
    (pathname === ITEM74H_VISUAL_ACCEPTANCE_PATH ||
      pathname === ITEM74H_VISUAL_ACCEPTANCE_VIEW_PATH) &&
    item74hVisualAcceptanceAllowed(environment)
  );
}
