import { notFound } from "next/navigation";

import { requireSessionUser } from "@/lib/artefact-service";
import { inspectPreviewDatabaseTarget } from "@/lib/preview-database-target";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Preview database target | Plannera",
  robots: { index: false, follow: false },
};

const COUNCIL_BY_BRANCH: Record<string, string> = {
  "see-doc-byron-20260930": "Byron",
  "see-doc-kempsey-20260930": "Kempsey",
};

export default async function PreviewDatabaseTargetPage() {
  const council = COUNCIL_BY_BRANCH[process.env.VERCEL_GIT_COMMIT_REF ?? ""];
  const target = inspectPreviewDatabaseTarget(process.env);
  if (!council || target === null) notFound();

  try {
    await requireSessionUser();
  } catch {
    notFound();
  }

  const colour =
    target === "match" ? "#166534" : target === "mismatch" ? "#991b1b" : "#92400e";
  const explanation =
    target === "match"
      ? "The configured database host matches this council's isolated Preview endpoint."
      : target === "mismatch"
        ? "The configured database host does not match this council's isolated Preview endpoint. Do not generate documents."
        : "The database target could not be determined. Do not generate documents.";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #f2f5f0 0%, #e5eee7 100%)",
        color: "#19342b",
        padding: "clamp(2rem, 6vw, 5rem) 1.5rem",
        fontFamily: "Georgia, serif",
      }}
    >
      <section
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "clamp(1.5rem, 4vw, 3rem)",
          background: "#ffffff",
          border: "1px solid #cbd9cf",
          borderRadius: 16,
          boxShadow: "0 16px 44px rgba(24, 52, 39, 0.1)",
        }}
      >
        <p style={{ margin: "0 0 0.75rem", fontFamily: "sans-serif", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Protected Preview diagnostic
        </p>
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          {council} database target
        </h1>
        <p style={{ margin: "0 0 0.5rem", fontFamily: "sans-serif" }}>Status</p>
        <p
          role="status"
          style={{
            display: "inline-block",
            margin: "0 0 1.5rem",
            padding: "0.5rem 1rem",
            border: "2px solid currentColor",
            borderRadius: 8,
            color: colour,
            fontFamily: "sans-serif",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}
        >
          {target}
        </p>
        <p style={{ margin: "0 0 1.5rem", lineHeight: 1.6 }}>{explanation}</p>
        <p style={{ margin: 0, color: "#405b50", fontFamily: "sans-serif", fontSize: 14, lineHeight: 1.6 }}>
          This read-only check compares the configured connection host only. It does not verify database contents,
          schema, payment, private file storage, or document quality.
        </p>
      </section>
    </main>
  );
}
