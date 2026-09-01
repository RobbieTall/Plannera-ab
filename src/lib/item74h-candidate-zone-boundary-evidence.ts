export const ITEM74H_CANDIDATE_ZONE_BOUNDARY_VERSION =
  "item74h-candidate-zone-boundary.v1" as const;

export const ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE = {
  version: ITEM74H_CANDIDATE_ZONE_BOUNDARY_VERSION,
  observedAt: "2026-09-01",
  site: {
    address: "33 Lorikeet Lane, Mullumbimby NSW 2482",
    lot: 138,
    depositedPlan: "DP1265934",
    cadid: 180752773,
    planoid: 3829161,
  },
  cadastre: {
    authority: "NSW SIX Maps cadastral service",
    layer:
      "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer/9",
    query: "cadid=180752773; returnGeometry=true; outSR=4326; f=geojson",
    responseSha256:
      "410166d9bb917742b427275b7809c3a010ada6fe250b0aee2241187fce80f377",
    parcelVertexCount: 65,
  },
  zoning: {
    authority: "NSW ePlanning EPI Primary Planning Layers",
    layer:
      "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
    pcoRefKey: "2014-297",
    epiName: "Byron Local Environmental Plan 2014",
    currencyDate: "2026-08-21",
    responseSha256:
      "a8107f8276eb5e8f7b4349f5d9985a69b7aa0649be33134ea8f5f3fe51228a3d",
  },
  councilAddressPoint: {
    longitude: 153.477184,
    latitude: -28.555687,
    insideParcel: true,
    zone: "R2",
    distanceToNearestParcelBoundaryMetres: 12.606,
    distanceToNearestC2BoundaryMetres: 12.607,
  },
  interiorSampling: {
    method:
      "Cell-centre point-in-polygon classification over the cadastral envelope",
    grid: "1000x1000",
    classifiedInteriorSamples: 612585,
    r2OnlySamples: 612585,
    c2OnlySamples: 0,
    overlappingC2R2Samples: 0,
    numericalEdgeSamples: 1,
    resolvedCellWidthMetres: 0.043,
    resolvedCellHeightMetres: 0.089,
  },
  boundaryRelationship: {
    parcelInteriorZone: "R2",
    boundaryAdjacentZone: "C2",
    relationship: "C2_BOUNDARY_TOUCH_NO_INTERIOR_OVERLAP",
    policy:
      "A boundary touch is not parcel zone membership; positive interior-area overlap is required.",
  },
  approvedProposal: {
    description: "Storage shed",
    approvedPlanAreaSquareMetres: 24,
    approvedPlanBoundaryInsetMetres: 1.625,
    zone: "R2",
    zoneConfirmed: true,
    reasoning:
      "The approved plan depicts the shed inside the parcel by 1.625 m. Authoritative geometry classifies the parcel interior as R2 and C2 only at the adjoining boundary.",
  },
} as const;

export type Item74hCandidateZoneBoundaryEvidence =
  typeof ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE;

function approximatelyEqual(
  left: number,
  right: number,
  tolerance: number,
): boolean {
  return Math.abs(left - right) <= tolerance;
}

export function verifyItem74hCandidateZoneBoundaryEvidence(
  evidence: Item74hCandidateZoneBoundaryEvidence,
): boolean {
  const sampleCount =
    evidence.interiorSampling.classifiedInteriorSamples +
    evidence.interiorSampling.numericalEdgeSamples;
  const resolvedCellMaximum = Math.max(
    evidence.interiorSampling.resolvedCellWidthMetres,
    evidence.interiorSampling.resolvedCellHeightMetres,
  );

  return (
    evidence.version === ITEM74H_CANDIDATE_ZONE_BOUNDARY_VERSION &&
    evidence.site.cadid === 180752773 &&
    evidence.site.planoid === 3829161 &&
    evidence.cadastre.responseSha256 ===
      "410166d9bb917742b427275b7809c3a010ada6fe250b0aee2241187fce80f377" &&
    evidence.zoning.responseSha256 ===
      "a8107f8276eb5e8f7b4349f5d9985a69b7aa0649be33134ea8f5f3fe51228a3d" &&
    evidence.zoning.pcoRefKey === "2014-297" &&
    evidence.zoning.currencyDate === "2026-08-21" &&
    evidence.councilAddressPoint.insideParcel === true &&
    evidence.councilAddressPoint.zone === "R2" &&
    approximatelyEqual(
      evidence.councilAddressPoint.distanceToNearestParcelBoundaryMetres,
      evidence.councilAddressPoint.distanceToNearestC2BoundaryMetres,
      0.01,
    ) &&
    sampleCount === 612586 &&
    evidence.interiorSampling.classifiedInteriorSamples ===
      evidence.interiorSampling.r2OnlySamples &&
    evidence.interiorSampling.c2OnlySamples === 0 &&
    evidence.interiorSampling.overlappingC2R2Samples === 0 &&
    evidence.interiorSampling.numericalEdgeSamples <= 1 &&
    evidence.boundaryRelationship.parcelInteriorZone === "R2" &&
    evidence.boundaryRelationship.boundaryAdjacentZone === "C2" &&
    evidence.boundaryRelationship.relationship ===
      "C2_BOUNDARY_TOUCH_NO_INTERIOR_OVERLAP" &&
    evidence.approvedProposal.approvedPlanBoundaryInsetMetres >
      resolvedCellMaximum * 10 &&
    evidence.approvedProposal.zone === "R2" &&
    evidence.approvedProposal.zoneConfirmed === true
  );
}

export function item74hCandidateZoneDecision(
  evidence: Item74hCandidateZoneBoundaryEvidence,
): {
  decision: "PROCEED" | "MORE_EVIDENCE";
  zone: "R2" | null;
  reason: string;
} {
  if (!verifyItem74hCandidateZoneBoundaryEvidence(evidence)) {
    return {
      decision: "MORE_EVIDENCE",
      zone: null,
      reason: "Authoritative zone-boundary evidence is incomplete or inconsistent.",
    };
  }
  return {
    decision: "PROCEED",
    zone: "R2",
    reason:
      "The parcel interior is R2; C2 touches only the cadastral boundary, and the approved shed is depicted 1.625 m inside the parcel.",
  };
}
