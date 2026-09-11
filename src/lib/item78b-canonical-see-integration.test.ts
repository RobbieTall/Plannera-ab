import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  OPTIONAL_SUBMISSION_SEE_SECTIONS,
  REQUIRED_SUBMISSION_SEE_SECTIONS,
} from "./submission-see-acceptance";

const artefactService = readFileSync(
  new URL("./artefact-service.ts", import.meta.url),
  "utf8",
);
const panel = readFileSync(
  new URL("../components/projects/see-document-panel.tsx", import.meta.url),
  "utf8",
);
const standard = readFileSync(
  new URL("../../docs/product/see-builder-standard.md", import.meta.url),
  "utf8",
);

describe("Item 78B canonical SEE integration", () => {
  it("uses the versioned compiler in the existing server-authoritative generation path", () => {
    expect(artefactService).toMatch(
      /compileCanonicalSeeFromPreSee/,
    );
    expect(artefactService).toMatch(
      /content\.canonicalSee = compileCanonicalSeeFromPreSee/,
    );
    expect(artefactService).toMatch(
      /detailedPlanningPack: resolvedPack\.pack/,
    );
  });

  it("keeps section 4.15 core and optional sections evidence-driven", () => {
    expect(REQUIRED_SUBMISSION_SEE_SECTIONS).toContain(
      "section_4_15_evaluation",
    );
    expect(REQUIRED_SUBMISSION_SEE_SECTIONS).not.toContain(
      "mitigation_measures",
    );
    expect(OPTIONAL_SUBMISSION_SEE_SECTIONS).toEqual([
      "application_history",
      "assessment_pathway_referrals",
      "variations_and_merit",
      "appendices_supporting_evidence",
    ]);
  });

  it("shows canonical sections without removing legacy memo rendering", () => {
    expect(panel).toMatch(/canonicalSee\.sections\.map/);
    expect(panel).toMatch(/!canonicalSee && show\(1\)/);
    expect(panel).toMatch(/Canonical SEE compiler/);
  });

  it("records the implementation and finality boundary in the canonical standard", () => {
    expect(standard).toMatch(/see-builder-standard\.v1/);
    expect(standard).toMatch(
      /Compiler readiness means the section set is complete against registered evidence/,
    );
    expect(standard).toMatch(
      /does not itself mean submission readiness/,
    );
  });
});
