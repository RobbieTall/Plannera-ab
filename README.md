# Plannera

Plannera is an AI-powered NSW planning intelligence platform. It turns planning controls, site constraints, and statutory sources into clear, cited, project-specific intelligence for property owners, planners, consultants, and small developers.

## Features

### Quick Site Check
Real LEP zone identification, permissibility table (permitted / prohibited / consent required), and key development standards (height limit, FSR, minimum lot size) — sourced from ingested LEP clause data, not AI guessing. Each data point carries a **Cited**, **Inferred**, or **Unavailable** confidence label. Results in under 5 seconds.

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
