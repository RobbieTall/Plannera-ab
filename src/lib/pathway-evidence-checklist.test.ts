import { describe, expect, it } from "vitest";

import {
  PATHWAY_EVIDENCE_CHECKLIST_VERSION,
  buildPathwayEvidenceChecklist,
  type PathwayEvidenceChecklistInput,
} from "./pathway-evidence-checklist";

const unresolved = (): PathwayEvidenceChecklistInput &
  Record<string, unknown> => ({
  decision: "MORE_EVIDENCE_REQUIRED",
  current: true,
  proposal: {
    trust: "USER_ATTESTED",
    evidenceState: "MORE_EVIDENCE_REQUIRED",
    roadCategory: "UNRESOLVED",
  },
  sources: [
    { kind: "LEP", current: true },
    { kind: "SPATIAL", current: false },
  ],
  controls: [
    { label: "Building height", current: true },
    { label: "Road setback", current: false },
  ],
  gates: [
    {
      order: 2,
      question: "Are the site measurements reviewed?",
      outcome: "MORE_EVIDENCE_REQUIRED",
      reasoning: "The saved dimensions remain user-attested.",
    },
    {
      order: 0,
      question: "Is the address and zone confirmed?",
      outcome: "PROCEED",
      reasoning: "Authoritative site evidence is current.",
    },
    {
      order: 1,
      question: "Is the road category confirmed?",
      outcome: "MORE_EVIDENCE_REQUIRED",
      reasoning: "The legal frontage and road class are unresolved.",
    },
  ],
  privateAddress: "10 Private Road",
  latitude: -28.6,
  parcelIdentifier: "private-parcel",
});

describe("Item 74H customer evidence checklist", () => {
  it("turns persisted blockers into a deterministic actionable checklist", () => {
    expect(PATHWAY_EVIDENCE_CHECKLIST_VERSION).toBe(
      "item74h-evidence-checklist.v2",
    );

    const result = buildPathwayEvidenceChecklist(unresolved());

    expect(result.map((item) => item.kind)).toEqual([
      "AUTHORITATIVE_ROAD_CLASSIFICATION",
      "REVIEWED_SITE_MEASUREMENTS",
      "CURRENT_SOURCE",
      "CURRENT_CONTROL",
      "GATE_EVIDENCE",
      "GATE_EVIDENCE",
    ]);
    expect(result.map((item) => item.id)).toEqual([
      "authoritative-road-classification",
      "reviewed-site-measurements",
      "current-source-spatial",
      "current-control-road-setback",
      "gate-1",
      "gate-2",
    ]);
    expect(result[0]).toMatchObject({
      blockingGateOrders: [1, 2],
      title: "Confirm the road classification and frontage",
    });
    expect(result[1].provide).toContain("cadastral survey");
    expect(result[4]).toEqual({
      id: "gate-1",
      kind: "GATE_EVIDENCE",
      title: "Is the road category confirmed?",
      why: "The legal frontage and road class are unresolved.",
      provide:
        "Evidence that answers this persisted gate for the same site and proposal, reviewed against the cited planning source.",
      blockingGateOrders: [1],
    });
  });

  it("creates explicit registered-plan, area and legal-setback actions", () => {
    const input = unresolved();
    input.proposal = null;
    input.sources = input.sources.map((source) => ({
      ...source,
      current: true,
    }));
    input.controls = input.controls.map((control) => ({
      ...control,
      current: true,
    }));
    input.gates = [
      {
        order: 1,
        question:
          "Does a registered plan confirm the legal parcel area and resolve the conflicting area records?",
        outcome: "MORE_EVIDENCE_REQUIRED",
        reasoning:
          "The current NSW cadastral dataset records 38.8312589 hectares while the Council-hosted detail survey records 39.47 hectares.",
      },
      {
        order: 3,
        question:
          "Are all heritage, environmental, hazard and distance constraints resolved?",
        outcome: "MORE_EVIDENCE_REQUIRED",
        reasoning:
          "An indicative dimension is confirmed; legally classified road, side and rear setbacks remain unresolved.",
      },
    ];

    const result = buildPathwayEvidenceChecklist(input);

    expect(result.map((item) => item.id)).toEqual([
      "registered-cadastral-plan",
      "lot-area-reconciliation",
      "legal-road-side-rear-setbacks",
      "gate-1",
      "gate-3",
    ]);
    expect(result[0]).toMatchObject({
      kind: "REGISTERED_CADASTRAL_PLAN",
      blockingGateOrders: [1],
    });
    expect(result[1]).toMatchObject({
      kind: "LOT_AREA_RECONCILIATION",
      blockingGateOrders: [1],
    });
    expect(result[1].why).toContain("38.8312589 hectares");
    expect(result[1].why).toContain("39.47 hectares");
    expect(result[2]).toMatchObject({
      kind: "LEGAL_SETBACKS",
      blockingGateOrders: [3],
    });
    expect(result[2].provide).toContain("road, side and rear setbacks");
  });

  it("returns no missing-evidence requests for a current proceed decision", () => {
    const input = unresolved();
    input.decision = "PROCEED";
    expect(buildPathwayEvidenceChecklist(input)).toEqual([]);
  });

  it("does not project protected site fields into the checklist", () => {
    const serialized = JSON.stringify(
      buildPathwayEvidenceChecklist(unresolved()),
    );
    for (const protectedValue of [
      "10 Private Road",
      "-28.6",
      "private-parcel",
    ]) {
      expect(serialized).not.toContain(protectedValue);
    }
  });

  it("preserves a blocking gate even when no proposal summary is available", () => {
    const input = unresolved();
    input.proposal = null;
    input.sources = input.sources.map((source) => ({
      ...source,
      current: true,
    }));
    input.controls = input.controls.map((control) => ({
      ...control,
      current: true,
    }));

    expect(buildPathwayEvidenceChecklist(input)).toEqual([
      {
        id: "gate-1",
        kind: "GATE_EVIDENCE",
        title: "Is the road category confirmed?",
        why: "The legal frontage and road class are unresolved.",
        provide:
          "Evidence that answers this persisted gate for the same site and proposal, reviewed against the cited planning source.",
        blockingGateOrders: [1],
      },
      {
        id: "gate-2",
        kind: "GATE_EVIDENCE",
        title: "Are the site measurements reviewed?",
        why: "The saved dimensions remain user-attested.",
        provide:
          "Evidence that answers this persisted gate for the same site and proposal, reviewed against the cited planning source.",
        blockingGateOrders: [2],
      },
    ]);
  });
});
