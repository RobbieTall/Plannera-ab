# Item 74H working SEE output and regeneration

## Purpose

A customer may start useful A$749 SEE work before every survey or specialist report is available. Missing evidence must be visible and must prevent only unsupported claims and submission-ready status, not the customer's ability to begin and later strengthen the same purchased project.

## Output states

- `WORKING_SEE`: qualified DOCX/PDF output. It is useful for customer review and consultant collaboration, but it is not ready for lodgement.
- `SUBMISSION_READY`: the existing strict final renderer and commercial acceptance gate have passed. This state is not granted by the working renderer.
- Every working file is titled and footered `WORKING SEE - NOT SUBMISSION READY`.
- Every working filename begins `working-statement-of-environmental-effects-`.

## Hard safety boundary

The working renderer may tolerate only these existing final-acceptance blockers:

- `unready_dpp`
- `unready_upload_evidence`
- `declared_non_final`
- `operator_review_incomplete`

It must refuse all identity, site, LGA, zone, spatial-provenance, DPP/QSC-chain, product, A$749 price, source, citation, section, output-integrity and Production-commercial-mode faults. The final renderer remains unchanged and refuses every blocker.

## Progressive evidence contract

- `MORE_EVIDENCE_REQUIRED` requires a non-empty evidence schedule.
- Every unresolved DPP topic must appear in that schedule.
- `CONFIRMED` requires a commercially ready DPP, no unresolved DPP topics and no outstanding evidence.
- The output records the exact current DPP artefact and any predecessor DPP it strengthens.
- Regeneration keeps the same project ID, confirmed site ID and QSC lineage.
- Later evidence changes the output hashes without creating a second purchase or silently replacing provenance.
- Final operator review remains mandatory after evidence becomes confirmed.

## Repeatable acceptance

Run:

```bash
npm run accept:item74h-working-see-preview
```

The acceptance is synthetic-only and in-memory. It writes no database or Blob data, uses no credentials or real documents, activates no checkout, and leaves no residue. It proves an unresolved working output, a same-project evidence-strengthened regeneration, DPP lineage, changed DOCX/PDF hashes and continued refusal by final acceptance.

The dedicated GitHub workflow and Vercel build both run this gate. Production checkout remains disabled.
