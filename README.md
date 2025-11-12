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

   - `DATABASE_URL` – PostgreSQL connection string
   - `NEXTAUTH_URL` – the public base URL of your app (e.g. `http://localhost:3000` in development)
   - `NEXTAUTH_SECRET` – secret for signing NextAuth cookies/tokens
   - `EMAIL_SERVER_*` & `EMAIL_FROM` – SMTP credentials for sending magic links

3. Generate the Prisma client and apply the database schema:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Start the development server:

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

## Project Status

Initializing fresh AB version with focus on:

- Modular, testable components
- Clean separation of concerns
- Robust architecture to avoid fragility

This foundation provides an opinionated landing experience that can be extended into the full Plannera.ai product.
