import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { MainNavigation } from "@/components/navigation/main-navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/ui/logo";
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AuthenticatedAppLayoutProps {
  children: ReactNode;
  requireSession?: boolean;
}

export async function AuthenticatedAppLayout({ children, requireSession = true }: AuthenticatedAppLayoutProps) {
  let session: Session | null = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  const isAuthenticated = Boolean(session?.user?.email);

  if (requireSession && !isAuthenticated) {
    redirect("/signin");
  }

  const resolvedSession = isAuthenticated ? session : null;
  const initials =
    resolvedSession?.user?.name?.slice(0, 2).toUpperCase() ??
    resolvedSession?.user?.email?.slice(0, 2).toUpperCase() ??
    "PL";
  const displayName = resolvedSession?.user?.name ?? resolvedSession?.user?.email ?? null;

  if (!requireSession) {
    return (
      <div className="min-h-screen bg-white text-slate-950">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-slate-950">
              <Logo className="h-6 w-auto" />
              <span className="sr-only">Home</span>
            </Link>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>{displayName ?? "Projects in this browser"}</span>
              {resolvedSession ? (
                <SignOutButton className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </SignOutButton>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/80 px-6 py-8 backdrop-blur lg:flex">
        <Link href="/projects" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white">
            PL
          </span>
          Plannera
        </Link>
        <p className="mt-6 text-sm text-slate-500">
          Continue Quick Site Checks and cited planning outputs.
        </p>
        <div className="mt-8 flex flex-1 flex-col">
          <MainNavigation />
        </div>
        <div className="mt-8 rounded-3xl bg-slate-900/90 p-5 text-white">
          <p className="text-sm font-medium">Need something new?</p>
          <p className="mt-1 text-xs text-slate-200">Start with a launch-path site address from the homepage.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Start a site check
          </Link>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950 text-white backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-inherit">
                <Logo className="h-6 w-auto" />
                <span className="sr-only">Home</span>
              </Link>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-slate-900">
                  {initials}
                </div>
                <div className="leading-tight text-white">
                  <p className="text-sm font-medium text-slate-300">Welcome back</p>
                  <p className="text-base font-semibold">{displayName ?? "Planner"}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MainNavigation orientation="horizontal" className="lg:hidden" />
              {resolvedSession ? (
                <SignOutButton className="group inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/20">
                  <LogOut className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  Logout
                </SignOutButton>
              ) : null}
            </div>
          </div>
        </header>
        <main className={cn("mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8", "space-y-10")}>
          {children}
        </main>
      </div>
    </div>
  );
}
