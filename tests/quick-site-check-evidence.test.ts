import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summariseQuickSiteCheckEvidence } from "../src/lib/quick-site-check-evidence";
import type { QuickSiteCheckLepSuccess } from "../src/types/quick-site-check-lep";

const basePayload: QuickSiteCheckLepSuccess = {
  ok: true,
  projectId: "project-1",
  lga: "Byron",
  lepName: "Byron LEP 2014",
  zone: "SP3",
  objectives: [],
  controls: {
    heightOfBuilding: null,
    fsr: null,
    minLotSize: null,
    zoneObjectives: null,
  },
  permissibility: null,
  dataSource: "db_clauses",
  landUse: { withoutConsent: [], withConsent: [], prohibited: [] },
  part4: [],
  part5: [],
  part6: [],
};

describe("summariseQuickSiteCheckEvidence", () => {
  it("labels DB-backed structured LEP zone-table evidence as cited", () => {
    const summary = summariseQuickSiteCheckEvidence({
      ...basePayload,
      objectives: ["To provide for tourist-oriented development."],
      landUse: {
        withoutConsent: ["Environmental protection works"],
        withConsent: ["Eco-tourist facilities"],
        prohibited: ["Any development not specified in item 2 or 3"],
      },
    });

    assert.equal(summary.label, "Cited");
    assert.equal(summary.objectiveCount, 1);
    assert.equal(summary.landUseEntryCount, 3);
    assert.match(summary.detail, /1 DB-backed zone objective and 3 land-use entries/);
    assert.equal(summary.sourceRef, "Byron LEP 2014 Zone SP3");
  });

  it("labels a cited LEP numeric development standard as cited", () => {
    const summary = summariseQuickSiteCheckEvidence({
      ...basePayload,
      controls: {
        ...basePayload.controls,
        heightOfBuilding: {
          value: "9 m",
          clauseRef: "4.3",
          confidence: "Cited",
        },
      },
    });

    assert.equal(summary.label, "Cited");
    assert.equal(summary.citedControlCount, 1);
    assert.match(summary.detail, /1 cited numeric LEP control/);
  });

  it("does not let cited DCP-only controls make LEP evidence cited", () => {
    const summary = summariseQuickSiteCheckEvidence({
      ...basePayload,
      controls: {
        ...basePayload.controls,
        setback: {
          value: "Nil",
          clauseRef: "D4.2",
          sourceRef: "Kempsey DCP 2026 Part D",
          confidence: "Cited",
        },
        parking: {
          value: "See DCP table",
          clauseRef: "D4.5",
          sourceRef: "Kempsey DCP 2026 Part D",
          confidence: "Cited",
        },
        activeFrontageBuiltForm: {
          value: "Active street frontage encouraged",
          clauseRef: "D4.1",
          sourceRef: "Kempsey DCP 2026 Part D",
          confidence: "Cited",
        },
      },
    });

    assert.equal(summary.label, "Unavailable");
    assert.equal(summary.citedControlCount, 0);
    assert.match(summary.detail, /Treat LEP evidence as unresolved/);
  });

  it("does not treat fallback populated arrays without DB-clause provenance as cited", () => {
    const summary = summariseQuickSiteCheckEvidence({
      ...basePayload,
      dataSource: "fallback",
      objectives: ["Fallback objective"],
      landUse: {
        withoutConsent: ["Environmental protection works"],
        withConsent: ["Eco-tourist facilities"],
        prohibited: ["Any development not specified in item 2 or 3"],
      },
    });

    assert.equal(summary.label, "Unavailable");
    assert.equal(summary.objectiveCount, 1);
    assert.equal(summary.landUseEntryCount, 3);
  });

  it("labels a check with no zone table and no cited LEP controls as unavailable", () => {
    const summary = summariseQuickSiteCheckEvidence(basePayload);

    assert.equal(summary.label, "Unavailable");
    assert.equal(summary.citedControlCount, 0);
    assert.match(summary.detail, /Treat LEP evidence as unresolved/);
  });
});
