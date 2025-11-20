import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import "./globals.css";

import { authOptions } from "@/lib/auth";
import { AuthSessionProvider } from "@/components/session-provider";
import { ExperienceProvider } from "@/components/providers/experience-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import type { UserTier } from "@/types/workspace";

export const metadata: Metadata = {
  title: "Plannera.ai",
  description: "Plannera.ai helps property teams coordinate planning, feasibility, and delivery.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await getServerSession(authOptions);
  const planSource = session?.user?.plan ?? session?.user?.subscriptionTier ?? null;
  const normalizedPlan = typeof planSource === "string" ? planSource.toLowerCase() : null;
  const paidPlanValues = new Set(["pro", "professional", "paid", "premium", "day_pass", "day-pass", "daypass"]);
  const initialTier: UserTier = !session
    ? "guest"
    : normalizedPlan && paidPlanValues.has(normalizedPlan)
      ? "pro"
      : "free";

  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <AuthSessionProvider session={session}>
            <ExperienceProvider initialTier={initialTier}>{children}</ExperienceProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
