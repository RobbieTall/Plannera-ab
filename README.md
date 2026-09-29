## Current checkpoint: Linux proof complete; protected Preview prerequisites absent

Both approved test-only corrections are complete: the mock type assertion stays
on its expression line, and the in-memory integration project supplies every
required Project field with a checked type. No application validation or evidence
requirement was weakened. This commit publishes the previously local source-capture
and ordinary-pack generation work to DRAFT PR #452, not to main or a deployment.

### Implemented

- Byron and Kempsey importers retain actual source retrieval time, original PDF
  SHA-256 and exact stored clause-text SHA-256. Original composite hashes are not
  relabelled as clause-text fingerprints. Legacy rows are not backfilled.
- Saved zoning retains the authoritative lookup code separately from its display
  label and rejects conflicting labels.
- Normal DPP creation has a default-off Preview-only source-capture hook:
  PLANNERA_WORKING_SEE_SOURCE_CAPTURE_ENABLED=1 AND VERCEL_ENV=preview.
  Capture is stored in the SAME NEW pack payload; unavailable evidence is explicit
  and does not prevent saving a qualified DPP.
- After owner, exact paid entitlement, memo/QSC/pack and saved spatial checks,
  generation consumes the ordinary pack's source envelope and rereads current
  LEP/DCP records. No pretend PathwayAssessment is manufactured.
- The genuine existing assessment path is retained for packs without an ordinary
  capture. A present invalid capture cannot fall back to different evidence.
- Shared checks enforce exact citations/excerpts, source identity, version,
  freshness, body fingerprints and trust markers. Source retrieval timestamps are
  never reset to document-generation time. Capture time bounds later row persistence.
- Isolated CI includes the new capture/importer and ordinary-pack generation tests.

### Validation evidence for this application revision

Local synthetic, credential-free validation is complete:
- FULL TypeScript PASS, without excluding either corrected test file.
- Focused ESLint PASS across all fourteen changed application/test/workflow files'
  TypeScript entries.
- 121 core document/source/provenance Node tests PASS.
- 4 importer integration + 13 generation integration + 11 pack capture tests PASS.
  Total: 149 UNIQUE document-related tests. The overlapping combined 60-test run
  also passed but is not added again to this total.
- Build-safety contract PASS: 7 permitted commands, 6 entries, 14 transitive sources.
  Its 11 regression tests PASS. Total local focused tests including safety: 160.

The integration tests use in-memory databases and mocked HTTP/PDF import I/O,
with real saved-record parsers, memo compiler, source rechecks and DOCX/PDF renderer.
Both ordinary-capture council cases and the eight existing assessment-path cases
pass. Both normal createDetailedPlanningPackArtefact capture cases pass.
Network/global database use is forbidden by the local harness.

These results do NOT establish authentic statutory evidence, cloud ingestion,
protected Preview customer downloads, native Word/PDF reopening, or one complete
normal DPP -> memo -> generation -> delivery run. No synthetic test records may
be promoted as planning evidence. GitHub run 36558368296 now confirms FULL TypeScript and 175 focused Linux tests
PASS: 121 core Node + 43 native Vitest (including 15 renderer) + 11 safety.
Source commit 2721b7fce3d1ea13bba5b487d0fcbee5ee0a1c05 was tested through PR merge
snapshot 2e4bddfaeebd52c5d1e057b3b2a7c431cc3a3142 against unchanged main.
The separate credential-free Next compilation job 109372924835 PASSED, including
37 static pages and optimization. This was compilation, NOT a Production deployment.

The isolated-validation job 109372924997 still FAILED after all tests at full
vercel-build's unchanged synthetic Prisma database smoke: an engine-free client
requires prisma:// or prisma+postgres:// rather than the synthetic localhost
Postgres URL. No live credential was substituted and no check was disabled.
Twelve other applicable PR workflows passed their automatic non-stateful checks.
The full build gate and commercial readiness remain NOT green.

The earlier 142-test Linux/Next compilation result belongs only to source 3ef7a7d.
Its complete vercel-build failed at the unchanged synthetic Prisma database smoke;
that is still unresolved, not bypassed or presented as a full-build pass.
Existing dependency advisories remain subject to release-risk assessment.

### Current protected Preview evidence (read-only recheck)

Both previously identified council targets are still distinct, non-default Neon
branches with their expected independent endpoints. Production was not queried.
Explicit READ ONLY transactions with an eight-second statement timeout returned
aggregate counts only; no address, person, document body or credential was read.

For BOTH targets:
- working_see is still absent from the ArtefactType enum.
- No SiteContext has a BYRON/KEMPSEY canonical council code.
- No saved SiteSpatialProvenance record exists.
- No relevant DCPClause row has the new sourceCapture envelope.
- No current Byron/Kempsey LEP row has retrieval within the seven-day policy.

Therefore a deployment alone cannot prove customer generation. Fresh source
ingestion must preserve genuine retrieval/provenance, not relabel existing data.
The normal site resolver's persistence currently uses candidate.lgaCode or null;
canonical council identity needs an evidence-based normal-flow solution, not a
manual code backfill or an assumed council from an address string. That application
prerequisite must be completed/proven before calling a Preview rehearsal ready.

Preserve the existing acceptance snapshots and source revisions. Prepare separate
document-rehearsal targets where writes are needed, then obtain scoped approval
for their additive schema step, source refresh and protected deployment. No such
write, branch creation, migration, ingestion or deployment has occurred here.

### Resume and remaining commercial gates

The test-correction approval blocker is resolved. Continue from this draft PR,
not a new branch or recreated cloud setup. The exact-commit Linux results are above. Next prepare the separately
authorized isolated Preview prerequisites: canonical council identity from actual
resolution, saved authoritative spatial evidence, current retained LEP/DCP source
envelopes and the unapplied working_see enum migration. Do not guess council codes,
bulk backfill evidence or run importers under this documentation update.

Protected Preview must then prove BOTH councils' actual customer generation,
private download, original-version reopening, wrong-user/wrong-project rejection,
evidence warnings, document versions and native Word/PDF presentation. Uploaded
plans/reports remain explicitly not independently incorporated by this path.
Seven-day source freshness is an operational policy, not statutory currency proof.

### Deployment safety and status

Before this documentation-only update, draft application head
2721b7fce3d1ea13bba5b487d0fcbee5ee0a1c05 and
main ff2179e06f68a8f265d7cc0b873cd28320a4da6b were unchanged. The retained exact
branch deployment-disable rule for feat/see-document-delivery-20260929 remains
in vercel.json; the latest twenty-deployment inventory contains no deployment for
this branch. Previously inspected automatic workflows remain unchanged except
the isolated, credential-free test-list extension. Stateful workflows are not
dispatched. Static checks do not guarantee arbitrary dependency behaviour.

Publication is to the existing draft feature branch only, without force, merge,
deployment command, schema/data mutation, real ingestion, cloud setting changes,
payment action or private-document publication. Production checkout remains off.
Other mobile documentation branches and immutable Item 78C evidence are untouched.
Research Viewer, Project Controls, practitioner governance and live-user pilots
remain compatible and deferred. Commercial decision remains HOLD pending the
actual protected customer document journey. No Production activation is authorized.
## Guarded document generation draft

PR #452 now connects the Preview-only working Word/PDF generation action to saved
source and paid-access checks. It remains default-off, unmerged and undeployed.
Hosted customer proof is still missing; commercial HOLD. Read the current document
delivery handover and Issue #395 for exact source-format limits and next approvals.
Production checkout remains disabled by the operating constraint; no Production
settings/data/schema were changed. Other documentation branches are untouched.

## Current document-delivery prerequisite

PR #452 now includes default-off, Preview-only retention of site lookup provenance.
It is not deployed or evidence of a completed customer generation journey.
Commercial HOLD; Production checkout remains disabled by the operating constraint.
See [the current handover](docs/project-memory/see-document-delivery-handover.md)
for exact limits, validation references and remaining work. Other documentation
branches and immutable Item 78C evidence remain untouched.

> Document-delivery draft update: PR #452 now includes Preview workspace saved-version/Word/PDF controls and a protected paginated metadata endpoint. Approved typing corrections complete: full TypeScript, lint, 59 document tests and 11 build-safety tests pass locally. Linux validation now passes 85 focused tests, full TypeScript and the complete credential-free Next build at code commit 210dfb2; the unchanged full-build database smoke and actual hosted journey remain unproven. Commercial HOLD. See the draft [delivery handover](docs/project-memory/see-document-delivery-handover.md). Mobile PR #451 and both deferred pilots are unchanged.

# Plannera

## Current delivery checkpoint - 29 September 2026

**Commercial HOLD; Production activation is not authorised.** Item 78C's protected
run [36426605240](https://github.com/RobbieTall/Plannera-ab/actions/runs/36426605240)
passed with `READY_FOR_NON_PRODUCTION_ACCEPTANCE`. That synthetic gate does not
prove customer Word/PDF delivery. The current task reconciles presentation PRs
#433/#434/#435 and completes real protected Preview generation, downloads and
reopening for independent Byron/Kempsey projects. Draft presentation, private
persistence and download code now pass 69 focused Linux tests, TypeScript and
the credential-free application build at `0a081d39fd026d2fd7608e8913cc6c666150509d`
([run 36533924975](https://github.com/RobbieTall/Plannera-ab/actions/runs/36533924975)).
Trusted generation, customer UI, an unapplied isolated Preview enum migration and
real hosted delivery remain. The full release-build database smoke is not green.
These changes are in draft PR #452, not merged main; no deployment has occurred.

Read the [current delivery handover](docs/project-memory/see-document-delivery-handover.md) first. Preserve draft PR #450's
acceptance closeout and immutable runner evidence. Older dated status entries
below are historical, not instructions to recreate fixtures or rerun old pins.
Research Viewer (#448) and Project Controls (#449) remain deferred. Keep
Production checkout disabled and Production data/schema unchanged.

Plannera is an AI-powered NSW planning intelligence platform. It turns planning controls, site constraints, and statutory sources into clear, cited, project-specific intelligence for property owners, planners, consultants, and small developers.

## Features

### Address-first free Quick Site Check
The homepage now starts with the usable Plannera Quick Site Check entry: a labelled **Site address** field and **Run free site check** action. The supported launch QA examples are limited to `45 Broken Head Road, Byron Bay NSW 2481` and `52 Belgrave St, Kempsey NSW 2440`. The free check is scoped honestly to cited NSW planning checks for the Byron/Kempsey launch path: site, zone, and property-specific height, floor-space-ratio, and minimum-lot-size values from the official NSW LEP map layers where mapped, with proposal-specific DCP detail following in the Detailed Planning Pack. Submitting the homepage address opens focused Plannera Check mode inside the same requester-scoped project, waits for confirmed site context with LGA plus parcel, coordinate or zoning identity, and reveals the real cited/unavailable property evidence inline. Before promotion, the user supplies a concise proposed-development description. Plannera labels a permissibility pathway `Cited` only when that wording exactly matches one term in the server-verified zone land-use table; fuzzy or ambiguous descriptions remain `Unresolved`. **Create project in Plannera** saves the exact intent and evidence snapshot, then seeds that same wording into the existing Detailed Planning Pack brief. It provides planning information for early scoping and does not replace legal or professional planning advice.

### Workspace Chat
Every assistant response cites the relevant LEP clause (e.g. "Byron LEP 2014 cl. 4.3") when LEP data is available. A "Sources (n)" section appears below each bubble. Each response carries a **confidence badge** (green for score >= 0.7, amber for 0.4-0.69, red for < 0.4).

Additional chat features:
- **Smart follow-up chips** — 2-3 clickable question suggestions generated locally after each reply (no API call)
- **Search/filter** — real-time keyword filter with highlighted matches and message count
- **Relative timestamps** — "2 minutes ago", "just now", updating every minute
- **Transcript export** — copy full conversation as markdown to clipboard
- **Persistent history** — messages survive page refresh; New thread button starts fresh without deleting history

### SEE Builder
The current implementation creates an exact-Detailed-Planning-Pack-bound **pre-SEE planning memo** with cited LEP/DCP evidence and fail-closed provenance. Its progressive workspace preview and `.txt` export are groundwork, not the finished paid SEE product and not a submission-ready claim.

The commercial SEE is a separate one-time product at **A$749 before credits**. It must become a polished, editable DOCX plus professionally rendered PDF assembled from the exact site, proposal, Quick Site Check, Planning Controls Pack, applicable statutory and spatial evidence, user-confirmed facts, uploaded plans/reports, and any returned consultant inputs. A same-scope paid A$49 Planning Controls Pack earns one single-use A$49 SEE credit, producing an A$700 balance for that exact project/site/QSC/proposal scope. The credit is not transferable, reusable, cash-redeemable, or proof of planning readiness. SEE checkout, credit consumption, document compilation, and submission-grade export are roadmap work and are not yet active.

### Project Workspace Intelligence
A persistent sidebar card shows: site address and zone, LGA coverage maturity level, artefact freshness (last generated, stale count), and confidence breakdown from the most recent chat session.

### LGA Coverage Tracking
Real-time polling shows LGA data preparation progress. When an LGA reaches SEARCHABLE_READY, a persistent dismissible in-app notification is surfaced in the workspace. A stale-artefacts banner prompts regeneration when coverage improves.

## Confidence model
Every output carries one of three labels: **Cited** (grounded in retrieved LEP/DCP clause text), **Inferred** (reasoned from planning context — requires professional verification), or **Unavailable** (data not yet reliable for this location). This label appears on Quick Site Check data points and as confidence badges on chat responses.

## Tech stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- NextAuth (magic-link email authentication)
- Prisma with Neon PostgreSQL
- OpenAI for planning assistant and SEE generation workflows

## Planning data pipeline
Plannera bundles 160+ NSW LEP XML fixtures in data/nsw/xml/ covering all NSW LGAs in the bundled corpus.

Ingest LEP data:
POST /api/admin/ingest-lep?secret=INGEST_ADMIN_SECRET[&lga=LGACODE][&force=true]

Safe LEP zone-projection refresh for an already-ingested production corpus:
POST /api/admin/ingest-lep?secret=INGEST_ADMIN_SECRET&lga=BYRON
POST /api/admin/ingest-lep?secret=INGEST_ADMIN_SECRET&lga=KEMPSEY

When current clause rows already exist and `force=true` is omitted, the endpoint keeps the raw clause corpus, rereads the bundled XML, refreshes the shared `LepZoneObjective` / `LepZoneLandUse` projections, and reports `zoneProjectionRefreshes` counts plus explicit refreshed `zoneCodes`, so operators can verify the target zone (for example `SP3` or `E2`) rather than trusting aggregate non-zero counts. Use `force=true` only when intentionally replacing the clause corpus.

Check coverage:
GET /api/admin/ingest-lep?secret=INGEST_ADMIN_SECRET
Returns: { "lepClauseCount": 0, "lgasCovered": [] }

## Live Test LGAs

Byron Shire (Byron Bay) and Kempsey Shire are the two production test LGAs for Plannera. All launch-path features — Quick Site Check, Detailed Planning Pack, Planning Feasibility Summary, SEE Builder, and consultant referral — must work end-to-end with real, cited, site-relevant planning controls for these two councils before auth and paywall features are enabled. Saved artefacts alone do not mean the workspace is commercially ready; readiness depends on the exact current-site, active-proposal evidence chain and successful artefact generation.

**Byron Shire**
- LEP: Byron LEP 2014 (`data/nsw/xml/Byron-lep-2014.xml`) — registered in `instruments.json` as `byron-lep-2014`
- DCP: Byron Shire DCP 2014 — bundled in `public/dcp/byron-dcp-2014-d1-b4.html`, wired in `council-dcp-ingestion.ts`
- SEPPs: All NSW 2021 SEPPs apply state-wide via `DEFAULT_SEPP_SLUGS`
- Coverage status: LEP + DCP ingested; SEPP ingestion required in production DB

**Kempsey Shire**
- LEP: Kempsey LEP 2013 (`data/nsw/xml/Kempsey-lep-2013.xml`) — registered in `instruments.json` as `kempsey-lep-2013`
- DCP: Kempsey DCP 2026 PDF parts — wired through the council DCP ingestion flow as `KEMPSEY_DCP_2026` for searchable DCP chunks (see build-next.md item 24)
- SEPPs: All NSW 2021 SEPPs apply state-wide via `DEFAULT_SEPP_SLUGS`
- Coverage status: LEP + SEPP ingestion still required per environment; Kempsey DCP ingestion is implemented and should be run/verified in the target DB. Quick Site Check structured E2 Commercial Centre controls are exercised with `52 Belgrave St, Kempsey NSW 2440`; `32 Smith St, Kempsey NSW 2440` is an SP2 Infrastructure truth case and must not be used as the E2 QA address.

**To activate both LGAs in production, run:**
```bash
npm run ingest:legislation   # ingests all LEPs including Byron + Kempsey
npm run ingest:sepps         # ingests all NSW SEPPs (state-wide, applies to both LGAs)
```
Then trigger the council DCP ingest via the admin API for Byron and Kempsey:
`POST /api/admin/ingest-council-dcp?lga=BYRON&secret=INGEST_ADMIN_SECRET`
`POST /api/admin/ingest-council-dcp?lga=KEMPSEY&secret=INGEST_ADMIN_SECRET`

## Plannera Check boundary

Plannera Check is Plannera’s mobile-first acquisition surface inside this same Next.js app. It reuses the existing session/requester project, SiteContext, Quick Site Check, Detailed Planning Pack, SEE, referral, evidence, and artefact services; it is not a separate product, subscription, repository, database, or duplicated backend. A free check can live in a session-owned project as an ephemeral technical container, then the user-facing promotion is to create or save that same evidence snapshot as a Plannera project before any later exact project/site/QSC/proposal-bound Planning Controls Pack offer. Provider-neutral purchase/entitlement records and a disabled-by-default human-operated referral-queue foundation now exist. Production pack checkout, SEE checkout/credit consumption, quotas, auth-policy changes, PWA/native work, production entitlement gating, and production consultant delivery remain unavailable until their documented launch decisions and gates are approved.

The shared product path is **Investigate site → free Quick Site Check → A$49 Planning Controls Pack → confirm the intended development → Planning Feasibility and Delivery Plan → direct SEE or consultant-input branch → A$749 SEE before valid credits → optional planner review/submission**. The feasibility layer is a conservative synthesis of the exact saved Quick Site Check and active proposal-bound Planning Controls Pack. It must identify `Required`, `Conditional`, `Recommended`, and `Not identified from current evidence` professional inputs without running a second disconnected planning lookup or making an absolute no-consultant promise.

## Commercial pilot funnel

Near-term revenue is deliberately focused on two paid products in a tight Byron/Kempsey funnel: the **A$49 Planning Controls Pack** and the **A$749 SEE before credits**. The Project Workspace remains the retention layer. The Planning Controls Pack carries the saved Quick Site Check LEP evidence forward, binds a concise proposed-works brief, and separates cited DCP evidence from unresolved topics before feasibility, consultant triage, SEE drafting, or referral. The SEE reuses that exact chain and any accepted project/consultant evidence rather than beginning a second planning answer.

The normal workspace treats the proposed-works brief as part of the active evidence scope. If the user edits the brief after saving a Detailed Planning Pack, the saved pack is shown as proposal-stale for next-action purposes and the workspace prompts regeneration before SEE or expert-review handoff. Normal SEE and expert-review write requests also bind to the selected DPP artefact ID plus expected proposal brief at the server boundary; missing, stale-site, wrong-project, forged-ID, unresolved-for-SEE, or proposal-mismatched inputs fail before persistence rather than falling back to another pack.

Production checkout and auth gating are **not active** for this pilot. Item 72B implements a disabled-by-default Stripe hosted Checkout path for the approved one-time Planning Controls Pack (product `planning_controls_pack`, version `v1`) at A$49.00 total including GST. The protected Byron `45 Broken Head Road` SP3 and Kempsey `52 Belgrave St` E2 acceptance run is complete, and Item 72A’s provider-neutral exact-scope purchase/entitlement foundation is merged. The commercial terms are approved, but production activation still requires operator configuration and explicit launch approval. A paid exact scope may regenerate without another payment; changed project, site, QSC or normalized proposal requires a new purchase. Payment never changes evidence confidence or readiness. Operators can verify one existing project without mutations via `GET /api/admin/commercial-funnel-audit?projectId=<id>` using the `x-admin-token` header with the effective admin token rather than placing secrets in URLs/logs; admin authentication resolves `ADMIN_ACCESS_TOKEN`, then `INGEST_ADMIN_SECRET`, then `ADMIN_SECRET`, so the protected audit secret must match the first configured value. The response is compact, versioned, and reports whether the saved current-site QSC → DPP → SEE/referral provenance chain is ready, unresolved, stale/mismatched, malformed, legacy, or missing. This is an audit tool only: deployment success does not close the live saved-output/commercial gate.

The approved SEE list price is A$749 before credits. For the same exact requester/project/current-site QSC/normalized proposal scope, one settled, unrefunded A$49 Planning Controls Pack may be consumed once as an A$49 SEE credit, leaving A$700 payable. Checkout must show the price, credit, remaining balance, and applicable GST truthfully. A changed project, site, QSC, material proposal, refunded/revoked pack, or previously consumed credit is ineligible. This is an approved product contract only; no SEE purchase, credit ledger, checkout route, entitlement gate, or production activation exists yet.

Operators can run the deterministic two-project live-audit wrapper with `npm run audit:commercial-funnel`. It requires only environment variables: `PLANNERA_AUDIT_BASE_URL`, `PLANNERA_AUDIT_ADMIN_TOKEN`, `PLANNERA_BYRON_PROJECT_ID`, `PLANNERA_KEMPSEY_PROJECT_ID`, and `PLANNERA_AUDIT_EXPECTED_COMMIT`. The runner validates the base URL, sends exactly one header-authenticated read-only `GET` to `/api/admin/commercial-funnel-audit?projectId=...` for Byron and then Kempsey, never puts the token in the URL, never sends a body, never prints raw responses, and emits only an allowlisted JSON summary safe for documentation. Exit code `0` means both approved projects reached an accepted terminal journey; it does not by itself claim strict commercial readiness. Exit code `2` means valid audit responses were received but at least one acceptance gate remains open; `1` means configuration, auth/HTTP/network, JSON, or contract validation failed. Billing, checkout, subscriptions, and auth gating remain deferred until the separate Item 72 operator decisions and launch approval are complete.

Protected remote run path: use the manual **Commercial Funnel Live Audit** GitHub Actions workflow only from `main`. The protected GitHub environment `commercial-funnel-audit` must contain the required secret, `PLANNERA_AUDIT_ADMIN_TOKEN`, and three required variables, `PLANNERA_AUDIT_BASE_URL`, `PLANNERA_BYRON_PROJECT_ID`, and `PLANNERA_KEMPSEY_PROJECT_ID`; do not paste or document their values. Dispatch only after the exact `main` SHA has a green Vercel deployment, choose the confirmation `RUN APPROVED READ-ONLY AUDIT`, and let the workflow derive `PLANNERA_AUDIT_EXPECTED_COMMIT` from the dispatched SHA. The workflow installs dependencies with lifecycle scripts disabled, performs no build, database, Prisma, ingest, generation, OpenAI, or deployment action, and uploads only the validated allowlisted `commercial-funnel-audit-summary` JSON artifact. Operators should download and store only that safe artifact in approved private operational storage; do not copy secrets, raw responses, IDs beyond the configured approved project IDs, or full payloads into chat or docs.

Latest protected evidence (2026-07-24): [Commercial Funnel Live Audit run 30071947827](https://github.com/RobbieTall/Plannera-ab/actions/runs/30071947827) audited deployed merge commit `319fb1a6dfc1aca00e1c68aa7fdb09942aaf3b53` without mutating either approved project. Both Byron and Kempsey reached the truthful `unresolved_pack_referral` terminal journey: their current Quick Site Checks were cited, their exact-bound Detailed Planning Packs retained cited plus unresolved topics, SEE was absent by design, and expert review was the server-derived next action. The run passed with `acceptedJourney: true` and `commercialReady: false`; payment must not relabel that evidence state. Item 72B adds a non-activated Stripe Checkout/webhook implementation and feature-flagged DPP entitlement boundary. No production flag or Stripe secret was set, no live charge was made, and consultant transmission remains inactive.

### Non-production commercial golden gate

Every pull request and push to `main` runs the secret-free **Commercial Funnel Golden Gate** workflow. It installs dependencies without lifecycle scripts, generates the Prisma client without connecting to a database, and runs `npm run test:commercial-funnel`. The focused suite persists deterministic in-memory Byron SP3 and Kempsey E2 Quick Site Check → Detailed Planning Pack → SEE/referral chains through the real artefact services, then evaluates them with the same read-only audit used for production. It also proves that an unresolved DCP topic blocks SEE and produces an unresolved-pack consultant referral without a false readiness claim.

This workflow never receives production secrets, connects to a database, calls OpenAI, retrieves live planning data, builds/deploys the app, creates a production project, or mutates production data. A green deterministic gate is required regression evidence, but it is not a substitute for the protected live saved-output audit and cannot close Item 52 or unlock billing/auth.

Commercial evidence is fail-closed at persistence and handoff boundaries. Saved core LEP controls (height, floor space ratio, and minimum lot size) are re-derived from server-retrieved evidence; client-supplied values, clause references, confidence labels, and interpretations are cleared to `Unavailable` unless server provenance is present. Optional QSC setback, parking, and active-frontage/built-form cards are likewise rebuilt from the server DCP result and cleared when no cited DCP value/ref exists. LEP clause 2.3 is cited only when the saved QSC contains a DB-backed zone table with both objectives and land-use entries. A paid Detailed Planning Pack topic is Cited only when retrieved DCP evidence is site-applicable, has a real clause/source reference, its actual heading/body matches that topic, and the clause body itself contains substantive requirement content. Numeric controls, nil/zero rates, ratios, percentages, or genuine qualitative prescriptions/prohibitions can qualify; headings, refs, topic tags, objectives/overviews/index text, topic lists, and generic “controls apply where relevant” wording cannot satisfy setbacks, parking/access, built-form/frontage, landscaping/open-space, or local-control evidence. A SEE is eligible for audit or consultant handoff only when its proposal summary, copied QSC evidence, DPP clauses and excerpts, and consistency assessments exactly match its source QSC/DPP snapshot. Matching IDs or plausible citation labels alone never establish provenance. In the normal workspace, the current SEE and Expert Review Request cards/readiness are additionally exact-scoped to the active current-site, proposal-matching Detailed Planning Pack: clearing or changing the proposed-works brief fails closed until a matching pack/output is regenerated, while older outputs remain available only as artefact history. DPP DCP citation excerpts are exact qualifying requirement rows only: the row must independently match the topic and contain a substantive quantitative or qualitative control, and unrelated objectives/overview/admin text or other-topic controls are excluded. Those exact excerpts are copied byte-for-byte into SEE controls/source excerpts/prompt grounding and into the Expert Review Request handoff so consultants can inspect the requirement that earned `Cited` without relying on broad clause bodies.

Item 74 evidence intake is in progress. New uploads retain a SHA-256 source hash and explicit extraction/readability and indexing states. PDF page references, DOCX text, XLSX sheets, CSV and plain text can enter the project source index; parser warnings, image-only/scanned files, unsupported legacy formats and indexing failures remain visible and cannot silently support an SEE. The protected Item 74H chain now requires four independently reviewed private roles: current road classification, the registered cadastral plan, a detail survey reconciled to that plan, and a proposed layout bound to the survey. The registered plan controls legal parcel area and road/side/rear setbacks must be promoted from survey measurements. Protected Preview acceptance proved replay, immutable promotion, paid-fixture rejection and zero residue; Production checkout remains disabled and the Preview-only schema/writers do not run in Production. Real registered-plan execution, OCR, broader spatial/map interpretation, complete DOCX/PDF acceptance and final commercial activation remain open gates.

### Privacy-minimal funnel measurement

Plannera's commercial funnel measurement is a first-party, fixed-schema event ledger, not a third-party analytics SDK. Successful persisted transitions are recorded only after the server confirms the exact project/output write. Copy and download events are accepted only after the server re-resolves requester access and the exact saved Expert Review Request. The ledger has no free-form properties and cannot store addresses, parcel/coordinate data, proposal or chat text, clause excerpts, names, email addresses, contact details, uploaded content, secrets, or payment data.

Events use a versioned taxonomy and database-unique idempotency keys, expire after 90 days, and are deleted by both opportunistic pruning and the authenticated daily Vercel retention job. Project or linked artefact deletion cascades to its events. Preview, test, demo-project, server-allowlisted internal/golden-project, and development-bypass activity is server-classified and excluded from customer conversion reporting. The admin metrics endpoint accepts `x-admin-token` only and returns aggregate unique-project counts and cohort conversion rates, never project/user identifiers.

Production collection is off by default. Enable it only after the schema migration is deployed and both `COMMERCIAL_FUNNEL_ENABLED=true` and a random `CRON_SECRET` of at least 16 characters are configured for Production. Vercel supplies that secret to `/api/cron/commercial-funnel-retention` as a bearer token. The public disclosure is available at `/privacy`.

## Planning Controls Pack checkout (implemented, not activated)

Item 72C provides a protected, manual-only Stripe test-mode acceptance workflow and [operator runbook](docs/operations/stripe-test-mode-acceptance.md). Its 2026-08-02 execution completed `before_payment`, corrected `paid`, and `refunded` phases on one dedicated Checkout, proving the Australian A$49.00 total and A$4.45 GST, signed-webhook settlement, exact entitlement, negative cross-scope cases, one DPP creation, duplicate denial, full-refund reconciliation and entitlement removal while retaining only privacy-safe artifacts. A redirect never granted access. Code deployed remains distinct from checkout enabled; Production must keep `PLANNING_PACK_CHECKOUT_ENABLED` false/absent until a separate explicitly approved activation PR.

When `PLANNING_PACK_CHECKOUT_ENABLED=true`, authenticated checkout and exact-scope status routes re-resolve requester ownership, the current site, a cited current-site Quick Site Check and the normalized proposal on the server. Only a signature-verified Stripe webhook with matching payment mode, paid status, exact A$49.00 amount, AUD currency, Checkout session and opaque purchase reference can settle payment and activate entitlement; the hosted success redirect cannot. The DPP generation route then denies missing, refunded, revoked or mismatched entitlement before generation/persistence. When the flag is false or absent, existing free DPP behavior is unchanged and Stripe secrets are unnecessary.

Checkout requests Stripe automatic tax calculation, requires a billing address, and keeps the customer total at A$49.00 with inclusive tax behavior. Before activation, operators must configure and verify Stripe Tax registration/settings and an appropriate default product tax code in Stripe; no tax code is hard-coded by Plannera. The protected Stripe test-mode acceptance must prove the Australian case itemises A$4.45 GST within the A$49.00 total. “GST included” applies where Stripe determines Australian GST is applicable from the verified tax configuration and billing location.

If a system or retrieval failure prevents generation and persistence of the promised pack, an operator must issue a full refund to the original payment method through Stripe. Record the opaque payment/refund references only, wait for a signed provider confirmation carrying the opaque purchase/payment references (`refund.created`, `refund.updated`, or a fully refunded charge), and verify the purchase is `REFUNDED` and entitlement inactive. Do not expose a customer refund route and do not mark a refund complete from an operator request alone. A truthful persisted pack with cited and unresolved topics is delivered value and proceeds to expert review rather than automatic refund. Partial refunds and contradictory verified money events are not acknowledged as successful lifecycle completion: they remain retryable reconciliation failures rather than silently changing access.

## Consultant referral queue (implemented, not activated)

The exact current Quick Site Check and Planning Controls Pack now derive a cited consultant-needs matrix and discipline-specific referral briefs inside the saved Expert Review Request. Identified disciplines are labelled `Required`, `Conditional`, or `Recommended`; unassessed hazard and specialist triggers remain `Not identified from current evidence` with an explicit warning that this does not mean they are unnecessary.

With direct submission enabled, the user supplies only a contact name and email and must explicitly consent to storage, follow-up, and manual sharing if Plannera assigns the request. The server re-resolves ownership plus exact current site, proposal, QSC, DPP and optional SEE provenance before storing one immutable package snapshot and audit ledger for the exact scope. The UI separately reports package saved, submitted to Plannera, sent to consultant and consultant acknowledged. Copy/download never advances delivery.

The first delivery target is a truthful human-operated Plannera queue. It does not claim automated matching, consultant availability, credential verification, competing quotes or response times. Submission is fail-closed unless both `CONSULTANT_REFERRALS_ENABLED=true` and `CONSULTANT_REFERRAL_QUEUE_TARGET=plannera_human_queue` are configured. Protected non-production run [30772575070](https://github.com/RobbieTall/Plannera-ab/actions/runs/30772575070) proved consented submission, immutable package integrity, operator-queue visibility, the exact ordered delivery lifecycle, redacted user status and cleanup against the isolated Item 73 Preview. Production activation is still not approved and its referral flags remain false/absent. Follow the [operator runbook](docs/operations/consultant-referral-queue.md) for any future acceptance or separately approved activation.

## Environment variables

Required:
- DATABASE_URL — PostgreSQL connection string (Prisma/Neon)
- NEXTAUTH_URL — public base URL for NextAuth callbacks
- NEXTAUTH_SECRET — signing secret for NextAuth cookies
- EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM — SMTP for magic-link email
- OPENAI_API_KEY — OpenAI API key
- INGEST_ADMIN_SECRET — shared secret for LEP ingest endpoints

Optional:
- GOOGLE_MAPS_API_KEY — address/geocoding support
- NSW_PROPERTY_API_* — NSW property API configuration
- COMMERCIAL_FUNNEL_ENABLED — set to `true` only after the first-party event migration and retention configuration are deployed
- CRON_SECRET — random secret used by Vercel to authenticate the daily commercial-funnel retention job; required before measurement can record
- COMMERCIAL_FUNNEL_EXCLUDED_PROJECT_IDS — optional comma-separated internal or public IDs for approved golden/internal projects; configured server-side and never accepted from a browser
- CONSULTANT_REFERRALS_ENABLED — set to `true` only on the approved acceptance target; Production remains false/absent until separate launch approval
- CONSULTANT_REFERRAL_QUEUE_TARGET — must equal `plannera_human_queue` on the same approved target or direct submission remains unavailable

## Local development

npm install
npm run dev

App runs at http://localhost:3000. Before testing LEP-grounded features, set DATABASE_URL and run the ingest endpoint with INGEST_ADMIN_SECRET.

## Available scripts
- npm run dev — Start development server
- npm run build — Production build
- npm run lint — ESLint check
- npm test — Run the full compatible test suite (Node runner + Vitest)
- npm run test:node — Run Node test-runner tests under tests/*.test.ts
- npm run test:vitest — Run the Vitest suite (src tests and compatible React tests)
- npm run accept:consultant-referral — Run the protected, fail-closed non-production referral acceptance runner

## Deployment and database change safety

Vercel builds are schema-read-only. They generate the Prisma client, run the Byron/Kempsey read-only launch smoke, and compile the application; they do not run `prisma db push` or migrations. Database and data changes require a dedicated reviewed plan, isolated non-production verification, and separate explicit approval before any Production operation. Never copy database connection values into GitHub, documentation, chat, logs, artifacts, or tracked files.

See [Database change control](docs/operations/database-change-control.md) and the [Byron/Kempsey soft-launch gate](docs/operations/soft-launch-gate.md).


## Progressive project evidence

Planning work can begin before every survey or consultant report exists. The A$49 Planning Controls Pack and A$749 working SEE retain unresolved evidence visibly and regenerate on the same purchased project as stronger evidence arrives.

The protected Item 74H proof also introduces permission-aware DA History Assist for Byron: it can identify relevant public application records and classify their likely evidentiary role, but it does not bulk-copy Council documents or treat an earlier approval as current law. Selected documents require a permitted integration or customer-supplied private upload, and current LEP/DCP/spatial controls are independently replayed. Production checkout remains disabled.


## Protected end-to-end commercial journey

Item 77 composes the accepted commercial contracts into one protected non-production customer journey: Property Check, Stripe test-mode A$49 Planning Controls Pack, one persistent exact-scope project, later evidence and regeneration, one single-use A$49 credit, and the A$749 working SEE with DOCX/PDF outputs. The real SEE panel now lets customers expand and reduce long DCP clauses without losing the concise overview.

This composition does not activate Production checkout. A fresh protected Stripe lifecycle and exact-head Preview acceptance must pass before pilot readiness is claimed.

## Item 78A: durable same-project commercial bridge

Item 78A implements the protected Preview-only acceptance bridge from a real Stripe test-mode paid A$49 Planning Controls Pack to later reviewed evidence, regeneration on the same persisted project, a single-use A$49 credit, and working A$749 SEE DOCX/PDF outputs.

- The source pack must be a real paid test-mode purchase with its active entitlement and exactly one matching persisted DPP.
- Requester, project, site, QSC, proposal digest, evidence digest, and version are bound and checked server-side.
- Synthetic private evidence passes through intake, malware-scan observation, operator review, and promotion boundaries; mismatch, pending-review, replay, and changed-evidence cases fail closed.
- The working SEE remains visibly `NOT SUBMISSION READY`, requires operator review, and does not replace the Item 78B canonical SEE compiler work.
- Acceptance creates only deterministic synthetic SEE-side records and removes all of them, while leaving the real paid pack and customer project untouched.
- The protected workflow separately proves the real private Blob and malware-scan lifecycle before running the commercial bridge.
- Production checkout remains disabled. No production payment, deployment, secret mutation, refund, or customer record mutation is performed.

Implementation and protected hosted acceptance are complete. PR #390 merged at `22df069c007f116d5fe7c66e06a86d7f9057cdc2`; protected run #34565128134 passed every bridge check with zero synthetic database and object residue. Production remained disabled.

## Future evidence-aware concept design

After the protected Item 77 commercial journey is proven, Plannera may extend the same persistent project into an evidence-aware concept design workspace. A customer can upload a rough sketch, photograph or marked-up plan with dimensions; Plannera extracts and asks the customer to confirm those declared measurements, then a deterministic geometry service produces a clean scaled concept that can be refined against cited planning controls. Model reasoning may orchestrate extraction and design changes, but it is not the geometric authority. Every dimension retains its source and confidence, conflicting or missing measurements remain visible, and generated SVG/PDF/DXF material is labelled concept-only until an appropriate surveyor, designer or other professional confirms it for submission use. See [Evidence-aware concept design](docs/product/evidence-aware-concept-design.md).


## Item 78B: canonical world-class SEE compiler

Issue #391 integrates the flexible standard in `docs/product/see-builder-standard.md` with the existing server-authoritative DPP-to-SEE path.

- Eight evidence-required core sections now include an explicit section 4.15 synthesis rather than a rigid standalone mitigation chapter.
- Application history, assessment pathway/referrals, variations and appendices are included only when relevant cited evidence is supplied.
- Specialist findings, recommendations, page references, limitations and conflicts are integrated into the relevant environmental-effects reasoning.
- Potential departures without dedicated merit evidence, cross-scope specialist reports, unknown citations and unresolved specialist conflicts fail closed.
- The existing `/api/artefacts/generate-see` response remains compatible and persists a versioned canonical compilation alongside the legacy working-memo fields.
- Existing saved memos remain readable. Finality still depends on evidence, rendered outputs and operator review.
- Production checkout and Production mutation remain disabled.

## Item 78C: Byron and Kempsey whole-funnel acceptance

Status: **PREVIEW INFRASTRUCTURE CONFIGURED / FINAL RUN INPUTS PENDING / NOT EXECUTED** (2026-09-13).

Item 78C is the protected commercial acceptance gate built on the existing Item 78A payment bridge, Item 78B canonical SEE compiler, private evidence pipeline and consultant-referral workflow. The implementation is merged on `main` at `02b9d4f11ba535066edb5bcdf5ea39a1727bc481`. Hosted acceptance remains pinned to branch `accept/item-78c-byron-kempsey-20260911` at exact commit `404e5a5314e40b2ecbdd6d5a8c694d705d07ecf8`; the branch has no commit drift.

Confirmed configuration:

- the Byron and Kempsey GitHub environments exist and each permits only the exact acceptance branch;
- the isolated Preview Neon branch is ready and is not the primary/default branch;
- the Vercel checkout, Stripe test webhook, consultant-referral and admin settings are scoped only to the exact acceptance branch;
- the Stripe endpoint is test-mode only and targets the exact Preview host;
- Production checkout remains disabled and Production data/schema are outside this acceptance.

Remaining before dispatch:

- redeploy the exact Preview commit so the final branch-only Vercel settings are active;
- provide a fresh short-lived Vercel Sandbox credential to both protected GitHub environments immediately before the run;
- create and pay separate Stripe test-mode sessions for Byron and Kempsey and save each session ID only in its matching environment;
- complete the Kempsey consultant admin/session credentials;
- dispatch the protected workflow and inspect representative DOCX/PDF output.

The release decision is **HOLD** until the workflow produces `READY_FOR_NON_PRODUCTION_ACCEPTANCE`. Configuration alone is not acceptance evidence. Historical variables with the same names but a different branch scope are isolated settings, not duplicate Item 78C values.

## Item 78C security checkpoint (2026-09-14)

- PR #397 merged to `main` as `ae63ee208c938907d7342b058735baf8620c6f43` after all four GitHub checks, a Ready Vercel Preview and an independent exact-commit security review passed.
- Authenticated identity now comes only from revocable database-backed NextAuth sessions. The `np_session` cookie is anonymous browser continuity only, and targeted project claiming requires the exact originating anonymous session.
- The preserved acceptance branch `accept/item-78c-byron-kempsey-20260911` and SHA `404e5a5314e40b2ecbdd6d5a8c694d705d07ecf8` predate this correction. They are **superseded and must not be dispatched or reported as current acceptance evidence**.
- Item 78C remains **HOLD**. The exact blocker is approval and creation of a new immutable non-production acceptance snapshot from corrected `main`, followed by re-pinning both protected council environments and completing the independent paid test journeys and rendered-output review.
- Production checkout remains disabled. No Production data or schema mutation is authorized.
