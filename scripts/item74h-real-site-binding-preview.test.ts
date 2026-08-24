import { describe, expect, it } from "vitest";

import { item74hPaidAssessmentSelector } from "./item74h-real-site-binding-preview";

describe("Item 74H composite Preview cleanup selector", () => {
  it("selects synthetic assessments by project scope rather than SHA commercial scope", () => {
    const prefix = "item74h-paid-exact-head-fixture-";
    const selector = item74hPaidAssessmentSelector(prefix);

    expect(selector).toEqual({
      projectId: { startsWith: prefix },
    });
    expect(selector).not.toHaveProperty("scopeKey");
  });

  it("keeps different synthetic runs isolated", () => {
    expect(item74hPaidAssessmentSelector("run-a-")).not.toEqual(
      item74hPaidAssessmentSelector("run-b-"),
    );
  });
});
