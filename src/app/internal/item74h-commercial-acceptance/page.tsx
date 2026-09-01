import { notFound } from "next/navigation";

import { Item74hCommercialPreviewHarness } from "@/components/projects/item74h-commercial-preview-harness";
import {
  buildItem74hCandidateReviewedPathwayProof,
  type CandidateGateDecision,
} from "@/lib/item74h-candidate-reviewed-pathway";
import {
  ITEM74H_VISUAL_ACCEPTANCE_BRANCH,
  item74hVisualAcceptanceAllowed,
} from "@/lib/item74h-visual-acceptance";
import {
  toPathwayCustomerResult,
  type PathwayCustomerResultInput,
} from "@/lib/pathway-customer-result";
import { attachPersistedPathwayProgressiveCommercialBinding } from "@/lib/pathway-progressive-commercial-binding";
import type { QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";

export const dynamic = "force-dynamic";

const asOf = new Date("2026-09-01T09:50:00.000Z");
const currentUntil = new Date("2026-10-01T00:00:00.000Z");

function toCustomerGateOutcome(
  outcome: CandidateGateDecision,
): "STOP" | "PROCEED" | "MERIT_ASSESSMENT" | "MORE_EVIDENCE_REQUIRED" {
  if (outcome === "MERIT") return "MERIT_ASSESSMENT";
  if (outcome === "MORE_EVIDENCE") return "MORE_EVIDENCE_REQUIRED";
  return outcome;
}

function buildPathwayResult() {
  const proof = buildItem74hCandidateReviewedPathwayProof();
  const input: PathwayCustomerResultInput = {
    decision: "MORE_EVIDENCE_REQUIRED",
    trustLevel: "SITE_CONFIRMED",
    isCurrent: true,
    assessedAt: asOf,
    staleAt: currentUntil,
    result: attachPersistedPathwayProgressiveCommercialBinding(
      {
        summary:
          "Council-reviewed Byron storage-shed pathway with current authoritative controls",
      },
      proof.binding,
    ),
    pathwayDefinition: {
      versionKey: proof.version,
      status: "ACTIVE",
    },
    spatialProvenance: {
      authority: "NSW Department of Planning",
      datasetName: "EPI Primary Planning Layers - Land Zoning",
      sourceUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      sourceVersion:
        "Byron LEP 2014 PCO 2014-297, currency 2026-08-21, cadid 180752773",
      retrievedAt: new Date("2026-09-01T06:00:00.000Z"),
      effectiveAt: new Date("2026-08-21T00:00:00.000Z"),
      trustLevel: "EVIDENCE_VERIFIED",
      staleAt: currentUntil,
    },
    evidenceSnapshots: [
      {
        evidenceKind: "LEP",
        authority: "NSW legislation and EPI Primary Planning Layers",
        sourceUrl:
          "https://legislation.nsw.gov.au/view/whole/html/inforce/current/epi-2014-0297",
        sourceVersion:
          "Byron LEP 2014 PCO 2014-297; height and FSR mapping currency 2026-08-21",
        retrievedAt: new Date("2026-09-01T06:00:00.000Z"),
        effectiveFrom: new Date("2026-08-21T00:00:00.000Z"),
        staleAt: currentUntil,
        isCurrentAtAssessment: true,
      },
      {
        evidenceKind: "DCP",
        authority: "Byron Shire Council",
        sourceUrl:
          "https://www.datocms-assets.com/94948/1772682408-file-lzwnir3ttw-tjpcr1vky-a.pdf",
        sourceVersion:
          "DCP 2014 Chapter D1, adopted 2026-01-27, effective 2026-02-23",
        retrievedAt: new Date("2026-09-01T08:00:00.000Z"),
        effectiveFrom: new Date("2026-02-23T00:00:00.000Z"),
        staleAt: currentUntil,
        isCurrentAtAssessment: true,
      },
      {
        evidenceKind: "DCP",
        authority: "Byron Shire Council",
        sourceUrl:
          "https://www.byron.nsw.gov.au/files/assets/public/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b14-excavation-and-fill-adopted-15-august-2019-effective-11-september-2019-24.2018.65.1.pdf",
        sourceVersion:
          "DCP 2014 Chapter B14, adopted 2019-08-15, effective 2019-09-11",
        retrievedAt: new Date("2026-09-01T09:30:00.000Z"),
        effectiveFrom: new Date("2019-09-11T00:00:00.000Z"),
        staleAt: currentUntil,
        isCurrentAtAssessment: true,
      },
    ],
    controlSnapshots: [
      {
        label: "Maximum building height",
        operator: "LTE",
        numericValue: 9,
        lowerBound: null,
        upperBound: null,
        textValue: null,
        unit: "m",
        sourceReference: "Byron LEP 2014 clause 4.3, Map Layer 5",
        isCurrentAtAssessment: true,
        staleAt: currentUntil,
      },
      {
        label: "Maximum floor-space ratio",
        operator: "LTE",
        numericValue: 0.4,
        lowerBound: null,
        upperBound: null,
        textValue: null,
        unit: ":1",
        sourceReference: "Byron LEP 2014 clause 4.4, Map Layer 1",
        isCurrentAtAssessment: true,
        staleAt: currentUntil,
      },
      {
        label: "Minimum side and rear setback",
        operator: "GTE",
        numericValue: 0.9,
        lowerBound: null,
        upperBound: null,
        textValue: null,
        unit: "m",
        sourceReference: "Byron DCP 2014 D1.2.2",
        isCurrentAtAssessment: true,
        staleAt: currentUntil,
      },
      {
        label: "Minimum local-road primary-front setback",
        operator: "GTE",
        numericValue: 4.5,
        lowerBound: null,
        upperBound: null,
        textValue: null,
        unit: "m",
        sourceReference: "Byron DCP 2014 D1.2.2",
        isCurrentAtAssessment: true,
        staleAt: currentUntil,
      },
      {
        label: "General excavation and fill maximum depth",
        operator: "LTE",
        numericValue: 1,
        lowerBound: null,
        upperBound: null,
        textValue: null,
        unit: "m",
        sourceReference: "Byron DCP 2014 B14.2",
        isCurrentAtAssessment: true,
        staleAt: currentUntil,
      },
    ],
    gateSnapshots: proof.gates.map((gate) => ({
      sequence: Number(gate.gate),
      question: gate.question,
      outcome: toCustomerGateOutcome(gate.outcome),
      reason: gate.reason,
    })),
  };

  return toPathwayCustomerResult(input, asOf);
}

const lepResult: QuickSiteCheckLepSuccess = {
  ok: true,
  projectId: "protected-item74h-reviewed-byron-shed",
  lga: "Byron Shire",
  lepName: "Byron Local Environmental Plan 2014",
  zone: "R2",
  objectives: [
    "To provide for the housing needs of the community within a low density residential environment.",
    "To enable other land uses that provide facilities or services to meet the day to day needs of residents.",
  ],
  controls: {
    heightOfBuilding: null,
    fsr: null,
    minLotSize: null,
    zoneObjectives: [
      "The approved 24 sqm storage shed remains ancillary to the reviewed residential case.",
    ],
    setback: null,
    parking: null,
    activeFrontageBuiltForm: null,
  },
  permissibility: null,
  dataSource: "db_clauses",
  landUse: {
    withoutConsent: [
      "Environmental protection works",
      "Home-based child care",
      "Home occupations",
    ],
    withConsent: ["Dwelling houses"],
    prohibited: ["Farm buildings"],
  },
  part4: [],
  part5: [],
  part6: [],
  part4Reason:
    "Current mapped controls are shown in the evidence-aware pathway above.",
  part5Reason:
    "No additional Part 5 clause is asserted by this protected acceptance.",
  part6Reason:
    "No additional Part 6 clause is asserted by this protected acceptance.",
};

export default function Item74hCommercialAcceptancePage() {
  if (
    !item74hVisualAcceptanceAllowed(process.env) ||
    process.env.VERCEL_GIT_COMMIT_REF !== ITEM74H_VISUAL_ACCEPTANCE_BRANCH
  ) {
    notFound();
  }

  const pathwayResult = buildPathwayResult();
  if (pathwayResult.status !== "available") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7,_#f8fafc_48%,_#dbeafe)] p-6">
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/70 bg-white/75 p-6 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Protected Preview acceptance
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Item 74H reviewed Byron shed proof
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Public Council case DA 10.2026.223.1 at 33 Lorikeet Lane:
          R2 parcel, 24 sqm approved storage shed, 3.83 m approved-plan height
          and 1.625 m depicted southern boundary dimension. No customer-private
          document, database write, checkout activation or submission-ready
          claim is present.
        </p>
      </div>
      <Item74hCommercialPreviewHarness
        lepResult={lepResult}
        pathwayResult={pathwayResult}
      />
    </main>
  );
}
