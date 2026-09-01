import { notFound } from "next/navigation";

import { Item74hCommercialPreviewHarness } from "@/components/projects/item74h-commercial-preview-harness";
import {
  ITEM74H_VISUAL_ACCEPTANCE_BRANCH,
  item74hVisualAcceptanceAllowed,
} from "@/lib/item74h-visual-acceptance";
import {
  toPathwayCustomerResult,
  type PathwayCustomerResultInput,
} from "@/lib/pathway-customer-result";
import {
  attachPersistedPathwayProgressiveCommercialBinding,
  createPathwayProgressiveCommercialBinding,
} from "@/lib/pathway-progressive-commercial-binding";
import type { QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";

export const dynamic = "force-dynamic";

const asOf = new Date("2026-09-01T06:45:00.000Z");
const currentUntil = new Date("2026-10-01T00:00:00.000Z");

function buildPathwayResult() {
  const binding = createPathwayProgressiveCommercialBinding({
    scopeKey: "protected-public-review-byron-shed",
    siteEvidenceDigest: "b".repeat(64),
    pathwayDecision: "MERIT_ASSESSMENT",
    evidenceStatus: "MORE_EVIDENCE_REQUIRED",
    confirmedControlKeys: [
      "byron-lep-ru2-zone",
      "byron-dcp-rural-outbuilding-controls",
      "nsw-authoritative-spatial-projection",
    ],
    outstandingEvidence: [
      "AUTHORITATIVE_ROAD_CLASSIFICATION",
      "LEGAL_ROAD_SETBACK_M",
      "LEGAL_SIDE_SETBACK_M",
      "REGISTERED_CADASTRAL_SURVEY",
    ],
  });

  const input: PathwayCustomerResultInput = {
    decision: "MORE_EVIDENCE_REQUIRED",
    trustLevel: "SITE_CONFIRMED",
    isCurrent: true,
    assessedAt: new Date("2026-09-01T06:30:00.000Z"),
    staleAt: null,
    result: attachPersistedPathwayProgressiveCommercialBinding(
      { summary: "Protected visual acceptance only" },
      binding,
    ),
    pathwayDefinition: {
      versionKey: "byron-ru2-shed-protected-review-v1",
      status: "ACTIVE",
    },
    spatialProvenance: {
      authority: "NSW Department of Planning",
      datasetName: "EPI Primary Planning Layers - Land Zoning",
      sourceUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      sourceVersion: "retrieved-2026-09-01",
      retrievedAt: new Date("2026-09-01T06:00:00.000Z"),
      effectiveAt: new Date("2026-09-01T00:00:00.000Z"),
      trustLevel: "EVIDENCE_VERIFIED",
      staleAt: currentUntil,
    },
    evidenceSnapshots: [
      {
        evidenceKind: "LEP",
        authority: "NSW legislation",
        sourceUrl:
          "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297",
        sourceVersion: "Byron LEP 2014 - retrieved 2026-09-01",
        retrievedAt: new Date("2026-09-01T06:00:00.000Z"),
        effectiveFrom: new Date("2026-09-01T00:00:00.000Z"),
        staleAt: currentUntil,
        isCurrentAtAssessment: true,
      },
      {
        evidenceKind: "DCP",
        authority: "Byron Shire Council",
        sourceUrl:
          "https://www.byron.nsw.gov.au/Development-Business/Planning-Controls/Development-Control-Plans",
        sourceVersion: "Byron DCP 2014 - reviewed 2026-09-01",
        retrievedAt: new Date("2026-09-01T06:00:00.000Z"),
        effectiveFrom: new Date("2026-09-01T00:00:00.000Z"),
        staleAt: currentUntil,
        isCurrentAtAssessment: true,
      },
    ],
    controlSnapshots: [
      {
        label: "Rural outbuilding controls",
        operator: "TEXT",
        numericValue: null,
        lowerBound: null,
        upperBound: null,
        textValue:
          "Merit assessment required; exact site dimensions remain qualified.",
        unit: null,
        sourceReference: "Byron DCP 2014 rural development controls",
        isCurrentAtAssessment: true,
        staleAt: currentUntil,
      },
    ],
    proposalAttestation: {
      trust: "USER_ATTESTED",
      decision: "MORE_EVIDENCE_REQUIRED",
      paidArtefactsEligible: false,
      input: {
        proposalPurpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE",
        landAreaHectares: 3.2,
        proposedBuildingFootprintSquareMetres: 96,
        existingFarmBuildingFootprintSquareMetres: 0,
        proposedBuildingHeightMetres: 4.2,
        roadSetbackMetres: 72,
        sideSetbackMetres: 24,
        otherBoundarySetbackMetres: 35,
        roadCategory: "UNRESOLVED",
      },
    },
    gateSnapshots: [
      {
        sequence: 0,
        question: "Is the address and RU2 zone confirmed?",
        outcome: "PROCEED",
        reason:
          "The protected review has current authoritative address, zoning and spatial provenance.",
      },
      {
        sequence: 1,
        question: "Is the shed ancillary to the documented rural use?",
        outcome: "PROCEED",
        reason:
          "The stated non-habitable machinery and goods storage purpose is consistent with the working rural scope.",
      },
      {
        sequence: 2,
        question: "Can the approval pathway be confirmed automatically?",
        outcome: "MERIT_ASSESSMENT",
        reason:
          "The proposal requires a documented merit pathway rather than an automatic proceed result.",
      },
      {
        sequence: 3,
        question: "Are the legal setbacks and road class evidence verified?",
        outcome: "MORE_EVIDENCE_REQUIRED",
        reason:
          "A registered survey and authoritative road classification must confirm the exact submission claims.",
      },
    ],
  };

  return toPathwayCustomerResult(input, asOf);
}

const lepResult: QuickSiteCheckLepSuccess = {
  ok: true,
  projectId: "protected-item74h-visual-acceptance",
  lga: "Byron Shire",
  lepName: "Byron Local Environmental Plan 2014",
  zone: "RU2",
  objectives: [
    "Protected visual acceptance uses the current, cited LEP pathway evidence.",
  ],
  controls: {
    heightOfBuilding: null,
    fsr: null,
    minLotSize: null,
    zoneObjectives: [
      "Retain the evidence-backed rural pathway while unresolved site facts remain qualified.",
    ],
    setback: null,
    parking: null,
    activeFrontageBuiltForm: null,
  },
  permissibility: null,
  dataSource: "db_clauses",
  landUse: {
    withoutConsent: [],
    withConsent: [],
    prohibited: [],
  },
  part4: [],
  part5: [],
  part6: [],
  part4Reason: "Proposal-specific numeric claims remain evidence qualified.",
  part5Reason: "No additional clause is asserted by this visual fixture.",
  part6Reason: "No additional clause is asserted by this visual fixture.",
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
          Item 74H customer presentation proof
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Synthetic/public-review facts only. No address, customer document,
          database write, checkout activation or submission-ready claim is present.
        </p>
      </div>
      <Item74hCommercialPreviewHarness
        lepResult={lepResult}
        pathwayResult={pathwayResult}
      />
    </main>
  );
}
