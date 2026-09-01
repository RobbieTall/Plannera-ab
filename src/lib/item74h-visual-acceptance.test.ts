import { describe, expect, it } from "vitest";

import {
  ITEM74H_VISUAL_ACCEPTANCE_BRANCH,
  ITEM74H_VISUAL_ACCEPTANCE_PATH,
  ITEM74H_VISUAL_ACCEPTANCE_VIEW_PATH,
  item74hEvidenceChecklistCopy,
  item74hVisualAcceptanceAllowed,
  item74hVisualAcceptanceRequestAllowed,
} from "./item74h-visual-acceptance";

const safePreview = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: ITEM74H_VISUAL_ACCEPTANCE_BRANCH,
  PLANNING_PACK_CHECKOUT_ENABLED: "false",
  SUBMISSION_SEE_CHECKOUT_ENABLED: "false",
};

describe("Item 74H protected visual acceptance", () => {
  it("allows only the exact checkout-disabled Vercel Preview branch", () => {
    expect(item74hVisualAcceptanceAllowed(safePreview)).toBe(true);
  });

  it("allows only the exact protected path and environment together", () => {
    expect(
      item74hVisualAcceptanceRequestAllowed(
        ITEM74H_VISUAL_ACCEPTANCE_PATH,
        safePreview,
      ),
    ).toBe(true);
    expect(
      item74hVisualAcceptanceRequestAllowed(
        ITEM74H_VISUAL_ACCEPTANCE_VIEW_PATH,
        safePreview,
      ),
    ).toBe(true);
    expect(
      item74hVisualAcceptanceRequestAllowed(
        ITEM74H_VISUAL_ACCEPTANCE_PATH + "/other",
        safePreview,
      ),
    ).toBe(false);
    expect(
      item74hVisualAcceptanceRequestAllowed(
        ITEM74H_VISUAL_ACCEPTANCE_PATH,
        { ...safePreview, VERCEL_ENV: "production" },
      ),
    ).toBe(false);
  });

  it("keeps working-product evidence copy commercially truthful", () => {
    const copy = item74hEvidenceChecklistCopy("WORKING");
    expect(copy.introduction).toContain("Working outputs");
    expect(copy.footer).toContain("same purchased project");
    expect(copy.footer).toContain("submission-ready");
    expect(copy.footer).not.toContain("remain locked");
  });

  it.each([
    ["local execution", { ...safePreview, VERCEL: undefined }],
    ["Production", { ...safePreview, VERCEL_ENV: "production" }],
    ["another branch", { ...safePreview, VERCEL_GIT_COMMIT_REF: "main" }],
    [
      "Planning Controls Pack checkout",
      { ...safePreview, PLANNING_PACK_CHECKOUT_ENABLED: "true" },
    ],
    [
      "submission SEE checkout",
      { ...safePreview, SUBMISSION_SEE_CHECKOUT_ENABLED: "true" },
    ],
  ])("fails closed for %s", (_label, environment) => {
    expect(item74hVisualAcceptanceAllowed(environment)).toBe(false);
  });
});
