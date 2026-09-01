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

The public cadastral and zoning response hashes are stored with their layer identity so the spatial conclusion is replayable. Private document hashes remain unexposed.

## Corrected boundary-touch interpretation

The earlier spatial preflight treated any intersecting zone polygon as parcel membership. That is unsafe when polygons share a cadastral boundary.

The corrected rule requires positive parcel-interior area overlap. For this parcel:

- R2 covers the classified parcel interior.
- C2 is boundary-adjacent only.
- Gate 03 is PROCEED for the approved inside-parcel shed.
- A future geometry response that shows positive C2 interior overlap must re-open the gate and route to MERIT or MORE_EVIDENCE as appropriate.

## Evidence not yet confirmed

- The retained detail survey expressly says it is not a Survey under the Surveying Act 2002. The 1.625 m approved-plan dimension is not represented as a certified legal boundary setback.
- The determination conditions have passed protected machine acceptance but have not been operator-reviewed and bound into the pathway.
- Current LEP and DCP controls must be revalidated again at final generation time.

## Deterministic gate result

The free Pathway Check returns useful confirmed results and MORE_EVIDENCE_REQUIRED overall for the remaining submission-grade gaps.

- Gate 00 site identity: PROCEED.
- Gate 01 ancillary storage-shed description: PROCEED for this reviewed case, with STOP and MORE_EVIDENCE branches if the use changes.
- Gate 02 DA pathway: PROCEED because the official case was determined approved.
- Gate 03 exact proposal zone: PROCEED as R2. Boundary-touch-only C2 is excluded from parcel membership; positive future C2 overlap routes to MERIT or MORE_EVIDENCE.
- Gate 04 numeric envelope: MORE_EVIDENCE because approved-plan height is now confirmed but legal set-out and final current-control compliance remain outstanding. Any variation requiring justification routes to MERIT.
- Gate 05 commercial progress: PROCEED for working products only; a final or submission-ready claim must STOP.

MORE_EVIDENCE_REQUIRED is not a refusal to help the customer progress.

## Commercial behaviour

The existing progressive commercial binding is reused.

- A$49 Planning Controls Pack: available as a working exact-scope pack. It includes confirmed instrument, R2 proposal zone, parcel, approval-pathway, area, approved-plan height/elevations, depicted boundary dimension and provenance evidence. It visibly excludes legal setback certification, unreviewed determination conditions and final current-control revalidation.
- A$749 Submission SEE: available as a working SEE and consultant-pack scaffold. Every unresolved claim stays qualified. It is not submission ready.
- Evidence added later strengthens and regenerates the same purchased project.
- A valid same-scope A$49 purchase remains creditable against the A$749 SEE.
- Both checkout surfaces remain disabled in Production.

## Next protected acceptance

The next protected acceptance should operator-review the determination conditions, bind each material condition to the pathway and commercial outputs, and replay final current-control validation. Any future retained page must still pass the deny-network scan and zero-residue controls.

Final submission readiness remains false until every material gap is closed and replayed through the same evidence digest and scope binding.
