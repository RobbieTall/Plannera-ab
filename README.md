# Plannera.ai - AB Version

AI-powered property development platform that generates council documents, feasibility reports, and guides users through development milestones.

## Tech Stack

- Next.js 14 with the App Router
- TypeScript
- Tailwind CSS 3
- NextAuth.js for passwordless authentication
- Prisma ORM with a PostgreSQL database
- ESLint & Prettier defaults from Next.js

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables by copying `.env.example` to `.env` and filling in the values for:

   - `DATABASE_URL` – PostgreSQL connection string (see the [Database setup](#database-setup) section for the exact retrieval steps)
   - `NEXTAUTH_URL` – the public base URL of your app (e.g. `http://localhost:3000` in development)
   - `NEXTAUTH_SECRET` – secret for signing NextAuth cookies/tokens
   - `EMAIL_SERVER_*` & `EMAIL_FROM` – SMTP credentials for sending magic links

3. Start the development server:

   ```bash
   npm run dev
   ```

The app runs on [http://localhost:3000](http://localhost:3000).

### Authentication flows

- Visit `/signin` to request a passwordless magic link.
- `/dashboard` is protected by middleware and requires an authenticated session.
- Use the magic-link email sent by NextAuth to sign in; the dashboard displays basic session details and provides a sign-out action.

### Available Scripts

- `npm run dev` – start the Next.js development server.
- `npm run build` – generate the Prisma client and create an optimized production build.
- `npm run start` – start the production server after building.
- `npm run lint` – run ESLint using the Next.js configuration.

### Deploying to Vercel

Configure these environment variables in your Vercel project settings so the deployment build succeeds and authentication remains functional:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`
- `EMAIL_FROM`

Vercel runs `npm run build` during deployment, which now executes `prisma generate` before `next build` to ensure the Prisma client is available at build time.

## Database setup

This project uses Prisma with a PostgreSQL database hosted on Vercel/Neon. Because `.env*` files are git-ignored, keep sensitive URLs out of commits and source them locally instead.

1. **Retrieve production secrets from Vercel.** From a network that can reach Vercel run:

   ```bash
   npm i -g vercel
   vercel login                # follow the browser prompt
   vercel link                 # run inside the repo to link to the Plannera project
   vercel env pull .env.local  # grabs DATABASE_URL + friends for local use
   ```

   If CLI access is unavailable, copy the `DATABASE_URL` (and optional `DATABASE_URL_UNPOOLED`) directly from **Vercel → Project → Settings → Environment Variables**. The format is `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`.

2. **Store the secrets locally.** The recommended file for local development is `.env.local`:

   ```bash
   # .env.local (never commit this)
   DATABASE_URL="postgresql://...pooler.../neondb?sslmode=require"
   DATABASE_URL_UNPOOLED="postgresql://...primary.../neondb?sslmode=require"
   PGHOST="ep-...-pooler.ap-southeast-2.aws.neon.tech"
   ```

   Prisma automatically reads `.env` and `.env.local`, so no additional wiring is required.

3. **(Optional) expose a direct connection string.** If you prefer to keep the pooled URL in `DATABASE_URL`, set `PRISMA_DIRECT_URL` (or configure `directUrl` in `prisma/schema.prisma`) to point at the non-pooled Neon host for schema pushes/migrations.

## Prisma workflows

All Prisma commands assume a valid `DATABASE_URL` is present in your environment.

- Generate (or re-generate) the Prisma client after schema edits:

  ```bash
  npx prisma generate
  ```

- Push the schema to the connected Neon database without generating a migration:

  ```bash
  npx prisma db push
  ```

- For local Postgres instances or if you need repeatable migrations, use:

  ```bash
  npx prisma migrate dev --name descriptive-name
  ```

> **Limitation / manual step:** Outbound traffic to TCP 5432 is blocked from this Codespaces-style environment, so `npx prisma db push` cannot reach the Neon host (`P1001`). Run the same command locally (or in CI) after adding the production `DATABASE_URL` to `.env.local` to materialize the tables. Once the push succeeds you can confirm the tables in Neon via `psql`/Prisma Studio.

## Project Status

Initializing fresh AB version with focus on:

- Modular, testable components
- Clean separation of concerns
- Robust architecture to avoid fragility

This foundation provides an opinionated landing experience that can be extended into the full Plannera.ai product.

## Landing Experience Updates

The root landing page now showcases the chat-first property development assistant described in the project brief:

- Hero section with AI-focused messaging, large chat input, and curated example prompts.
- Quick stats strip highlighting DA timeline tracking, document templates, and the consultant directory.
- Interactive assistant that parses project descriptions, pulls mock council data, and renders requirements, documents, timelines, budgets, and approval hurdles.
- Sign-up gate that allows a single free exploration before prompting users to create an account for downloads, exports, shares, or adding a second project.

### Mock Data + Parsing

Planning logic is decoupled into two files for simple future swaps:

- `src/lib/project-parser.ts` – lightweight heuristics to extract location, development type, and scale from free-text descriptions. Update the keyword lists or parsing rules here as your use cases expand.
- `src/lib/mock-planning-data.ts` – council requirement/timeline/budget mocks keyed by location. Replace the in-memory profiles with API calls or database lookups without changing the UI.

`PlanningAssistant` (in `src/components/landing/planning-assistant.tsx`) consumes both helpers, so integrating a real knowledge base only requires swapping the data providers.

## Workspace + Dashboard Enhancements

- **Navigation + Dashboard.** Every workspace now includes a persistent "← My Projects" button that returns to the `/dashboard` overview. The new dashboard lists all mock projects (name, type, location, created date), shows the remaining free project allowance, and links back to the landing page for new project creation.
- **Single-click project generation.** The landing "Generate planning pathway" button fires immediately, shows a loading indicator, and records the newly generated project/chat history in the shared experience store. Anonymous users see the "You've used your 1 free project" modal if they attempt a second workspace.
- **Chat persistence.** Initial project descriptions and AI summaries are saved as `WorkspaceMessage[]` via the `ExperienceProvider`. When a workspace loads, the chat panel replays that conversation and keeps it in scope for subsequent prompts.
- **Free vs paid limits.** Anonymous visitors receive 1 project and 0 uploads. Signed-in free plans unlock 5 uploads and limited tool runs, while Pro (or mocked authenticated) plans have higher caps. The dashboard, sources panel, and modals surface these usage indicators.
- **Sources & uploads.** The Sources panel enforces upload limits, supports the requested file types (PDF, Word, Excel, JPEG/PNG, email, and GIS formats), parses lightweight context when possible, and feeds that context into chat responses.
- **Tools & artefacts.** All six tools are marked as Pro with usage gating. Anonymous users are prompted to sign up, free users have limited runs, and Pro unlocks full access. "Save Chat" captures the conversation as a chat artefact, while a rich-text note editor replaces the tools panel when drafting new notes.
- **Documented state management.** A reusable `ExperienceProvider` (in `src/components/providers/experience-provider.tsx`) tracks project usage, uploads, artefacts, tool runs, and chat history in localStorage so navigation between landing, dashboard, and workspace stays consistent.

### File upload specification

- Allowed types: `.pdf`, `.doc/.docx`, `.xls/.xlsx`, `.csv`, `.jpg/.jpeg/.png`, `.eml/.msg`, `.shp/.kml/.geojson`, `.txt`.
- Anonymous: 0 uploads, prompted to sign up immediately.
- Free signed-in: 5 uploads per project (visual counter shown in Sources panel).
- Pro: 50 uploads per project (configurable in the provider).
- Each upload stores filename, size, upload date, optional status, and a short context snippet for the AI chat.

### State management

- `ExperienceProvider` wraps the entire app in `src/app/layout.tsx` and persists state to `localStorage`.
- Exposes helper methods: `canStartProject`, `trackProjectCreation`, `getChatHistory`/`saveChatHistory`, `getUploadUsage`/`recordUpload`, `addArtefact`, `recordToolUsage`, and `appendSourceContext`.
- Components use the provider to render usage indicators (dashboard, sources), gate modals, hydrate chats, and keep artefacts in sync across routes.
