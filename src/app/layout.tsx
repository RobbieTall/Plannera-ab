import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import "./globals.css";

import { authOptions } from "@/lib/auth";
import { AuthSessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Plannera.ai",
  description: "Plannera.ai helps property teams coordinate planning, feasibility, and delivery.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
