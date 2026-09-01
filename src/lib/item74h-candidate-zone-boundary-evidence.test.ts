import { describe, expect, it } from "vitest";

import {
  ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE,
  item74hCandidateZoneDecision,
  type Item74hCandidateZoneBoundaryEvidence,
  verifyItem74hCandidateZoneBoundaryEvidence,
} from "./item74h-candidate-zone-boundary-evidence";

describe("Item 74H candidate zone boundary evidence", () => {
  it("distinguishes parcel interior membership from a touching C2 boundary", () => {
    const evidence = ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE;

    expect(evidence.boundaryRelationship).toMatchObject({
      parcelInteriorZone: "R2",
      boundaryAdjacentZone: "C2",
      relationship: "C2_BOUNDARY_TOUCH_NO_INTERIOR_OVERLAP",
    });
    expect(evidence.interiorSampling).toMatchObject({
      classifiedInteriorSamples: 612585,
      r2OnlySamples: 612585,
      c2OnlySamples: 0,
      overlappingC2R2Samples: 0,
      numericalEdgeSamples: 1,
    });
    expect(verifyItem74hCandidateZoneBoundaryEvidence(evidence)).toBe(true);
    expect(item74hCandidateZoneDecision(evidence)).toMatchObject({
      decision: "PROCEED",
      zone: "R2",
    });
  });

  it("binds current official source identity and public response digests", () => {
    const evidence = ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE;

    expect(evidence.site).toMatchObject({
      cadid: 180752773,
      planoid: 3829161,
    });
    expect(evidence.zoning).toMatchObject({
      epiName: "Byron Local Environmental Plan 2014",
      pcoRefKey: "2014-297",
      currencyDate: "2026-08-21",
    });
    expect(evidence.cadastre.responseSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.zoning.responseSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("requires the approved proposal inset to exceed spatial resolution", () => {
    const evidence = ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE;
    const maximumCellSize = Math.max(
      evidence.interiorSampling.resolvedCellWidthMetres,
      evidence.interiorSampling.resolvedCellHeightMetres,
    );

    expect(evidence.approvedProposal.approvedPlanBoundaryInsetMetres).toBeGreaterThan(
      maximumCellSize * 10,
    );
    expect(evidence.approvedProposal).toMatchObject({
      approvedPlanAreaSquareMetres: 24,
      zone: "R2",
      zoneConfirmed: true,
    });
  });

  it("fails closed if C2 is represented as interior overlap", () => {
    const evidence = ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE;
    const tampered = {
      ...evidence,
      interiorSampling: {
        ...evidence.interiorSampling,
        c2OnlySamples: 1,
      },
    } as unknown as Item74hCandidateZoneBoundaryEvidence;

    expect(verifyItem74hCandidateZoneBoundaryEvidence(tampered)).toBe(false);
    expect(item74hCandidateZoneDecision(tampered)).toEqual({
      decision: "MORE_EVIDENCE",
      zone: null,
      reason: "Authoritative zone-boundary evidence is incomplete or inconsistent.",
    });
  });
});
