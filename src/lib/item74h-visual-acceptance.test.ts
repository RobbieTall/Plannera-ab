import { describe, expect, it } from "vitest";

import {
  ITEM74H_VISUAL_ACCEPTANCE_BRANCH,
  item74hVisualAcceptanceAllowed,
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
