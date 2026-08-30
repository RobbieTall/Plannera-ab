# Item 74H real-site commercial bridge

## Purpose

This bridge prevents the free Pathway Check, A$49 Planning Controls Pack and
A$749 submission SEE from drifting onto different site facts.

It combines two independently verified digests:

- the current statutory and spatial site-evidence manifest;
- the reviewed private road, survey and proposed-layout evidence package.

The resulting composite digest becomes the site-evidence component of the
existing persisted exact commercial scope.

## Required identities

The A$49 pack remains ineligible unless all of the following match exactly:

- the authoritative road category, URL hash, publication date and retrieval date;
- the proposal footprint;
- the proposal height;
- the measured road setback;
- the measured side and rear setbacks;
- every existing Planning Controls Pack manifest requirement.

The side and rear manifest value uses the canonical ordered representation:

- REAR_SETBACK_M=<number>
- SIDE_SETBACK_M=<number>

The A$749 SEE additionally requires the EVIDENCE_UPLOAD_SET observation to equal
the reviewed real-site evidence digest and every existing submission-stage
manifest requirement, including operator approval.

## Fail-closed behavior

A missing, stale or invalid real-site package blocks both paid stages. A
different road source or different proposal measurement blocks both paid
stages. A different upload-set digest leaves the A$49 pack scope intact but
blocks the A$749 SEE.

A valid bridge result can create an exact commercial scope only when the
Planning Controls Pack is eligible. The scope contains the composite evidence
digest, current Byron DCP control ID, confirmed road category, applicable road
minimum, measured road setback and deterministic outcome. The existing
persistence and replay policy then freezes that exact scope.

Production checkout is always reported as disabled.

## Privacy and operation

The bridge consumes the strict metadata-only package from
item74h-real-site-evidence-intake.md. It does not accept or return the address,
filename, storage URL, coordinates, parcel identifiers or geometry.

Do not place the private site plan or its site identifiers in GitHub, workflow
inputs, PR comments, Vercel logs or a public object URL. Complete the separate
private storage and authenticated access-control acceptance before Plannera
receives the file directly.


## Free-to-paid proposal reconciliation

The bridge also binds the reviewed evidence back to the proposal captured by the
free Pathway Check. The proposal review must:

- carry the SHA-256 digest of the complete user attestation;
- be marked `EVIDENCE_VERIFIED`;
- explicitly map the v1 `otherBoundarySetbackMetres` field to the reviewed
  rear-boundary measurement;
- have a valid review time no later than the commercial assessment.

The reviewed manifest and private package must then match the attested land
area, existing farm-building area, proposed footprint, height, road setback,
side setback and rear setback exactly. Agricultural purpose and non-habitable
design must also be verified in the manifest.

A valid review whose evidence differs from the free proposal produces
`PROPOSAL_ATTESTATION_SCOPE_MISMATCH`. A missing, stale or incorrectly bound
review produces `PROPOSAL_ATTESTATION_REVIEW_REQUIRED`. Either result blocks
both paid stages and prevents creation of an exact scope.

The composite site-evidence digest now includes the reviewed proposal
attestation digest. This prevents a paid artefact from being replayed against a
different customer proposal even when the verified documents are otherwise
unchanged.
