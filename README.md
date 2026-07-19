# Plannera

Plannera is an AI-powered NSW planning intelligence platform. It turns planning controls, site constraints, and statutory sources into clear, cited, project-specific intelligence for property owners, planners, consultants, and small developers.

## Features

### Address-first free Quick Site Check
The homepage now starts with the usable Plannera Quick Site Check entry: a labelled **Site address** field and **Run free site check** action. The supported launch QA examples are limited to `45 Broken Head Road, Byron Bay NSW 2481` and `52 Belgrave St, Kempsey NSW 2440`. The free check is scoped honestly to cited NSW planning checks for the Byron/Kempsey launch path: site, zone, and property-specific height, floor-space-ratio, and minimum-lot-size values from the official NSW LEP map layers where mapped, with proposal-specific DCP detail following in the Detailed Planning Pack. Submitting the homepage address opens focused Plannera Check mode inside the same requester-scoped project, waits for confirmed site context with LGA plus parcel, coordinate or zoning identity, reveals the real cited/unavailable evidence inline, and uses **Create project in Plannera** to save that exact Quick Site Check snapshot before continuing into the full workspace. It provides planning information for early scoping and does not replace legal or professional planning advice.

### Workspace Chat
Every assistant response cites the relevant LEP clause (e.g. "Byron LEP 2014 cl. 4.3") when LEP data is available. A "Sources (n)" section appears below each bubble. Each response carries a **confidence badge** (green for score >= 0.7, amber for 0.4-0.69, red for < 0.4).

Additional chat features:
- **Smart follow-up chips** — 2-3 clickable question suggestions generated locally after each reply (no API call)
- **Search/filter** — real-time keyword filter with highlighted matches and message count
- **Relative timestamps** — "2 minutes ago", "just now", updating every minute
- **Transcript export** — copy full conversation as markdown to clipboard
- **Persistent history** — messages survive page refresh; New thread button starts fresh without deleting history

### SEE Builder
User clicks **Generate SEE** to generate a Statement of Environmental Effects via POST /api/artefacts/generate-see with real LEP + DCP grounding. Sections reveal progressively (~400ms each). Completed SEE can be:
- Copied to clipboard (full structured plain text)
- Downloaded as .txt (filename: see-[address].txt)
- Regenerated at any time

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

Byron Shire (Byron Bay) and Kempsey Shire are the two production test LGAs for Plannera. All features — Quick Site Check, Workspace Chat, SEE Builder, and Basic Feasibility — must work end-to-end with real, cited, site-relevant planning controls for these two councils before auth and paywall features are enabled. Saved artefacts alone do not mean the workspace is commercially ready; readiness depends on current-site, quality-valid evidence and successful artefact generation.

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

Plannera Check is Plannera’s mobile-first acquisition surface inside this same Next.js app. It reuses the existing session/requester project, SiteContext, Quick Site Check, Detailed Planning Pack, SEE, referral, evidence, and artefact services; it is not a separate product, subscription, repository, database, or duplicated backend. A free check can live in a session-owned project as an ephemeral technical container, then the user-facing promotion is to create or save that same evidence snapshot as a Plannera project before any later project/site/proposal-bound DCP Deep Dive offer. Pricing, checkout, credits, quotas, entitlements, auth-policy changes, PWA/native work, and consultant sending remain deferred.

The workspace now makes the shared planning path visible as **Site → Quick Site Check → Detailed Planning Pack → SEE / consultant handoff**. The navigator reflects the existing evidence-derived commercial next action and exact current-site/proposal/DPP selectors; it does not add pricing, readiness claims, or a separate certainty score.

## Commercial pilot funnel

Near-term revenue is deliberately focused on a tight Byron/Kempsey funnel: **Site → free Quick Site Check → proposal-aware, cited Detailed Planning Pack → consultant-ready SEE/referral**. The Project Workspace remains the retention layer, but the sellable step is now the Detailed Planning Pack, persisted as its own `detailed_planning_pack` artefact type: it carries the saved Quick Site Check LEP evidence forward, asks for a concise proposed-works brief, and separates cited DCP evidence from unresolved topics before SEE/referral.

The normal workspace treats the proposed-works brief as part of the active evidence scope. If the user edits the brief after saving a Detailed Planning Pack, the saved pack is shown as proposal-stale for next-action purposes and the workspace prompts regeneration before SEE or expert-review handoff. Normal SEE and expert-review write requests also bind to the selected DPP artefact ID plus expected proposal brief at the server boundary; missing, stale-site, wrong-project, forged-ID, unresolved-for-SEE, or proposal-mismatched inputs fail before persistence rather than falling back to another pack.

Payments, subscriptions, checkout, and auth gating are **not active** for this pilot. Item 40 remains deferred until the Byron `45 Broken Head Road` SP3 and Kempsey `52 Belgrave St` E2 golden cases pass saved-output and live-verification quality gates. Operators can verify one existing project without mutations via `GET /api/admin/commercial-funnel-audit?projectId=<id>` using the `x-admin-token` header with the effective admin token rather than placing secrets in URLs/logs; admin authentication resolves `ADMIN_ACCESS_TOKEN`, then `INGEST_ADMIN_SECRET`, then `ADMIN_SECRET`, so the protected audit secret must match the first configured value. The response is compact, versioned, and reports whether the saved current-site QSC → DPP → SEE/referral provenance chain is ready, unresolved, stale/mismatched, malformed, legacy, or missing. This is an audit tool only: deployment success does not close the live saved-output/commercial gate.

Operators can run the deterministic two-project live-audit wrapper with `npm run audit:commercial-funnel`. It requires only environment variables: `PLANNERA_AUDIT_BASE_URL`, `PLANNERA_AUDIT_ADMIN_TOKEN`, `PLANNERA_BYRON_PROJECT_ID`, `PLANNERA_KEMPSEY_PROJECT_ID`, and `PLANNERA_AUDIT_EXPECTED_COMMIT`. The runner validates the base URL, sends exactly one header-authenticated read-only `GET` to `/api/admin/commercial-funnel-audit?projectId=...` for Byron and then Kempsey, never puts the token in the URL, never sends a body, never prints raw responses, and emits only an allowlisted JSON summary safe for documentation. Exit code `0` means both independent golden chains passed; `2` means valid audit responses were received but at least one commercial gate remains open; `1` means configuration, auth/HTTP/network, JSON, or contract validation failed. Billing, checkout, subscriptions, and auth gating remain deferred until approved live results pass this gate.

Protected remote run path: use the manual **Commercial Funnel Live Audit** GitHub Actions workflow only from `main`. The protected GitHub environment `commercial-funnel-audit` must contain the required secret, `PLANNERA_AUDIT_ADMIN_TOKEN`, and three required variables, `PLANNERA_AUDIT_BASE_URL`, `PLANNERA_BYRON_PROJECT_ID`, and `PLANNERA_KEMPSEY_PROJECT_ID`; do not paste or document their values. Dispatch only after the exact `main` SHA has a green Vercel deployment, choose the confirmation `RUN APPROVED READ-ONLY AUDIT`, and let the workflow derive `PLANNERA_AUDIT_EXPECTED_COMMIT` from the dispatched SHA. The workflow installs dependencies with lifecycle scripts disabled, performs no build, database, Prisma, ingest, generation, OpenAI, or deployment action, and uploads only the validated allowlisted `commercial-funnel-audit-summary` JSON artifact. Operators should download and store only that safe artifact in approved private operational storage; do not copy secrets, raw responses, IDs beyond the configured approved project IDs, or full payloads into chat or docs.

Latest protected evidence (2026-07-16): [Commercial Funnel Live Audit run 29494711998](https://github.com/RobbieTall/Plannera-ab/actions/runs/29494711998) audited deployed merge commit `5cb75a51894aab40e701bff4d3f541cbff85e71d` after the Item 54 identity hardening. It authenticated and returned controlled exit `2`: both approved projects passed project/address/LGA/zone identity validation, but each had no saved current-site Quick Site Check, Detailed Planning Pack, or SEE artefact, so referral eligibility remained `none`. The safe artifact is `8373903558` with digest `sha256:603372049b35dda723645bf15b392b753e3a023796d8b6d79a12f58783a1ca32`. The commercial and billing/auth gates remain open; the missing chains must be generated through the normal product workflow with real proposal briefs, never fabricated or backfilled by the audit.

### Non-production commercial golden gate

Every pull request and push to `main` runs the secret-free **Commercial Funnel Golden Gate** workflow. It installs dependencies without lifecycle scripts, generates the Prisma client without connecting to a database, and runs `npm run test:commercial-funnel`. The focused suite persists deterministic in-memory Byron SP3 and Kempsey E2 Quick Site Check → Detailed Planning Pack → SEE/referral chains through the real artefact services, then evaluates them with the same read-only audit used for production. It also proves that an unresolved DCP topic blocks SEE and produces an unresolved-pack consultant referral without a false readiness claim.

This workflow never receives production secrets, connects to a database, calls OpenAI, retrieves live planning data, builds/deploys the app, creates a production project, or mutates production data. A green deterministic gate is required regression evidence, but it is not a substitute for the protected live saved-output audit and cannot close Item 52 or unlock billing/auth.

Commercial evidence is fail-closed at persistence and handoff boundaries. Saved core LEP controls (height, floor space ratio, and minimum lot size) are re-derived from server-retrieved evidence; client-supplied values, clause references, confidence labels, and interpretations are cleared to `Unavailable` unless server provenance is present. Optional QSC setback, parking, and active-frontage/built-form cards are likewise rebuilt from the server DCP result and cleared when no cited DCP value/ref exists. LEP clause 2.3 is cited only when the saved QSC contains a DB-backed zone table with both objectives and land-use entries. A paid Detailed Planning Pack topic is Cited only when retrieved DCP evidence is site-applicable, has a real clause/source reference, its actual heading/body matches that topic, and the clause body itself contains substantive requirement content. Numeric controls, nil/zero rates, ratios, percentages, or genuine qualitative prescriptions/prohibitions can qualify; headings, refs, topic tags, objectives/overviews/index text, topic lists, and generic “controls apply where relevant” wording cannot satisfy setbacks, parking/access, built-form/frontage, landscaping/open-space, or local-control evidence. A SEE is eligible for audit or consultant handoff only when its proposal summary, copied QSC evidence, DPP clauses and excerpts, and consistency assessments exactly match its source QSC/DPP snapshot. Matching IDs or plausible citation labels alone never establish provenance. In the normal workspace, the current SEE and Expert Review Request cards/readiness are additionally exact-scoped to the active current-site, proposal-matching Detailed Planning Pack: clearing or changing the proposed-works brief fails closed until a matching pack/output is regenerated, while older outputs remain available only as artefact history. DPP DCP citation excerpts are exact qualifying requirement rows only: the row must independently match the topic and contain a substantive quantitative or qualitative control, and unrelated objectives/overview/admin text or other-topic controls are excluded. Those exact excerpts are copied byte-for-byte into SEE controls/source excerpts/prompt grounding and into the Expert Review Request handoff so consultants can inspect the requirement that earned `Cited` without relying on broad clause bodies.

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
