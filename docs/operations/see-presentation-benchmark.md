# SEE presentation benchmark and renderer contract

Status: **MERGED CURRENT CONTRACT ON PR #452 / SYNTHETIC VISUAL ACCEPTANCE PASSED / HOSTED CUSTOMER VISUAL ACCEPTANCE STILL REQUIRED**

Updated: 2 October 2026 (Australia/Sydney). Historical source: Issue #431 / PR #435, reconciled with the later professional-structure work in PRs #433/#434 and the current #452 renderer lineage.

## Benchmark basis

The user-approved `SEE Various Examples.pdf` reference library is the visual benchmark.

The implementation must not copy any consultant's branding or proprietary page design. It should preserve the recurring professional conventions:

- **ELKN:** strong cover; document details/control immediately after the cover; structured contents before substantive assessment; clear attachments/evidence treatment.
- **Ardill Payne & Partners:** disciplined report hierarchy; explicit statutory framework; clear site/proposal separation; detailed planning-instrument/DCP structure.
- **Planners North:** strong project identity; professional compliance/front matter; executive-summary treatment; consistent page furniture.
- **Concise residential examples:** proportionate length and structure rather than forcing every proposal into a long report.

These conventions sit underneath the approved flexible Plannera SEE architecture:
Executive Summary → Proposal → Site/Context → Existing Approvals/Referrals where relevant → Statutory Assessment → Environmental Effects → section 4.15 → Conclusion → relevant evidence/appendices only.

## Current merged front-matter contract

The earlier #435 slice required Contents as PDF page 2 because Document Control had not yet been integrated into that branch. PRs #433/#434 subsequently introduced a professional Document Control layer. That later structure supersedes the rigid “Contents must be page 2” rule.

The current front-matter sequence is:

1. Cover.
2. Document Control / revision information / concise proposal and status treatment.
3. Contents.
4. Outstanding Evidence front matter only when required.
5. Substantive SEE sections.
6. Supporting Evidence Schedule / Source Register / Limitations where applicable.

The exact page number of Contents may vary with legitimate front-matter length, but the layout must not create orphan or near-empty pages simply because a status callout no longer fits.

## DOCX requirements

The renderer must:

1. preserve a dedicated professional cover;
2. keep Document Control/revision information together and readable;
3. place Contents on its own front-matter page after Document Control;
4. include a real Word TOC field over the intended report headings;
5. mark the field dirty and set Word `updateFields=true` so page references can refresh when opened;
6. retain deterministic fallback contents entries inside the field result;
7. begin the first substantive section cleanly after front matter;
8. preserve evidence/source/limitations sections when applicable;
9. preserve consistent header/footer/page numbering;
10. keep working-output warnings prominent without making the document look final.

## PDF requirements

The renderer must:

1. preserve the cover as page 1;
2. present Document Control efficiently before Contents;
3. place Contents on a dedicated front-matter page;
4. derive displayed Contents page references from the actual deterministic layout pass rather than hard-coding them;
5. list every rendered substantive section plus applicable evidence/source/limitations sections;
6. avoid orphan front-matter pages, especially a standalone status-only page;
7. maintain readable spacing, hierarchy, tables/callouts and consistent footer page numbering;
8. preserve valid deterministic PDF structure/cross-references;
9. keep working/final status visually unambiguous.

## Current 2 October synthetic finding

Exact-head #452 synthetic QA found:
- DOCX: 8 pages, coherent front matter and substantive flow;
- PDF: 10 pages;
- the PDF can create a near-empty standalone page containing only the **Document Status** callout between Document Control and Contents;
- this is avoidable DOCX/PDF presentation drift and should be corrected on the current #452 lineage.

This is a presentation defect, not evidence that the statutory/evidence compiler is wrong.

## Visual acceptance still required

No synthetic or string-level test closes presentation acceptance by itself.

Before launch, representative actual Byron and Kempsey customer documents must be generated through the protected Preview journey and inspected natively. Review:
- cover hierarchy;
- Document Control and status treatment;
- Contents accuracy;
- section hierarchy and page breaks;
- tables/callouts;
- supporting evidence/source register/limitations;
- working/final warnings;
- headers/footers/page numbers;
- Word TOC refresh behaviour;
- PDF print/preview appearance;
- absence of clipping, overlaps, orphan headings or low-content accidental pages.

## Safety boundary

Presentation work must not:
- invent or change planning conclusions;
- weaken evidence/readiness gates;
- make a working SEE appear submission-ready;
- alter billing, checkout, Production configuration or statutory source truth merely to improve appearance.


## Synthetic visual acceptance — 2 October 2026

Exact tested head: `ea9f3339b4acdefcb35cf11ee41ddc0f9f7c5e38`.

Artifact: Submission SEE Synthetic Artefacts run `36994760847`, artifact `11221425681`.

Visual QA result:
- PDF reduced from 10 to 9 pages after front-matter correction;
- page 2 contains Document Control, Revision History, Proposal Summary and Document Status together;
- Contents begins on page 3 with correct rendered page references;
- all 9 PDF pages inspected cleanly;
- all 8 DOCX pages inspected cleanly;
- no observed clipping, overlaps, broken glyphs/tables or orphan headings.

This proves the representative synthetic presentation contract only. Real hosted Byron/Kempsey customer documents, real specialist-report layouts, maps/figures and native Word/PDF customer reopening remain part of the protected commercial acceptance.
