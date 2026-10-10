import { describe, expect, it } from "vitest";
import { getSeePreviewCheckoutConfig } from "./submission-see-preview-checkout-config";

const byron = () => ({
  VERCEL: "1", VERCEL_ENV: "preview", SUBMISSION_SEE_PREVIEW_CHECKOUT_ENABLED: "true",
  PLANNERA_WORKING_SEE_GENERATION_ENABLED: "1", STRIPE_SECRET_KEY: "sk_test_synthetic",
  STRIPE_WEBHOOK_SECRET: "whsec_synthetic", VERCEL_GIT_COMMIT_REF: "see-doc-byron-20260930",
  VERCEL_BRANCH_URL: "plannera-ab-git-see-doc-byron-20260930-robbietalls-projects.vercel.app",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-sweet-glade-a74ukspj.ap-southeast-2.aws.neon.tech/neondb?sslmode=require",
});
const denied: Array<Record<string, string | undefined>> = [
  { VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { VERCEL: undefined },
  { SUBMISSION_SEE_PREVIEW_CHECKOUT_ENABLED: undefined }, { SUBMISSION_SEE_PREVIEW_CHECKOUT_ENABLED: "false" },
  { PLANNERA_WORKING_SEE_GENERATION_ENABLED: "0" }, { STRIPE_SECRET_KEY: "sk_live_synthetic" },
  { STRIPE_SECRET_KEY: "pk_test_synthetic" }, { STRIPE_WEBHOOK_SECRET: undefined },
  { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_GIT_COMMIT_REF: "unknown" },
  { VERCEL_BRANCH_URL: "attacker.invalid" }, { DATABASE_URL: "not-a-url" },
  { DATABASE_URL: "postgresql://synthetic:synthetic@ep-delicate-sound-a7l88m83.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" },
  { DIRECT_URL: "postgresql://synthetic:synthetic@other.invalid/neondb?sslmode=require" },
];
describe("reconstructed Preview checkout configuration coverage", () => {
  it("accepts the exact Byron target", () => {
    expect(getSeePreviewCheckoutConfig(byron())).toMatchObject({ council: "BYRON" });
  });
  it("accepts the independent exact Kempsey target", () => {
    expect(getSeePreviewCheckoutConfig({ ...byron(),
      VERCEL_GIT_COMMIT_REF: "see-doc-kempsey-20260930",
      VERCEL_BRANCH_URL: "plannera-ab-git-see-doc-kempsey-20260930-robbietalls-projects.vercel.app",
      DATABASE_URL: "postgresql://synthetic:synthetic@ep-delicate-sound-a7l88m83.ap-southeast-2.aws.neon.tech/neondb?sslmode=require",
    })).toMatchObject({ council: "KEMPSEY" });
  });
  it.each(denied)("fails closed for an unapproved configuration %j", (change) => {
    expect(getSeePreviewCheckoutConfig({ ...byron(), ...change })).toBeNull();
  });
  it("accepts a test restricted key and the matching pooled endpoint", () => {
    const env = byron();
    expect(getSeePreviewCheckoutConfig({ ...env, STRIPE_SECRET_KEY: "rk_test_synthetic",
      DATABASE_URL: env.DATABASE_URL.replace("a74ukspj.", "a74ukspj-pooler.") })).not.toBeNull();
  });
  it.each([
    "postgresql://synthetic:synthetic@ep-sweet-glade-a74ukspj.ap-southeast-2.aws.neon.tech/other?sslmode=require",
    "postgresql://synthetic:synthetic@ep-sweet-glade-a74ukspj.ap-southeast-2.aws.neon.tech:1234/neondb?sslmode=require",
    "postgresql://synthetic:synthetic@ep-sweet-glade-a74ukspj.ap-southeast-2.aws.neon.tech/neondb",
    "https://ep-sweet-glade-a74ukspj.ap-southeast-2.aws.neon.tech/neondb?sslmode=require",
  ])("rejects wrong database/protocol/TLS/port", (DATABASE_URL) => {
    expect(getSeePreviewCheckoutConfig({ ...byron(), DATABASE_URL })).toBeNull();
  });
});
