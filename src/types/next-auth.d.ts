import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      plan?: string | null;
      subscriptionTier?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    plan?: string | null;
    subscriptionTier?: string | null;
  }
}
