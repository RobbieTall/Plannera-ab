import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Development database isolation | Plannera",
  robots: { index: false, follow: false },
};

const TEST_BRANCH = "audit/dev-db-isolation-20261011";
const EXPECTED_PROJECT = "crimson-mud-29775341";
const EXPECTED_ENDPOINT = "ep-fancy-sunset-a7zoh8wm";

type Status = "match" | "mismatch" | "unavailable" | "connection_failed";

async function inspectTarget(): Promise<Status> {
  const connection = process.env.DATABASE_URL;
  if (!connection) return "unavailable";
  try {
    const url = new URL(connection);
    const endpoint = url.hostname.toLowerCase().split(".")[0];
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname.toLowerCase().endsWith(".neon.tech") ||
      ![EXPECTED_ENDPOINT, `${EXPECTED_ENDPOINT}-pooler`].includes(endpoint) ||
      process.env.NEON_PROJECT_ID !== EXPECTED_PROJECT
    ) {
      return "mismatch";
    }
  } catch {
    return "mismatch";
  }

  try {
    const result = await prisma.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`;
    return result[0]?.database_name === "neondb" ? "match" : "mismatch";
  } catch {
    return "connection_failed";
  }
}

export default async function DevelopmentDatabaseIsolationPage() {
  if (
    process.env.VERCEL !== "1" ||
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== TEST_BRANCH
  ) {
    notFound();
  }

  const status = await inspectTarget();
  return (
    <main style={{ maxWidth: 680, margin: "4rem auto", padding: "2rem", fontFamily: "Georgia, serif" }}>
      <h1>Isolated development database check</h1>
      <p role="status">{status}</p>
      <p>
        Read-only Preview check. No connection details, account records, or database contents are displayed.
        A match proves this deployment reached the intended new database; it is not commercial acceptance.
      </p>
    </main>
  );
}
