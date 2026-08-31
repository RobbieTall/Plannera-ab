# Item 74H registered-plan reconciliation

Status: IMPLEMENTED / PREVIEW ACCEPTANCE REQUIRED

## Purpose

Paid Item 74 outputs must not infer legal parcel area or legal boundaries from an applicant estimate, a Council DA drawing, or a detail survey alone. The evidence chain is:

1. current road classification;
2. registered cadastral plan from NSW Land Registry Services;
3. current detail survey reconciled to that registered plan;
4. proposed shed layout bound to the reconciled detail survey.

The registered plan controls parcel area when the plan and detail survey state different areas. The difference remains visible in the private evidence record; it is not hidden or averaged.

## Commercial gate

The free Pathway Check may explain what is still required. The A$49 Planning Controls Pack and A$749 Statement of Environmental Effects remain blocked until:

- all four private evidence roles are scanned, reviewed and immutably promoted;
- registered-plan and detail-survey areas are explicitly reconciled;
- road, side and rear setbacks are promoted from survey measurements;
- the reviewed proposal attestation and evidence manifest match the registered-plan area;
- fixture or synthetic evidence is rejected from paid artefact binding.

Production checkout remains disabled. This change is rehearsed only on an isolated protected Preview database before merge.

## Privacy and safety

Logs and acceptance summaries contain opaque references, hashes and booleans only. They must not contain addresses, Blob URLs, database URLs, customer documents or credentials. Synthetic acceptance rows are removed in a finally block and zero residue is mandatory.
