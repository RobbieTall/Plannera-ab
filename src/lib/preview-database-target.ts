type PreviewEnvironment = Record<string, string | undefined>;

const EXPECTED_ENDPOINTS: Record<string, string> = {
  "see-doc-byron-20260930": "ep-sweet-glade-a74ukspj",
  "see-doc-kempsey-20260930": "ep-delicate-sound-a7l88m83",
};

export type PreviewDatabaseTargetResult = "match" | "mismatch" | "unavailable";

/**
 * Return only a bounded status. Never return, hash, or log the connection string.
 * This is a temporary Preview acceptance diagnostic, not a release-readiness gate.
 */
export function inspectPreviewDatabaseTarget(
  env: PreviewEnvironment,
): PreviewDatabaseTargetResult | null {
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview") return null;
  const expected = EXPECTED_ENDPOINTS[env.VERCEL_GIT_COMMIT_REF ?? ""];
  if (!expected) return null;

  if (!env.DATABASE_URL) return "unavailable";
  try {
    const url = new URL(env.DATABASE_URL);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      return "mismatch";
    }
    const hostname = url.hostname.toLowerCase();
    const endpoint = hostname.split(".")[0];
    return hostname.endsWith(".neon.tech") &&
      (endpoint === expected || endpoint === expected + "-pooler")
      ? "match"
      : "mismatch";
  } catch {
    return "mismatch";
  }
}
