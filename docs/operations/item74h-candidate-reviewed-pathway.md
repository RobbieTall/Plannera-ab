# Item 74H candidate reviewed pathway

## Purpose

This record binds one real Byron storage-shed case to the existing Item 74H decision and commercial contracts without claiming more than the reviewed evidence proves.

The case is Council DA 10.2026.223.1 for Lot 138 DP1265934 at 33 Lorikeet Lane, Mullumbimby. Byron Shire Council determined the application approved on 14 July 2026.

This is a protected Preview acceptance slice. Production checkout remains disabled. No Production data or schema change is part of this work.

## Evidence confirmed on 1 September 2026

- Council tracker, stamped plan, site plan and NSW cadastral identifiers agree on the address and parcel.
- The approved plan shows a proposed 24 sqm storage shed beside the existing dwelling.
- The approved plan depicts a 1.625 m dimension between the shed and the southern boundary adjoining Lot 139.
- Council-stamped sheet DA02 contains all four elevations and Section A. It depicts a 3.83 m maximum height, 2.67 m portal-frame height, 4 m plan width, finished floor level RL 13.6 and retaining wall system up to 1 m.
- These are approved-plan dimensions, not an as-built survey or certified legal set-out.
- The Council stamp identifies DA 10.2026.223.1 as approved on 14 July 2026.
- The authoritative parcel area is 2331.671 sqm; the approved plan labels 2333 sqm, a 1.329 sqm drafting or rounding difference that is preserved rather than silently normalised.
- The current NSW planning layer is dated 21 August 2026 and identifies the parcel interior as R2 under Byron LEP 2014, PCO 2014-297.
- C2 touches the cadastral boundary but has no detected parcel-interior area overlap. Boundary touch is not zone membership.
- A 1000 by 1000 cell-centre analysis classified 612,585 interior samples as R2, zero as C2, zero as overlapping C2/R2, and one numerical edge sample as unclassified. Resolved cell dimensions were approximately 0.043 m by 0.089 m.
- The approved shed is depicted 1.625 m inside the boundary, more than ten times the maximum resolved cell dimension. The proposal zone is therefore confirmed as R2 for this reviewed plan.
- The protected acceptance scanned four exact Council PDFs, retained only three private review pages, exposed no private source hashes or scanner output, and left zero transient residue.
- The same public Council E2026/47502 two-page stamped-plan record was reopened transiently from the tracker on 1 September 2026. Page 2 was rendered for operator review and neither the source PDF nor rendered page is committed or retained.
- The public E2026/80895 determination was operator-reviewed across all nine pages. It contains 24 numbered consent conditions, operates from 17 July 2026 and lapses on 17 July 2031.
- Conditions 1-5 bind the approved plans, adjoining-building protection, limited vegetation removal, compensatory planting and BAL-29 bushfire construction.
- Conditions 6-9 are pre-Construction Certificate requirements for waste management, vegetation clearing, geotechnical certification and erosion/sediment controls.
- Conditions 10-18 govern construction hours, noise, signage, waste, water pollution, sediment, unexpected heritage finds, external finishes and lawful waste disposal.
- Conditions 19-22 are pre-Occupation Certificate requirements for completed works, compensatory planting, stormwater and bushfire compliance.
- Conditions 23-24 apply at all times to waste management and neighbourhood amenity.

The public cadastral and zoning response hashes are stored with their layer identity so the spatial conclusion is replayable. Private document hashes remain unexposed.

## Corrected boundary-touch interpretation

The earlier spatial preflight treated any intersecting zone polygon as parcel membership. That is unsafe when polygons share a cadastral boundary.

The corrected rule requires positive parcel-interior area overlap. For this parcel:

- R2 covers the classified parcel interior.
- C2 is boundary-adjacent only.
- Gate 03 is PROCEED for the approved inside-parcel shed.
- A future geometry response that shows positive C2 interior overlap must re-open the gate and route to MERIT or MORE_EVIDENCE as appropriate.

## Current-control revalidation status

The submitted SEE was operator-reviewed as secondary evidence only. Its claims were replayed against current authoritative sources instead of being copied into Plannera.

Confirmed from the NSW EPI Primary Planning Layers, current 21 August 2026:

- Byron LEP 2014 clause 4.3 maximum building height is 9 m.
- Byron LEP 2014 clause 4.4 maximum floor-space ratio is 0.4:1.
- The submitted SEE's 9 m height claim is confirmed.
- The submitted SEE's 0.5:1 floor-space-ratio claim is rejected and must not propagate into any product.

Confirmed from the current Council-hosted DCP 2014 Chapter D1, adopted 27 January 2026 and effective 23 February 2026:

- D1.2.1 applies the building height plane to domestic outbuildings and combines it with DCP setbacks and the LEP height limit.
- D1.2.2 requires 4.5 m from a local-road primary front boundary.
- D1.2.2 requires a minimum 900 mm side/rear setback.
- The approved plan depicts 1.625 m to the southern boundary, which is greater than the 900 mm base minimum, but that depicted dimension is not represented as a certified legal set-out.
- The submitted SEE's DCP clause labels are incomplete or misaligned and are not accepted as final citations.
- Its 1 m excavation/fill claim remains secondary until the applicable current Part B control is bound.

The authoritative source URL, control value, clause, amendment and currency/effective date are stored with the evidence. Final generation must replay currency rather than silently treating this snapshot as timeless.

## Evidence not yet confirmed

- The retained detail survey expressly says it is not a Survey under the Surveying Act 2002. The 1.625 m approved-plan dimension is not represented as a certified legal boundary setback.
- The bound control snapshot must pass a final currency replay at generation time; a changed instrument re-opens the relevant gate.

## Deterministic gate result

The free Pathway Check returns useful confirmed results and MORE_EVIDENCE_REQUIRED overall for the remaining submission-grade gaps.

- Gate 00 site identity: PROCEED.
- Gate 01 ancillary storage-shed description: PROCEED for this reviewed case, with STOP and MORE_EVIDENCE branches if the use changes.
- Gate 02 DA pathway: PROCEED because the official case was determined approved and all 24 numbered conditions are grouped into delivery phases. Similar sheds may receive different conditions.
- Gate 03 exact proposal zone: PROCEED as R2. Boundary-touch-only C2 is excluded from parcel membership; positive future C2 overlap routes to MERIT or MORE_EVIDENCE.
- Gate 04 numeric envelope: MORE_EVIDENCE because the current 9 m height, 0.4:1 FSR, 900 mm side/rear setback and 4.5 m local-road front setback are confirmed, but the depicted 1.625 m boundary dimension is not a certified legal set-out. Any variation requiring justification routes to MERIT.
- Gate 05 commercial progress: PROCEED for working products only; a final or submission-ready claim must STOP.

MORE_EVIDENCE_REQUIRED is not a refusal to help the customer progress.

## Commercial behaviour

The existing progressive commercial binding is reused.

- A$49 Planning Controls Pack: available as a working exact-scope pack. It includes confirmed instrument, R2 proposal zone, parcel, approval-pathway, area, approved-plan height/elevations, depicted boundary dimension, reviewed condition groups and provenance evidence. It visibly excludes legal setback certification and final current-control revalidation.
- A$749 Submission SEE: available as a working SEE and consultant-pack scaffold. Every unresolved claim stays qualified. The applicant SEE's conflicting site-area value is rejected rather than propagated. It is not submission ready.
- Evidence added later strengthens and regenerates the same purchased project.
- A valid same-scope A$49 purchase remains creditable against the A$749 SEE.
- Both checkout surfaces remain disabled in Production.

## Next protected acceptance

The next protected acceptance should replay current LEP/DCP controls against the confirmed R2 proposal and reviewed consent conditions, then prove how legal set-out uncertainty is presented without blocking purchase or overstating submission readiness. Any future retained page must still pass the deny-network scan and zero-residue controls.

Final submission readiness remains false until every material gap is closed and replayed through the same evidence digest and scope binding.
