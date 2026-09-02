# NSW Lite and Council Full pre-lodgement platform strategy

Status: Future strategic option. This does not change the active Item 74 commercial delivery objective or authorise government integration, procurement commitments, Production access, or automated determinations.

## Strategic thesis

Plannera's reusable asset is the evidence graph beneath the customer documents:

`site + jurisdiction + proposal + evidence -> current instruments and controls -> deterministic gates -> unresolved matters -> provenance-backed outputs`.

That core can support both an applicant product and a government pre-lodgement service. It should be productised, not copied into a separate codebase.

## Two complementary products

### NSW Lite

A lightweight service integrated with or licensed to the NSW Planning Portal could provide a consistent statewide front door:

- confirm site, lot/plan and jurisdiction identity;
- retrieve current statewide and local planning instruments;
- identify the likely application pathway and mandatory baseline inputs;
- detect missing documents, stale sources and obvious contradictions;
- show evidence provenance and matters requiring council or professional review;
- return a structured readiness package into the application workflow.

NSW Lite should assess completeness and evidence readiness, not determine an application, promise acceptance, or replace council merit assessment.

### Council Full

A council-specific service can apply the deeper local layer:

- current LEP, DCP, contribution-plan and local-policy controls;
- local document requirements, referral triggers and risk tolerances;
- proposal-specific numeric and qualitative checks;
- evidence conflicts, likely requests for information and officer review questions;
- a consistent applicant feedback report and internal assessment scaffold;
- audit history showing the exact source version and reasoning used.

Council Full should support officers and applicants. Material planning judgment, exceptions and determinations remain human decisions.

## Why both fit together

The State is best placed to standardise the common data contract, identity resolution, minimum evidence package and Planning Portal handoff. Councils are best placed to own local controls, local workflow and discretionary assessment.

A shared platform avoids asking every council to procure and maintain a separate retrieval and evidence engine. The same project package can move from NSW Lite to Council Full without re-entering information or losing provenance.

## Public value

- fewer incomplete or internally inconsistent applications;
- fewer avoidable requests for information;
- clearer expectations before fees and professional work escalate;
- faster officer triage without hiding uncertainty;
- consistent source dates and audit trails;
- structured data that can improve service planning while protecting customer documents.

## Commercial shapes to investigate

- annual Council Full subscription plus implementation and controlled usage bands;
- statewide enterprise licence for NSW Lite;
- funded pilot with one or two launch councils in shadow mode;
- API or white-label licensing while Plannera retains and maintains the evidence engine;
- optional applicant-paid detailed outputs without allowing payment to alter government readiness findings.

Government pricing and procurement should be investigated only after the commercial Byron/Kempsey evidence and output quality is proven.

## Architecture implications now

Current commercial work should preserve:

- deterministic gates separate from LLM drafting;
- source authority, currency, effective dates and immutable provenance;
- tenant-configurable local rules rather than hard-coded council assumptions;
- API-first structured outputs as well as DOCX/PDF rendering;
- privacy-separated applicant, consultant and council views;
- accessibility, records retention and auditable human override;
- fail-closed stale-source handling;
- no automated approval, refusal or guaranteed-acceptance language.

These are useful for Plannera customers now and avoid an expensive rebuild later.

## Recommended sequence

1. Complete Byron and Kempsey commercial acceptance for the applicant products.
2. Measure whether Plannera reduces missing evidence, contradictions and consultant rework.
3. Run a Council Full shadow pilot on historical or separately approved cases, without influencing live determinations.
4. Prove local configuration and officer usefulness across more than one council.
5. Present the evidence and common data contract to NSW as the basis for NSW Lite.
6. Pursue production government integration only through procurement, security, privacy, records, legal and operational approval.

## Guardrail

This direction must not distract from Item 74 or encourage premature claims. Commercial applicant use is the immediate proving ground; government distribution becomes credible only when the same evidence graph repeatedly produces accurate, current, explainable and professionally usable outputs.
