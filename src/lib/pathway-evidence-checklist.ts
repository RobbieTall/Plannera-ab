export const PATHWAY_EVIDENCE_CHECKLIST_VERSION =
  "item74h-evidence-checklist.v2" as const;

export type PathwayEvidenceRequestKind =
  | "REGISTERED_CADASTRAL_PLAN"
  | "LOT_AREA_RECONCILIATION"
  | "LEGAL_SETBACKS"
  | "AUTHORITATIVE_ROAD_CLASSIFICATION"
  | "REVIEWED_SITE_MEASUREMENTS"
  | "CURRENT_SOURCE"
  | "CURRENT_CONTROL"
  | "GATE_EVIDENCE";

export type PathwayEvidenceRequest = {
  id: string;
  kind: PathwayEvidenceRequestKind;
  title: string;
  why: string;
  provide: string;
  blockingGateOrders: number[];
};

export type PathwayEvidenceChecklistInput = {
  decision: string;
  current: boolean;
  proposal:
    | {
        trust: string;
        evidenceState: string;
        roadCategory: string;
      }
    | null;
  sources: Array<{
    kind: string;
    current: boolean;
  }>;
  controls: Array<{
    label: string;
    current: boolean;
  }>;
  gates: Array<{
    order: number;
    question: string;
    outcome: string;
    reasoning: string;
  }>;
};

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";

const sortedBlockingGates = (
  gates: PathwayEvidenceChecklistInput["gates"],
) =>
  gates
    .filter((gate) => gate.outcome === "MORE_EVIDENCE_REQUIRED")
    .sort((left, right) => left.order - right.order);

const gateEvidenceText = (
  gate: PathwayEvidenceChecklistInput["gates"][number],
) => (gate.question + " " + gate.reasoning).toLowerCase();

const uniqueGateOrders = (
  gates: PathwayEvidenceChecklistInput["gates"],
) => [...new Set(gates.map((gate) => gate.order))].sort((a, b) => a - b);

export function buildPathwayEvidenceChecklist(
  input: PathwayEvidenceChecklistInput,
): PathwayEvidenceRequest[] {
  if (input.decision !== "MORE_EVIDENCE_REQUIRED") return [];

  const blockingGates = sortedBlockingGates(input.gates);
  const blockingGateOrders = blockingGates.map((gate) => gate.order);
  const requests: PathwayEvidenceRequest[] = [];

  const registeredAreaGate = blockingGates.find((gate) => {
    const text = gateEvidenceText(gate);
    return (
      text.includes("registered plan") &&
      (text.includes("parcel area") ||
        text.includes("area record") ||
        text.includes("hectare"))
    );
  });
  if (registeredAreaGate) {
    requests.push({
      id: "registered-cadastral-plan",
      kind: "REGISTERED_CADASTRAL_PLAN",
      title: "Obtain the registered cadastral plan",
      why:
        "The registered plan has not been reviewed, so the legal parcel area cannot yet be relied on.",
      provide:
        "The current registered plan for the confirmed lot from NSW Land Registry Services, reviewed against the same site.",
      blockingGateOrders: [registeredAreaGate.order],
    });
    requests.push({
      id: "lot-area-reconciliation",
      kind: "LOT_AREA_RECONCILIATION",
      title: "Reconcile the conflicting parcel areas",
      why: registeredAreaGate.reasoning,
      provide:
        "A documented reconciliation identifying the registered-plan area and explaining which current cadastral or survey record governs this assessment.",
      blockingGateOrders: [registeredAreaGate.order],
    });
  }

  const legalSetbackGates = blockingGates.filter((gate) => {
    const text = gateEvidenceText(gate);
    return text.includes("legally classified") && text.includes("setback");
  });
  if (legalSetbackGates.length) {
    requests.push({
      id: "legal-road-side-rear-setbacks",
      kind: "LEGAL_SETBACKS",
      title: "Confirm the legal road, side and rear setbacks",
      why:
        "An indicative shed-to-fence dimension does not establish legally classified road, side and rear setbacks.",
      provide:
        "A reviewed registered survey and proposed shed layout identifying the legal road frontage and boundaries, with measured road, side and rear setbacks.",
      blockingGateOrders: uniqueGateOrders(legalSetbackGates),
    });
  }

  if (input.proposal?.roadCategory === "UNRESOLVED") {
    requests.push({
      id: "authoritative-road-classification",
      kind: "AUTHORITATIVE_ROAD_CLASSIFICATION",
      title: "Confirm the road classification and frontage",
      why:
        "The proposal is still bound to an unresolved road category, so the applicable road-setback branch cannot be confirmed.",
      provide:
        "Authoritative TfNSW or council evidence identifying the road classification and the legal frontage used by this proposal.",
      blockingGateOrders,
    });
  }

  if (
    input.proposal?.trust === "USER_ATTESTED" ||
    input.proposal?.evidenceState === "MORE_EVIDENCE_REQUIRED"
  ) {
    requests.push({
      id: "reviewed-site-measurements",
      kind: "REVIEWED_SITE_MEASUREMENTS",
      title: "Provide a reviewed survey and proposed shed layout",
      why:
        "The saved land area, building footprint, height and setbacks are user estimates rather than reviewed site evidence.",
      provide:
        "A current cadastral survey and proposed shed layout showing legal boundaries, land area, existing farm-building footprint, proposed footprint, building height, and road, side and other-boundary setbacks.",
      blockingGateOrders,
    });
  }

  for (const source of input.sources
    .filter((item) => !item.current)
    .sort((left, right) => left.kind.localeCompare(right.kind))) {
    requests.push({
      id: "current-source-" + slug(source.kind),
      kind: "CURRENT_SOURCE",
      title: "Refresh the " + source.kind + " source evidence",
      why:
        "The persisted " +
        source.kind +
        " source is not current at the time of this check.",
      provide:
        "Current authoritative " +
        source.kind +
        " evidence for the same confirmed site and proposal scope.",
      blockingGateOrders,
    });
  }

  for (const control of input.controls
    .filter((item) => !item.current)
    .sort((left, right) => left.label.localeCompare(right.label))) {
    requests.push({
      id: "current-control-" + slug(control.label),
      kind: "CURRENT_CONTROL",
      title: "Refresh the " + control.label + " control",
      why:
        "The persisted " +
        control.label +
        " control is not current at the time of this check.",
      provide:
        "A current typed control value with its operative LEP or DCP citation and effective date.",
      blockingGateOrders,
    });
  }

  for (const gate of blockingGates) {
    requests.push({
      id: "gate-" + gate.order,
      kind: "GATE_EVIDENCE",
      title: gate.question,
      why: gate.reasoning,
      provide:
        "Evidence that answers this persisted gate for the same site and proposal, reviewed against the cited planning source.",
      blockingGateOrders: [gate.order],
    });
  }

  return requests;
}
