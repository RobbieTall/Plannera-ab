"use client";

import Link from "next/link";

import { useAuthGuard } from "@/components/providers/auth-guard-provider";
import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/ui/logo";

type NavigationItem = {
  label: string;
  href: string;
};

type SiteHeaderProps = {
  navigation: NavigationItem[];
};

export function SiteHeader({ navigation }: SiteHeaderProps) {
  const { isSignedIn, openAuthModal } = useAuthGuard();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2">
            <Logo className="h-6 w-auto" />
            <span className="sr-only">Home</span>
          </Link>
          {navigation.length ? (
            <nav className="hidden items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 p-1 text-sm font-medium text-slate-600 shadow-sm shadow-slate-200/60 md:flex">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center rounded-lg px-3 transition hover:bg-slate-100 hover:text-slate-950">
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <>
                <Link
                  href="/projects"
                  className="hidden min-h-11 items-center rounded-lg border border-slate-200/90 bg-white/70 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  My Projects
                </Link>
                <SignOutButton className="inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                  Sign out
                </SignOutButton>
              </>
            ) : (
              <>
                <Link
                  href="/projects"
                  className="hidden min-h-11 items-center rounded-lg border border-slate-200/90 bg-white/70 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  My Projects
                </Link>
                <button
                  type="button"
                  onClick={() => openAuthModal()}
                  className="inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
