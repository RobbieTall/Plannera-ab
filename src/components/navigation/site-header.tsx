"use client";

import Link from "next/link";
import { useState } from "react";

import { SignInModal } from "@/components/SignInModal";
import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/ui/logo";
import { useAuthState } from "@/hooks/use-auth-state";

type NavigationItem = {
  label: string;
  href: string;
};

type SiteHeaderProps = {
  navigation: NavigationItem[];
};

export function SiteHeader({ navigation }: SiteHeaderProps) {
  const { isAuthenticated } = useAuthState();
  const [showSignIn, setShowSignIn] = useState(false);

  const openSignIn = () => setShowSignIn(true);
  const closeSignIn = () => setShowSignIn(false);

  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6 w-auto" />
            <span className="sr-only">Home</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-slate-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 sm:inline-flex"
                >
                  My Projects
                </Link>
                <SignOutButton className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Sign out
                </SignOutButton>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openSignIn}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                >
                  Sign in
                </button>
                <SignInModal open={showSignIn} onClose={closeSignIn} />
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
