import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PathwayEvidenceChecklistPanel } from "./pathway-evidence-checklist-panel";

describe("PathwayEvidenceChecklistPanel", () => {
  it("renders the exact evidence action, reason, source request and gate", () => {
    const markup = renderToStaticMarkup(
      <PathwayEvidenceChecklistPanel
        items={[
          {
            id: "authoritative-road-classification",
            kind: "AUTHORITATIVE_ROAD_CLASSIFICATION",
            title: "Confirm the road classification and frontage",
            why: "The road category is unresolved.",
            provide: "Authoritative TfNSW or council evidence.",
            blockingGateOrders: [1],
          },
        ]}
      />,
    );

    expect(markup).toContain("What to provide next");
    expect(markup).toContain("Road evidence");
    expect(markup).toContain("Gate 01");
    expect(markup).toContain(
      "Confirm the road classification and frontage",
    );
    expect(markup).toContain("The road category is unresolved.");
    expect(markup).toContain(
      "<strong>Provide:</strong> Authoritative TfNSW or council evidence.",
    );
    expect(markup).toContain(
      "A$49 and A$749 outputs remain locked",
    );
  });

  it("labels registered-plan, area-reconciliation and legal-setback actions", () => {
    const markup = renderToStaticMarkup(
      <PathwayEvidenceChecklistPanel
        items={[
          {
            id: "registered-cadastral-plan",
            kind: "REGISTERED_CADASTRAL_PLAN",
            title: "Obtain the registered cadastral plan",
            why: "The registered plan has not been reviewed.",
            provide: "The current registered plan.",
            blockingGateOrders: [1],
          },
          {
            id: "lot-area-reconciliation",
            kind: "LOT_AREA_RECONCILIATION",
            title: "Reconcile the conflicting parcel areas",
            why: "Two current area records differ.",
            provide: "A documented reconciliation.",
            blockingGateOrders: [1],
          },
          {
            id: "legal-road-side-rear-setbacks",
            kind: "LEGAL_SETBACKS",
            title: "Confirm the legal road, side and rear setbacks",
            why: "The fence dimension is only indicative.",
            provide: "Reviewed measured setbacks.",
            blockingGateOrders: [3, 4],
          },
        ]}
      />,
    );

    expect(markup).toContain("Registered plan");
    expect(markup).toContain("Area reconciliation");
    expect(markup).toContain("Legal setbacks");
    expect(markup).toContain("Gate 03, Gate 04");
  });

  it("renders nothing when no evidence is missing", () => {
    expect(
      renderToStaticMarkup(
        <PathwayEvidenceChecklistPanel items={[]} />,
      ),
    ).toBe("");
  });
});
