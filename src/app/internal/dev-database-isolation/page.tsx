import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { inspectDevDatabaseIsolation } from "@/lib/dev-db-isolation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Development database isolation | Plannera",
  robots: { index: false, follow: false },
};

const TEST_BRANCH = "audit/dev-db-isolation-20261011";

export default async function DevelopmentDatabaseIsolationPage() {
  if (
    process.env.VERCEL !== "1" ||
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== TEST_BRANCH
  ) {
    notFound();
  }

  const checks = await inspectDevDatabaseIsolation(process.env, async () => {
    const result = await prisma.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`;
    return result[0]?.database_name;
  });

  const rows: Array<[string, boolean]> = [
    ["Database URL configured", checks.urlConfigured],
    ["Project identifier configured", checks.projectIdConfigured],
    ["Endpoint matches isolated project", checks.endpointMatches],
    ["Project identifier matches", checks.projectMatches],
    ["Read-only connection attempted", checks.connectionAttempted],
    ["Read-only connection succeeded", checks.connectionSucceeded],
  ];

  return (
    <main style={{ maxWidth: 680, margin: "4rem auto", padding: "2rem", fontFamily: "Georgia, serif" }}>
      <h1>Isolated development database check</h1>
      <dl>
        {rows.map(([label, passed]) => (
          <div key={label} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
            <dt style={{ flex: 1 }}>{label}</dt>
            <dd style={{ margin: 0 }}>{passed ? "pass" : "fail"}</dd>
          </div>
        ))}
      </dl>
      <p>
        Preview-only, read-only diagnostic. The connection probe is skipped unless the configured
        host matches the isolated Neon endpoint. No connection details, account records, query
        results, or exception details are displayed. This is not commercial acceptance.
      </p>
    </main>
  );
}
