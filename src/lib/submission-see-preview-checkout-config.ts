export class SeeCheckoutError extends Error {
  constructor(readonly code: "checkout_disabled" | "source_scope_mismatch" | "already_paid" |
    "quote_changed" | "credit_unavailable" | "pending_reconciliation_required" |
    "provider_checkout_invalid" | "checkout_conflict") { super(code); }
}

const targets = {
  "see-doc-byron-20260930": {
    council: "BYRON",
    host: "ep-sweet-glade-a74ukspj.ap-southeast-2.aws.neon.tech",
    origin: "https://plannera-ab-git-see-doc-byron-20260930-robbietalls-projects.vercel.app",
  },
  "see-doc-kempsey-20260930": {
    council: "KEMPSEY",
    host: "ep-delicate-sound-a7l88m83.ap-southeast-2.aws.neon.tech",
    origin: "https://plannera-ab-git-see-doc-kempsey-20260930-robbietalls-projects.vercel.app",
  },
} as const;

export type SeePreviewCheckoutConfig = {
  council: "BYRON" | "KEMPSEY"; origin: string; secretKey: string; webhookSecret: string;
};

/** Read server environment only. Do not return this object to a browser or log it. */
export function getSeePreviewCheckoutConfig(env: Record<string, string | undefined>): SeePreviewCheckoutConfig | null {
  if (env.VERCEL_ENV !== "preview" || env.VERCEL !== "1" ||
    env.SUBMISSION_SEE_PREVIEW_CHECKOUT_ENABLED !== "true" ||
    env.PLANNERA_WORKING_SEE_GENERATION_ENABLED !== "1" ||
    !/^(sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? "") ||
    !env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) return null;
  const ref = env.VERCEL_GIT_COMMIT_REF;
  if (!ref || !Object.hasOwn(targets, ref)) return null;
  const target = targets[ref as keyof typeof targets];
  if ("https://" + env.VERCEL_BRANCH_URL !== target.origin) return null;
  const allowedHosts = [target.host, target.host.replace(".ap-southeast", "-pooler.ap-southeast")];
  for (const value of [env.DATABASE_URL, env.DIRECT_URL ?? env.DATABASE_URL]) {
    try {
      const url = new URL(value ?? "");
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !allowedHosts.includes(url.hostname) ||
        url.pathname !== "/neondb" || (url.port && url.port !== "5432") ||
        url.searchParams.get("sslmode") !== "require") return null;
    } catch { return null; }
  }
  return { council: target.council, origin: target.origin,
    secretKey: env.STRIPE_SECRET_KEY!, webhookSecret: env.STRIPE_WEBHOOK_SECRET! };
}
