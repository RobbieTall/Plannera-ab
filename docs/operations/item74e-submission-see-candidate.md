# Item 74E submission SEE candidate assembly

Status: **ASSEMBLER IMPLEMENTED / APPLICATION AND OUTPUT GENERATION NOT EXECUTED**

## Purpose

The acceptance contract defines what the A$749 product must prove. The candidate
assembler connects that contract to Plannera's existing project evidence
shapes without upgrading the current MVP pre-SEE memo.

## Inputs

The assembler consumes:

- exact current project ID;
- exact Detailed Planning Pack artefact and content;
- explicit submission SEE draft or existing pre-SEE memo;
- current spatial provenance;
- attributable official LEP, DCP and spatial source records;
- workspace upload evidence;
- explicit upload-to-section bindings;
- current-site upload identifiers;
- rendered-output metadata when available; and
- operator review metadata when available.

Product identity and A$749 pricing are server-derived only for an explicit
`submission_see_draft`. Callers cannot label a pre-SEE memo as the paid
product through this assembly path.

## Evidence binding

A workspace upload becomes candidate evidence only when:

- it exists in the workspace source register;
- it has one explicit binding;
- its section IDs are recorded;
- its stored hash and extraction/indexing states are preserved; and
- its current-site state is provided by the caller.

A ready current-site upload with no section binding creates an assembly blocker.
Unknown and duplicate bindings also block. The assembler does not infer a
section from a filename, file type or document text.

## Existing pre-SEE memo

When the existing memo is supplied:

- document type remains `pre_see_planning_memo`;
- product code remains non-submission;
- price remains zero;
- its own limitations are preserved;
- its assessments are not rewritten into the eight required submission
  sections; and
- the final acceptance status is blocked.

This prevents commercial relabelling without a real submission draft.

## Deterministic evidence

The Submission SEE Candidate Assembly workflow checks:

- complete evidence-bound Byron SP3 and Kempsey E2 candidates;
- exact official and uploaded source registration;
- current pre-SEE memo remains blocked;
- stale DPP binding;
- ready uploads with no section binding; and
- stale, unreadable or unindexed uploads.

The complete fixtures prove assembly semantics only. They do not prove real
content quality, output rendering, protected hosted execution, operator review
or payment acceptance.

## Next implementation boundary

The application must next produce a real `submission_see_draft` from the
current DPP/QSC chain and reviewed evidence register. It must then render and
hash DOCX and PDF outputs before protected Preview operator acceptance can turn
the gate green.

## Safety

- Production checkout remains disabled.
- No Production data, schema or configuration change is part of this slice.
- No database mutation is performed by the assembler or CI.
- Do not infer upload applicability.
- Do not convert a pre-SEE memo into a submission draft.
- Do not log address, coordinate, parcel, credential or uploaded-content data.
