export const PATHWAY_COMMERCIAL_PRESENTATION_VERSION =
  "item74h-commercial-presentation.v1" as const;

export type PathwayCommercialReadiness = "BLOCKED" | "WORKING" | "FINAL";

export type PathwayCommercialPresentationInput = {
  planningControlsPackReadiness: PathwayCommercialReadiness;
  submissionSeeReadiness: PathwayCommercialReadiness;
  submissionReady: boolean;
  productionCheckoutEnabled: boolean;
};

export type PathwayProductPresentation = {
  productCode: "PLANNING_CONTROLS_PACK" | "SUBMISSION_SEE";
  name: string;
  priceLabel: "A$49" | "A$749";
  statusLabel: string;
  description: string;
  qualification: string;
  canProgress: boolean;
  checkoutEnabled: boolean;
};

function presentProduct(
  productCode: PathwayProductPresentation["productCode"],
  readiness: PathwayCommercialReadiness,
  productionCheckoutEnabled: boolean,
): PathwayProductPresentation {
  const planningPack = productCode === "PLANNING_CONTROLS_PACK";
  const canProgress = readiness !== "BLOCKED";

  if (readiness === "BLOCKED") {
    return {
      productCode,
      name: planningPack ? "Planning Controls Pack" : "Submission SEE",
      priceLabel: planningPack ? "A$49" : "A$749",
      statusLabel: "Resolve a pathway blocker first",
      description:
        "A hard pathway or evidence boundary prevents this product from being useful yet. Resolve the listed blocker before progressing.",
      qualification: "No paid or final output should be created from this state.",
      canProgress,
      checkoutEnabled: false,
    };
  }

  if (readiness === "WORKING") {
    return {
      productCode,
      name: planningPack ? "Planning Controls Pack" : "Submission SEE",
      priceLabel: planningPack ? "A$49" : "A$749",
      statusLabel: planningPack
        ? "Working pack available"
        : "Working SEE available",
      description: planningPack
        ? "Start with the confirmed LEP and DCP controls now. Survey, setback and report gaps stay visibly qualified, and later evidence strengthens the same purchased project."
        : "Build the evidence-backed working SEE and consultant briefs now. Unconfirmed items stay visibly qualified, and later evidence regenerates the same purchased project.",
      qualification: planningPack
        ? "The A$49 payment is credited once against the same-scope A$749 SEE."
        : "Working output - not submission ready. A valid same-scope A$49 credit reduces the A$749 balance to A$700.",
      canProgress,
      checkoutEnabled: productionCheckoutEnabled,
    };
  }

  return {
    productCode,
    name: planningPack ? "Planning Controls Pack" : "Submission SEE",
    priceLabel: planningPack ? "A$49" : "A$749",
    statusLabel: planningPack
      ? "Final controls scope available"
      : "Submission-ready scope eligible",
    description: planningPack
      ? "Current evidence supports the exact-scope controls pack. A later site, proposal or evidence change must revalidate it."
      : "Current material evidence supports final SEE assembly, subject to final operator quality assurance.",
    qualification: planningPack
      ? "The A$49 payment is credited once against the same-scope A$749 SEE."
      : "A valid same-scope A$49 credit reduces the A$749 balance to A$700.",
    canProgress,
    checkoutEnabled: productionCheckoutEnabled,
  };
}

export function buildPathwayCommercialPresentation(
  input: PathwayCommercialPresentationInput,
) {
  if (input.submissionReady && input.submissionSeeReadiness !== "FINAL") {
    throw new Error("Submission-ready presentation requires FINAL SEE readiness");
  }

  return {
    version: PATHWAY_COMMERCIAL_PRESENTATION_VERSION,
    planningControlsPack: presentProduct(
      "PLANNING_CONTROLS_PACK",
      input.planningControlsPackReadiness,
      input.productionCheckoutEnabled,
    ),
    submissionSee: presentProduct(
      "SUBMISSION_SEE",
      input.submissionSeeReadiness,
      input.productionCheckoutEnabled,
    ),
    submissionReady: input.submissionReady,
    productionCheckoutEnabled: input.productionCheckoutEnabled,
  };
}
