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

  it("renders nothing when no evidence is missing", () => {
    expect(
      renderToStaticMarkup(
        <PathwayEvidenceChecklistPanel items={[]} />,
      ),
    ).toBe("");
  });
});
