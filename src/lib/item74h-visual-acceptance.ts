export const ITEM74H_VISUAL_ACCEPTANCE_BRANCH =
  "agent/item74h-visual-customer-proof-20260901" as const;

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
