# Plannera

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
