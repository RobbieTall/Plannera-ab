# Customer Word/PDF delivery handover

## Current checkpoint - 29 September 2026

Commercial decision: **HOLD**. Production activation is not authorised.

Item 78C's automated decision remains **READY_FOR_NON_PRODUCTION_ACCEPTANCE**:
[run 36426605240](https://github.com/RobbieTall/Plannera-ab/actions/runs/36426605240),
runner `0a871d38a5806e6a28404700d660f5d363f3a1d4`. Its retained artifact is
decision JSON, not customer Word/PDF files. Preserve that immutable evidence,
the independent council fixtures and draft PR #450's detailed closeout.

The active task is a separate customer document journey. The existing hosted
Generate SEE flow is a pre-SEE memo/text export; it must not be marketed as
a proven paid Word/PDF journey.

## Prepared implementation

- Reconciles useful presentation work from PRs #433, #434 and #435: current-issue
  revision history, shared presentation model, native Word contents field,
  styles relationship, PDF page references and qualified working-document labels.
- Adds immutable project/evidence/version-bound DOCX/PDF snapshots.
- Adds Preview-only authenticated downloads, exact-scope paid entitlement checks,
  private storage reads and original-byte reopening.
- Implements private snapshot persistence and metadata-only pointers in draft code.
  Trusted customer generation and UI remain unfinished. No cloud snapshot has been created.
- New implementation branch: `feat/see-document-delivery-20260929`.
  Its first commit includes `git.deploymentEnabled: false` for that exact branch.
  No merge or manual deployment is part of draft publication.

## Evidence and limits

The approved corrections are complete. Local evidence: 37 focused Node checks,
full TypeScript checking, the pure working-SEE acceptance and static build
contract passed. The revised synthetic PDFs have 11 pages each; representative
cover, document-control and continuous-section pages were visually inspected.

The full local build did not complete: the sandbox blocked tsx's local socket,
and a permitted retry ended when esbuild stopped during launch smoke. No macOS
security bypass was used. The new Linux workflow must supply full-build evidence;
its existence is not a passing result. Native Word review of this new revision
and actual protected Preview generation/download/reopening remain unproven.

Static import/fingerprint checks constrain reviewed entrypoints; they do not
prove every dependency or Next.js build behavior non-mutating. The isolated CI
job has no cloud credentials, environment binding or deployment command, disables
install lifecycle scripts, and executes checks under a cleared environment with
synthetic localhost configuration. Dependencies still require network downloads.

## Exact next work

1. Obtain the draft commit's isolated Linux CI results and resolve genuine failures.
2. Assemble actual saved project candidates without inventing source URLs, retrieval
   dates or spatial evidence. Keep survey gaps explicit, not falsely verified.
3. Persist private immutable snapshots and metadata-only pointers; never put file
   bytes in Artefact payloads exposed by project listing.
4. Add project generation, version selection and Word/PDF download controls.
5. Establish deployment safety for a separately controlled protected Preview.
6. Prove both councils' authorized downloads, denied cross-project/unauthorized/
   revoked access, original-byte reopening, warnings and version identity.
7. Review the downloaded documents in Word and a PDF viewer, then report a
   commercial go/no-go. Passing unit tests alone does not close this task.

## Continuity and boundaries

Read Issue #395, this file, the build-next queue and
[download contract](../operations/working-see-download-contract.md).
Record the exact commit and CI/Preview evidence after each meaningful milestone.
Do not repeat paid sessions or request credentials without confirming saved state.
Keep Production checkout disabled; do not mutate Production data/schema.
Do not merge main or deploy Production without explicit approval.

PR #448 Research Viewer and PR #449 Project Controls remain deferred. Preserve
original-source provenance, project identity and immutable version bindings.
Screenshots alone are not authoritative evidence. Do not build those features
to avoid completing the current commercial gate.

## Approved continuation and practitioner governance

Robbie confirmed that the concurrent documentation branch is mobile work and
authorised continuing PR #452 without touching it. The build-safety regression
test's expected transitive-source count is corrected from 13 to 14 to include the
reviewed presentation module; all dependency and mutation checks are retained.

PR #451 records Practitioner Workflow Intelligence and a later real-user pilot.
Practitioner material may inform what Plannera checks; authoritative current
sources determine what Plannera says. It is not statutory authority, a complete
council methodology, a universal checklist or a substitute for wider professional
review. Assessment breadth and depth must scale with development complexity.

The real-user pilot follows the commercialisation-critical work. It is not a
golden case or planning precedent, and no project-specific conclusions belong in
Byron rules. Do not ingest or publish that project's private files as part of this
draft. Reconcile canonical governance after PR #451 is merged, without modifying
the mobile branch or interrupting the current document journey.

## Linux validation checkpoint

At commit `7c2877ffcde1b796e7b17a0a59d2568ef608ed89`,
[isolated run 36530989953](https://github.com/RobbieTall/Plannera-ab/actions/runs/36530989953)
passed full TypeScript checking, 11 build-safety tests, 29 delivery/HTTP/storage
tests and 15 renderer tests. Seven other PR workflows also passed.

The complete `vercel-build` did not pass: `smoke:launch` invokes a database read,
and synthetic localhost configuration with the engine-free Prisma client cannot
satisfy it. No live database credentials were supplied. The new separate
credential-free compilation job calls the existing sanitized Next build wrapper;
it does not replace, disable or satisfy the database smoke gate. Its result is
pending. Do not call the full build or the customer journey accepted.

The dependency installer also reported vulnerability advisories in the unchanged
lockfile. Exploitability/release impact has not been assessed; do not claim the
application is vulnerability-free or run an automatic force-upgrade.


## Approved metadata lint correction

The separate compilation job at `cc7132c11361c438e7a9c07dc969da1cdf6ef672`
compiled the application bundle, then failed lint on the unused `_bytes` binding.
Robbie approved its correction. The manifest now explicitly selects only format,
MIME type, content hash and byte length, preserving their order and excluding
file bytes. No lint/security rule was disabled. The focused local lint check
passed; Linux validation of this correction is pending. Bundle compilation alone
is not a completed Next build. The database smoke and real customer journey
remain outstanding, and the commercial decision remains HOLD.


## Verified correction results

Code commit `a199e2f262f1824ddcc8448a56c0e1ff4af5ff50` completed
[run 36532529622](https://github.com/RobbieTall/Plannera-ab/actions/runs/36532529622).
The credential-free compilation job passed the complete Next build, including
lint, types, static generation and page optimization. Full TypeScript checking
and all 55 focused tests passed (11 safety, 29 delivery/storage/HTTP, 15 renderer).
Seven other PR workflows also passed their applicable non-stateful checks.

The isolated-validation job still ends in failure when the unchanged complete
`vercel-build` reaches its database smoke. The engine-free Prisma client rejects
the synthetic localhost datasource protocol. This is not a passing release gate;
no cloud database was contacted or live credentials supplied to satisfy it.
The Next build emitted a non-fatal dynamic-route diagnostic for `/api/dcp/search`.

Next: trusted saved-source generation, private snapshot persistence and metadata
pointers, then customer version/download UI and protected Preview proof for both
councils. Keep source gaps explicit. No merge or deployment occurred. This result
is recorded on the draft PR branch, not merged main; commercial status is HOLD.


## Private persistence implementation checkpoint

The draft now includes an append-only private Blob writer and an owner-authorised
persistence service. Both deny non-Preview or disabled-write configurations before
I/O. The writer refuses overwrite, verifies original bytes through a private read,
and accepts retries only when that read proves an identical snapshot. The service
checks exact paid SEE scope and original project source records before upload,
then rechecks authorization in a serializable transaction before publishing a
metadata-only pointer. No provider URL or file bytes belong in the Artefact row.

A distinct `working_see` Artefact type and additive migration are PREPARED ONLY.
No database migration, cloud write, Preview deployment or Production change has
been executed. Do not run migrations from builds. A separately authorised isolated
Preview migration and target-safety check are required before enabling persistence.
On a database failure an uploaded object remains private and unlisted; an identical
retry can finish its pointer. Do not automatically delete it: concurrent work may
already reference it. Retention/repair must use an explicit inventory and approval.

Persistence tests use injected in-memory databases and private storage. Their tiny
byte fixtures do not prove Word/PDF validity or cloud transaction behavior. Existing
renderer tests cover synthetic document rendering separately. This checkpoint's
validation is pending. Trusted saved-source assembly, actual generation endpoint,
customer UI/version controls and hosted both-council proof remain unfinished.


Local persistence validation: full TypeScript and focused lint passed; all 43
combined delivery/storage/HTTP/persistence Node tests passed using a pure TypeScript
transpilation harness. The native tsx/esbuild runner failed before running tests;
no macOS security bypass was used. Linux CI must independently exercise the usual
runner and the new code before this checkpoint is considered validated remotely.

PR #451 now documents two complementary deferred pilots: established-LGA depth
and genuine just-in-time new-LGA activation. The latter must prove the activation
process, including maturity/coverage honesty, provenance, freshness, deduplication,
notification and regeneration; a manually completed planning answer is not proof.
Neither pilot's private survey, DWG, imagery or design files are needed for this
persistence work. The mobile documentation branch remains untouched.
