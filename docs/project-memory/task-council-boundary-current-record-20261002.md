# Codex task — fix current NSW council boundary record handling

Status: **APPROVED 4 OCTOBER / IMPLEMENTED AND CODE-VERIFIED / NOT DEPLOYED**

The bounded correction is complete at `186be9afbcff3956d28ece4e267fac198c2565e0`: 331 tests, full TypeScript, build safety, both offline missing-database guards, credential-free compilation and all 14 exact-commit GitHub workflows passed. See [the execution receipt](../operations/working-see-council-boundary-correction-20261004.md) for evidence and separately authorised Preview verification steps. The original task specification below is retained; its approval prerequisites are now satisfied for this correction only. No deployment, merge or database/customer-data operation occurred. Commercial HOLD remains.

You are a senior full-stack engineer (Next.js 14, TypeScript, Prisma, PostgreSQL, Vercel).

You have full access to the Plannera-ab repo and must investigate the codebase directly.

Your job is to:
- identify the real root cause of the council-identity failure described below;
- propose the minimal, safest fix;
- implement the correction only after Robbie explicitly approves this task;
- verify with focused and existing provenance/document tests;
- provide clear non-developer verification steps.

You MUST NOT:
- guess without checking the repo;
- apply wide refactors;
- change public API response shapes unless explicitly required;
- weaken content-type, coordinate, ambiguity, age, hash or conflict checks;
- change billing, checkout, schema, environment, Production or customer data;
- ignore TypeScript/build failures.

---

# TASK OVERVIEW

Problem Summary:
- PR #452's normal site-confirmation flow needs a canonical server-side council identity before the saved provenance envelope can support working-SEE generation.
- `src/lib/see-document-council-identity.ts` currently queries the official NSW LocalGovernmentArea layer using `where: "enddate IS NULL"`.
- Its response schema also requires `enddate: z.null()`.
- The 30 September read-only hosted diagnostic found the live Byron feature can use a finite far-future end date (`32503680000000`) instead of null.
- Therefore a legitimate current feature is excluded and the council identity is not retained.
- The normal zoning lookup still succeeds, which explains why the site can show zoning while the combined saved council/spatial provenance remains absent.
- The earlier content-type hypothesis was disproved: the real `f=json` response returned `application/json`. Do not weaken the JSON/content-type guard.

Expected behaviour:
A coordinate-intersection result may be treated as current only when exactly one matching provider feature is current at the evaluation time:
- `enddate === null`, or
- `enddate` is a finite ArcGIS epoch-millisecond value strictly later than the evaluation time.

Expired, invalid, ambiguous or conflicting records must continue to fail closed.

---

# EVIDENCE PROVIDED

Current implementation and tests:
- `src/lib/see-document-council-identity.ts`
- `tests/see-document-council-identity.test.ts`
- `src/lib/site-context-provenance-storage.ts`
- `tests/see-document-site-provenance.test.ts`
- `src/lib/site-context.ts`
- `src/lib/see-document-generation-source-loader.ts`

Operational evidence:
- `docs/operations/working-see-hosted-rehearsal-checkpoint-20260930.md`
- `docs/project-memory/see-document-delivery-handover.md`
- PR #452 / Issue #395 latest comments.

Static 2 October audit:
- normal site resolution saves the canonical zoning code separately from the display label;
- provenance retention is Preview-only, serializable and revision-bound;
- retained zoning/council evidence is revalidated against exact coordinates, parcel/site identity, hashes and age;
- the generation loader directly requires saved council identity for the ordinary DPP source-capture path;
- legacy zoning evidence cannot invent council identity;
- no second known code prerequisite was found behind the current lookup failure.

Cross-check all evidence against the actual current branch before making any change.

---

# REQUIRED OUTCOME (ACCEPTANCE CRITERIA)

The fix is complete when ALL are true:

1. The official council lookup no longer assumes current rows must have a null `enddate`.
2. The request remains a fixed, credential-free coordinate-intersection query to the existing official layer.
3. Exactly one current matching feature is required.
4. A null end date is accepted.
5. A finite end date strictly in the future is accepted.
6. An expired end date is rejected.
7. An end date equal to the evaluation time is rejected.
8. Invalid/non-finite/malformed end dates are rejected.
9. One expired + one current row resolves only to the one current row.
10. Two simultaneous current rows fail closed as ambiguous.
11. `exceededTransferLimit`, provider error payloads, redirects, non-JSON content, oversized responses and malformed JSON remain rejected.
12. Candidate council/name/code conflicts remain rejected.
13. Stored evidence remains bound to the exact point, original provider response/hash and retrieval time.
14. Stored evidence that was current when fetched but is evaluated after its provider `enddate` must be rejected even if its ordinary 24-hour cache window has not yet elapsed.
15. The future-end-date proof is exercised through `site-context-provenance-storage` retention/read tests as well as direct council-identity unit tests.
16. No public API response shape, planning conclusion, customer-facing readiness state, schema, billing or checkout behaviour changes.
17. Full TypeScript passes.
18. Focused council/site-provenance tests pass.
19. Existing #452 document/source/provenance suites remain green.
20. Build-safety and credential-free compilation checks applicable to #452 pass.
21. No merge or deployment occurs as part of this task.

---

# WHAT YOU MUST DO

## 1. Investigate first

- Inspect the exact current implementation and every caller/test.
- Confirm the provider's existing `enddate` representation from recorded repository evidence.
- Inspect how the current raw response is hashed and retained.
- Confirm how the injected clock is used for both fresh lookup and stored-evidence reread.
- Confirm the current two-result bound and ambiguity behaviour.
- Summarise the root cause before editing.

## 2. Design the minimal fix

Preferred direction:
- do not pre-filter the official query to `enddate IS NULL`;
- retrieve the bounded coordinate-intersection candidate set;
- parse `enddate` as nullable or finite provider epoch milliseconds;
- filter candidates for current-at-evaluation-time in code;
- require exactly one current candidate;
- preserve the original response text/hash, not a synthetic rewritten response;
- ensure stored-response reread applies provider-current logic using the later evaluation time.

Do not use name-only trust. Do not pick the first result. Do not treat a future timestamp as proof of statutory planning controls; this is council identity only.

## 3. Implement surgically

Likely files:
- `src/lib/see-document-council-identity.ts`
- `tests/see-document-council-identity.test.ts`
- `tests/see-document-site-provenance.test.ts`

Change no other file unless direct inspection proves it necessary.

## 4. Regression cases

At minimum:
- single null end date;
- single far-future end date;
- expired end date;
- end date equal to now;
- invalid end date;
- expired + current;
- two current candidates;
- transfer limit;
- unknown/wrong council;
- candidate label/code conflict;
- raw response/hash tampering;
- normal 24-hour expiry preserved;
- provider end date expiring before 24-hour cache expiry;
- retained future-dated council proof through saved site provenance.

## 5. Run build/tests

- focused council identity tests;
- site provenance tests;
- full TypeScript;
- existing #452 document/source/provenance suites required by its isolated workflow;
- build-safety checks;
- credential-free compilation.

Do not weaken fingerprints/checks simply to obtain green CI.

## 6. Prepare manual verification

After code validation, describe the exact **separately authorised** Preview steps:
- use only the existing isolated Byron/Kempsey rehearsal targets;
- normal site search/select/save flow;
- confirm saved canonical council + spatial provenance;
- regenerate a new DPP/memo;
- continue hosted working-SEE generation only if evidence is genuinely present.

Do not deploy during this Codex task.

---

# GUARDRAILS

- Current PR #452 lineage only after Robbie approval.
- No merge.
- No deployment.
- No migration or database write.
- No Production change.
- No checkout activation.
- No environment/secrets changes.
- No payments/refunds.
- No live customer/private-data inspection.
- Do not repeat completed DCP/LEP source refreshes.
- Do not alter Research Viewer, Project Controls or pilot branches.

---

# OUTPUT FORMAT

When finished, output:

1. **Summary of what was wrong and how it was fixed (bullet points)**
2. **List of files changed (1 line per file)**
3. **Verification steps for Robbie (URLs/buttons + expected result)**
4. **Follow-up tasks (if needed)**

Do not claim hosted document acceptance or commercial readiness from code/tests alone.
