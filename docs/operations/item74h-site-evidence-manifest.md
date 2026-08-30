# Item 74H site evidence manifest

Status: **IMPLEMENTED / REMOTE ACCEPTANCE PENDING / PRODUCTION DISABLED**

## Purpose

The site evidence manifest is the commercial boundary between a useful free Pathway Check and an evidence-grade paid output.

It prevents Plannera from treating an address match, an LGA/zone result or an LLM-generated explanation as proof that a site-specific planning conclusion is ready for sale.

The first contract is intentionally limited to Byron RU2 shed/outbuilding work:

- manifest version: `byron-ru2-shed-site-evidence.v1`;
- LGA: Byron;
- zone: RU2 Rural Landscape; and
- proposal type: shed/outbuilding.

## Commercial stages

### Free Pathway Check

The free stage requires:

- a confirmed address resolution represented only by a digest;
- authoritative spatial confirmation of Byron RU2; and
- current applicable instrument evidence.

The free result may remain `MORE_EVIDENCE_REQUIRED`. That is a valid and useful outcome.

### A$49 Planning Controls Pack

The controls pack additionally requires evidence for:

- agricultural ancillary use;
- non-habitable design;
- footprint and height;
- legal landholding area;
- existing aggregate farm-building area;
- road classification;
- road, side and rear setbacks;
- waterbody relationship;
- heritage status;
- environmental sensitivity;
- mapped constraints; and
- ridgeline and visual impact.

The pack is not eligible if any required fact is missing, stale, weakly sourced or conflicting.

### A$749 submission SEE

The submission SEE additionally requires:

- the exact evidence-aware upload set; and
- operator approval of the exact evidence and control scope.

Document polish does not increase evidence trust. A polished PDF or DOCX cannot make an incomplete manifest submission-ready.

## Evidence source rules

The manifest distinguishes:

- address resolver evidence;
- authoritative spatial evidence;
- authoritative instrument evidence;
- title or survey evidence;
- site plans;
- user attestations;
- workspace uploads; and
- operator review.

Each source type has a maximum trust level.

In particular:

- an address resolver or user attestation cannot claim to be evidence-verified;
- uploads and plans cannot claim operator approval;
- operator approval must come from an operator-review observation; and
- authoritative online sources must use HTTPS.

Some facts require corroboration from more than one source group. For example, agricultural ancillary use requires both a site-confirmed user statement and evidence-grade plan or operator evidence. Waterbody and ridgeline relationships require both authoritative spatial checking and plan evidence.

## Currentness and conflict

Every observation carries:

- a fact key;
- a typed value;
- a SHA-256 value hash;
- source kind and reference;
- trust level;
- retrieval time;
- optional effective period; and
- optional stale time.

The complete manifest is also SHA-256 bound.

The evaluator fails closed when:

- a value hash is wrong;
- the manifest digest is wrong;
- a source is missing or of the wrong class;
- trust is too weak;
- evidence is outside its effective period or stale;
- qualifying sources disagree;
- an observation is duplicated; or
- raw address, coordinate, geometry, parcel or lot/DP fields appear.

## Decision boundary

The manifest does not decide planning compliance by itself. It decides whether enough trusted site evidence exists to run the separately versioned control graph.

Its boundaries are:

- `BASE_SITE_UNCONFIRMED`;
- `MORE_EVIDENCE_REQUIRED`;
- `EVIDENCE_VERIFIED`; and
- `OPERATOR_APPROVED`.

Only an eligible controls-pack manifest is ready for deterministic STOP, PROCEED or MERIT control evaluation. The existing control graph remains responsible for that planning decision.

## Enforcement

The contract is implemented in:

- `src/lib/pathway-site-evidence.ts`; and
- `src/lib/pathway-site-evidence.test.ts`.

The secret-free workflow is:

- `.github/workflows/pathway-site-evidence.yml`.

It verifies free-only eligibility, pack eligibility, submission eligibility, wrong-source rejection, stale evidence, source conflicts, trust laundering, digest tampering, duplicate observations and raw-site-field rejection.

All checkout and controlled-address flags remain false in CI.

## Next acceptance boundary

The next step is read-only authoritative retrieval for the controlled Byron site:

- cadastral or title-backed landholding area;
- road classification;
- mapped flood, bushfire, biodiversity, heritage and environmental constraints;
- waterbody and ridgeline relationships; and
- source dates and content hashes.

Proposal dimensions, agricultural use, existing buildings and measured setbacks must come from genuine user/site-plan evidence. They must not be invented or inferred merely to make the paid stages eligible.

No Production schema, data, checkout or payment action is authorised by this manifest.
