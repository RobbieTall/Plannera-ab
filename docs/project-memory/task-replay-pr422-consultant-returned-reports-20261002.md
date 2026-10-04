# Codex replay task — consultant returned reports into the current private evidence graph

Status: **PREPARED FOR A POST-#452 EVIDENCE LANE / DO NOT CHERRY-PICK PR #422 WHOLESALE**

Historical source: PR #422 / Issue #421.

## Purpose

Rebuild the returned-consultant-report bridge against the current private-evidence and progressive-regeneration architecture.

The product contract remains valid:
- a returned consultant report is private project evidence;
- referral delivery does not make a report safe, applicable or current;
- returned reports must re-enter the exact project/evidence chain that produced the referral;
- reports may strengthen the living A$49 pack / A$749 working SEE only after the normal security, review, applicability and finality gates.

## Architecture correction from the historical PR

Do **not** force consultant reports into the fixed Item 74H four-document package assembly.

The current package assembly deliberately requires the exact core role set:
- ROAD_CLASSIFICATION
- REGISTERED_CADASTRAL_PLAN
- CADASTRAL_SURVEY
- PROPOSED_SHED_LAYOUT

That package is a specific site-evidence proof.

The current progressive evidence layer already recognises `CONSULTANT_REPORT` as a separate professional-report evidence event. Returned consultant reports belong in that living evidence graph.

## Current gap

The current private upload policy does not yet permit `CONSULTANT_REPORT`.

The replay should bridge:

`delivered referral`
→ `exact returned-report binding`
→ `private evidence intake as CONSULTANT_REPORT`
→ `malware clean`
→ `immutable operator review/promotion`
→ `applicability/readability/page-level evidence review`
→ `progressive evidence graph`
→ `affected working assessment regeneration`

Never shortcut from referral status directly to planning evidence.

## Exact returned-report binding

Create/recreate a durable server-authoritative binding that records only the minimum continuity facts:
- referral ID;
- project ID;
- opaque private evidence reference;
- referral scope key;
- immutable referral package digest;
- requested discipline ID;
- exact content SHA-256;
- received timestamp;
- later accepted/progressive-evidence binding timestamp where appropriate.

Requirements:
1. one evidence reference cannot be silently rebound to a different referral/project/scope/digest/discipline/hash;
2. exact replay is idempotent;
3. concurrent unique-key races fail closed or resolve to the exact same binding only;
4. requested discipline is derived from the immutable referral package snapshot, not caller text;
5. project/referral/scope/package/hash continuity is server-loaded;
6. no consultant identity, file name, address, report text or storage URL belongs in privacy-minimal status output.

## Referral delivery truth

Do not decide delivery from current status alone.

Use immutable referral event history:
- a prior `ASSIGNED` or `CONSULTANT_ACKNOWLEDGED` delivery event proves the package was sent/acknowledged;
- a later `NEEDS_INFORMATION` state may still be compatible with a prior real delivery event;
- merely `SUBMITTED` or internally `ACKNOWLEDGED` is not delivery.

Inspect current referral lifecycle code before implementing.

## Private evidence integration

Extend the current private evidence role contract to allow `CONSULTANT_REPORT`.

The report must reuse the current protected controls:
- authenticated exact-project scope;
- private Blob/quarantine only;
- immutable source SHA-256;
- real malware scan state;
- immutable operator review;
- promotion only after accepted review;
- no raw storage URL returned;
- no Production acceptance by default.

Do not route consultant reports through the generic legacy `WorkspaceUpload` path.

## Progressive evidence integration

Once the exact report is clean/reviewed and the binding still matches:
- create or feed the current progressive evidence event as `CONSULTANT_REPORT`;
- classify it as professional report evidence;
- preserve source date/authorship/limitations/page references;
- require proposal/site applicability review;
- surface conflicts rather than allowing later evidence to silently overwrite earlier evidence;
- regenerate only affected working assessments;
- preserve immutable earlier document versions.

A clean consultant report is still not automatically:
- applicable;
- current;
- dispositive;
- final;
- submission-ready.

## Tests

At minimum:
- role is accepted by private upload policy but remains quarantined while scan/review pending;
- Production/feature-disabled/project mismatch denied before storage;
- referral not delivered denied;
- later NEEDS_INFORMATION with prior delivery event handled correctly;
- wrong project/scope/package digest denied;
- unrequested discipline denied;
- content-hash mismatch denied;
- wrong evidence role denied;
- rejected evidence remains rejected;
- clean but unreviewed evidence remains quarantined;
- exact replay is idempotent;
- evidenceRef rebind attempt denied;
- concurrent binding race cannot cross scopes;
- reviewed exact report can enter progressive evidence graph;
- report cannot alter fixed four-document package role set;
- report does not unlock final SEE/readiness without applicability/finality gates;
- privacy-minimal outputs contain no IDs/hashes/report text/storage URLs.

## Expected code areas

Likely:
- current private evidence role/policy + tests;
- new/recreated consultant returned-report binding service;
- returned-report intake/bridge service;
- schema/migration for binding only if the current schema still lacks an equivalent durable model;
- current progressive evidence regeneration adapter/tests.

Do not import September continuity docs wholesale.

## Guardrails

- Start from then-current main.
- No generic/public workspace upload route for consultant reports.
- No weakening of malware/operator/applicability/finality gates.
- No Production upload/checkout activation.
- No customer-private report contents in logs/test artifacts.
- No merge/deployment as part of the Codex task.

## Output

Report:
1. current architecture used;
2. files/schema changed;
3. exact security/scope/applicability tests;
4. remaining adapter/UI work, if any.
