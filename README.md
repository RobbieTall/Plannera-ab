# Plannera

Plannera is an AI-powered NSW planning intelligence platform for property owners, planners, consultants, designers, and small developers who need fast, source-aware planning clarity before they commit time or money.

The product is built around a simple loop:

1. **Address entry** — the user starts with a NSW property address.
2. **Quick Site Check** — Plannera resolves the site and returns real LEP zone and permissibility intelligence.
3. **Grounded workspace chat** — the assistant answers planning questions using retrieved LEP clauses and available DCP material.
4. **SEE artefact builder** — Plannera drafts Statement of Environmental Effects content from the project context and statutory sources.
5. **Export** — users copy or export grounded outputs for review and further project work.

## Tech stack

- **Next.js 14 App Router**
- **TypeScript**
- **Tailwind CSS**
- **NextAuth** for authentication
- **Prisma** with **Neon PostgreSQL**
- **OpenAI** for planning assistant and document-generation workflows

## Planning data pipeline

Plannera bundles 160+ NSW LEP XML fixtures in `data/nsw/xml/`, covering all NSW LGAs represented by the local XML corpus.

LEP ingestion is handled by the admin endpoint:

```http
POST /api/admin/ingest-lep?secret=INGEST_ADMIN_SECRET[&lga=LGACODE][&force=true]
```

The ingestion pipeline parses the bundled LEP XML files and stores current LEP provisions in the Prisma `Clause` records for LEP instruments. DCP provisions are stored in the `DCPClause` table and are retrieved separately for local development-control grounding.

To inspect current LEP database coverage:

```http
GET /api/admin/ingest-lep?secret=INGEST_ADMIN_SECRET
```

The GET response returns:

```json
{ "lepClauseCount": 0, "lgasCovered": [] }
```

## LGA coverage

Plannera’s NSW LEP coverage is fixture-backed across the bundled NSW XML set in `data/nsw/xml/`. Use the ingest endpoint above to seed LEP data into the connected database before relying on Quick Site Check or workspace-chat clause grounding in an environment.

## Environment variables

Required for a production-like deployment:

- `DATABASE_URL` — PostgreSQL connection string for Prisma/Neon.
- `NEXTAUTH_URL` — public base URL for NextAuth callbacks.
- `NEXTAUTH_SECRET` — secret for signing NextAuth cookies and tokens.
- `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` — SMTP configuration for magic-link email.
- `OPENAI_API_KEY` — OpenAI API key for assistant and generation workflows.
- `INGEST_ADMIN_SECRET` — shared secret protecting LEP ingestion endpoints.

Optional integrations:

- `GOOGLE_MAPS_API_KEY` — optional address/geocoding support.
- `NSW_PROPERTY_API_*` — optional NSW property API configuration when live property feeds are enabled.

## Available scripts

```bash
npm run dev
npm run build
npm run lint
npm test
```

Additional data and operational scripts exist for ingestion, NSW data checks, and smoke tests, but the commands above are the core development/build checks.

## Local development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

Before testing LEP-grounded features against a database, ensure `DATABASE_URL` is set and run the LEP ingestion endpoint with `INGEST_ADMIN_SECRET`.
