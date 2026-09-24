# SEE presentation benchmark and renderer contract

Status: **REFERENCE-INFORMED DETERMINISTIC PRESENTATION SLICE / LIVE VISUAL ACCEPTANCE STILL REQUIRED**

Updated: 24 September 2026 (Australia/Sydney). Tracking: Issue #431.

## Benchmark basis

The user-approved `SEE Various Examples.pdf` reference library was reviewed before this slice.

The implementation does not copy any consultant's branding or proprietary page design. It extracts recurring professional document conventions:

- ELKN: dedicated cover/front matter, document details and a structured contents page before substantive assessment.
- Ardill Payne & Partners: disciplined report hierarchy, explicit statutory framework, site/proposal separation and detailed planning-instrument/DCP structure.
- Planners North: strong executive-summary presentation, clear project identity and professional report front matter.
- Concise residential examples: proportionate length and structure rather than forcing every minor proposal into a long report.

These presentation conventions sit underneath the already-approved Plannera SEE architecture:
Executive Summary → Proposal → Site/Context → Statutory Assessment → Environmental Effects → section 4.15 → Conclusion, with optional relevant sections only.

## Repository gap found

Before Issue #431:

- DOCX rendered a deterministic static list under `Contents`, but no actual Word TOC field existed.
- The renderer runbook incorrectly described the DOCX TOC as updateable.
- The first substantive DOCX section could continue directly after the contents list instead of starting cleanly on a new page.
- PDF moved directly from cover to substantive content and contained no contents page.

These are presentation defects only. They do not change the planning/evidence acceptance model.

## Issue #431 contract

### DOCX

The renderer must:

1. preserve the dedicated cover/front matter;
2. put `Contents` on its own front-matter page;
3. include a real Word TOC field over Heading 1 entries;
4. mark that field dirty and set Word `updateFields=true` so page numbers can refresh when opened;
5. retain deterministic fallback contents entries inside the field result;
6. start Executive Summary / the first substantive section on a new page;
7. preserve source register, limitations and page-number footer.

### PDF

The renderer must:

1. preserve the cover as page 1;
2. insert a deterministic Contents page as page 2;
3. list working-status front matter where applicable;
4. list every rendered section plus Source Register and Limitations where present;
5. derive displayed page references from the actual layout pass rather than hard-coding them;
6. begin the final/working substantive document after the contents page;
7. preserve deterministic footer page numbering and cross-reference integrity.

## What this does not prove

This slice does not complete the final visual acceptance required before launch.

It does not yet prove:

- real customer text has ideal page breaks;
- consultant-report tables/maps/figures are professionally laid out;
- Microsoft Word refreshes the TOC identically across all supported versions;
- Adobe/Preview print output is visually accepted;
- Plannera branding is final;
- a real Byron/Kempsey customer SEE is lodgement-ready.

Those require protected rendered-document generation and human visual inspection against the approved benchmark library.

## Safety boundary

No planning evidence, section acceptance, citations, commercial readiness, product price, checkout, database, environment or Production behavior changes.

The presentation layer must never make an unready working SEE appear submission-ready.
