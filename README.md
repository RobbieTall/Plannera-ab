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

Check coverage:
GET /api/admin/ingest-lep?secret=INGEST_ADMIN_SECRET
Returns: { "lepClauseCount": 0, "lgasCovered": [] }

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
- npm test — Run vitest test suite
