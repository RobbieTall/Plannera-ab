# Item 74E synthetic render artefacts

Status: **SAFE ARTIFACT WORKFLOW IMPLEMENTED / VISUAL REVIEW PENDING**

## Purpose

This workflow generates short-lived synthetic DOCX and PDF files so the output
can be structurally and visually reviewed before any customer or Production
execution.

## Data boundary

The fixture contains:

- a synthetic project and confirmed-site identifier;
- a synthetic site label;
- repeated-character test hashes;
- public planning-source URLs;
- official public polygon feature metadata; and
- synthetic section narratives.

It contains no real address, parcel identifier, customer content, credential,
payment record or database value.

## Automated checks

The workflow:

1. renders the synthetic candidate;
2. reruns full submission acceptance using exact output hashes and sizes;
3. validates the DOCX ZIP package with `unzip -t`;
4. validates that the PDF is identified as a PDF document; and
5. uploads the DOCX, PDF and privacy-safe manifest for seven days.

The artefact is review evidence only. It is not a customer deliverable and must
not be used to claim professional adequacy.

## Required visual review

Before the renderer can be accepted for a real controlled Preview flight, a
reviewer must inspect:

- cover hierarchy and site/product labelling;
- page breaks and section hierarchy;
- body readability and line wrapping;
- source register legibility;
- citation treatment;
- footer and page numbering;
- DOCX opening and field behavior in Microsoft Word or a compatible viewer;
- PDF opening and pagination in a standards-compliant viewer; and
- handling of representative Byron and Kempsey punctuation and long source
  references.

Any visual defect remains red. The gate must not be weakened to accept malformed
or unprofessional output.

## Safety

- Production checkout remains disabled.
- The workflow has read-only repository permission.
- It does not connect to a database.
- It does not mutate Preview or Production.
- The uploaded artefact expires after seven days.
- Only the synthetic files may be downloaded for review.
