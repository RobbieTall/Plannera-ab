# Professional SEE renderer visual acceptance

Status: **CODE/TEST HEAD GREEN + VISUAL ACCEPTANCE PASSED / PR #434 OPEN UNMERGED**

Updated: 24 September 2026 (Australia/Sydney). Tracking: Issue #432.


## Accepted evidence — 24 September 2026

Reviewed renderer head: `c9a9624ef085287765a17ee0443a2319d8552282`.
Current code/test head: `5d10df08507597859a10d1c91a23d4754bfe75e9` (test-hardening only; renderer bytes unchanged).

All current code/test-head gates passed:
- Soft launch smoke — run `35971164696`;
- Whole-LGA source matrix — run `35971164676`;
- Commercial Funnel Golden Gate — run `35971164589`;
- Submission SEE Output Rendering — run `35971164669`;
- Item 74H Working SEE Preview Gate — run `35971164659`;
- Item 77 protected commercial journey — run `35971164557`;
- Submission SEE Synthetic Artefacts — run `35971164538`.

Current-head artifact ID: `10795398958`.

Deterministic output hashes:
- DOCX: `71a50968f0b095227904606e87100692490e8e07fae1a01f87032d1bc9f690de`;
- PDF: `2e0123c8349039b51ac3acf28577c73aac388f1c5ebb29f6d45aaf4f1062221b`.

The current-head artifact reproduces the exact accepted DOCX/PDF hashes:
- DOCX `71a50968f0b095227904606e87100692490e8e07fae1a01f87032d1bc9f690de`;
- PDF `2e0123c8349039b51ac3acf28577c73aac388f1c5ebb29f6d45aaf4f1062221b`.

These bytes are identical to the already rendered and inspected 14-page A4 outputs. No clipping, overlap, broken table layout, missing glyphs or inconsistent page furniture was found. Separate read-only review `#5301256836` found no blocking renderer issue.

The key visual defect found during this task was collapsed DOCX pagination. Root cause was a missing OOXML document relationship to `word/styles.xml`. The renderer now emits that relationship and unit coverage requires it. No finality or evidence gate was weakened to solve the layout defect.

This proves the deterministic synthetic presentation system. It does not replace real-project evidence acceptance, real-project rendered review, Item 78C whole-funnel acceptance or Production activation.


## Approved benchmark library

Visual and document-structure review uses the project library `SEE Various Examples.pdf`.

The target is a Plannera document system informed by the benchmark qualities, not a copy of any consultant's branding or layout.

### ELKN benchmark qualities

- strong cover hierarchy with clear document/site/reference information;
- dedicated document-details and revision/control page;
- contents and attachment schedules before the main report;
- restrained, consistent accent colour and page furniture;
- compliance material presented in compact tables rather than undifferentiated prose.

### Ardill Payne benchmark qualities

- formal document-control sheet;
- disciplined numbered report hierarchy;
- clear relationship between statutory framework, environmental effects and planning policy;
- dense source material remains navigable through headings, tables and consistent headers/footers.

### Planners North benchmark qualities

- polished cover with strong project identity;
- executive summary receives deliberate page treatment rather than looking like another body paragraph;
- highly legible contents and numbered sections;
- images/figures are integrated when authoritative project visuals exist;
- professional page furniture and consistent report identity throughout.

## Plannera v1 visual contract

The renderer must provide, without changing planning logic:

1. **Cover**
   - Plannera brand;
   - final/working status;
   - Statement of Environmental Effects title;
   - confirmed site;
   - LGA and zone;
   - proposal summary;
   - preparation date.

2. **Document control**
   - document type;
   - confirmed site;
   - planning area;
   - generated date;
   - status;
   - operator-review state;
   - working DPP lineage where required by the existing evidence contract.

3. **Contents**
   - deterministic numbered canonical sections;
   - evidence/source schedules and limitations listed where present.

4. **Main assessment**
   - each canonical section starts with a strong numbered heading;
   - narrative remains unchanged from the accepted candidate;
   - evidence used is visually separated from the assessment prose;
   - optional sections remain dynamic and are never filled with boilerplate merely for presentation.

5. **Evidence**
   - reviewed upload/specialist evidence schedule;
   - source register with source type, title, provenance and checked date;
   - no raw uploaded content or credentials.

6. **Working output**
   - `WORKING SEE - NOT SUBMISSION READY` remains obvious on cover and page furniture;
   - outstanding evidence is presented as a dedicated schedule;
   - final acceptance is not weakened.

7. **Page furniture**
   - restrained Plannera header/footer;
   - page numbering;
   - consistent margins, typography and spacing;
   - no clipped or overlapping content.

## Visual review procedure

For the exact PR head:

1. Require renderer unit/contract CI to pass.
2. Require the `Submission SEE Synthetic Artefacts` workflow to generate DOCX/PDF files.
3. Download the exact-head artifact.
4. Validate the DOCX ZIP package and PDF structure.
5. Render the DOCX to page images using the project DOCX QA workflow.
6. Render the PDF to page images.
7. Inspect every generated page for clipping, overlap, broken table layout, bad pagination, unreadable text or inconsistent status/page furniture.
8. Compare the document visually with the approved benchmark qualities above.
9. Record the exact PR head, workflow run, artifact ID and review conclusion in Issue #432 and the canonical daytime handover.

A green string/byte test is necessary but does not complete this visual gate.

## Boundaries

This task does not:

- rewrite or enrich planning conclusions;
- add uncited content;
- fabricate project images;
- add customer-private sample data;
- change A$749 entitlement, credit or checkout;
- change Production;
- change database/schema;
- change finality/readiness rules.
