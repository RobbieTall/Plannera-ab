import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Calendar, LayoutDashboard, Layers, ListChecks, LogOut } from "lucide-react";
import { getServerSession } from "next-auth";

import { MainNavigation } from "@/components/navigation/main-navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Layers },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Calendar", href: "/calendar", icon: Calendar },
];

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  const initials = session.user.name?.slice(0, 2).toUpperCase() ?? session.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/80 px-6 py-8 backdrop-blur lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white">
            PL
          </span>
          Plannera
        </Link>
        <p className="mt-6 text-sm text-slate-500">
          Coordinate planning, feasibility, and delivery with clarity.
        </p>
        <div className="mt-8 flex flex-1 flex-col">
          <MainNavigation items={navigationItems} />
        </div>
        <div className="mt-8 rounded-3xl bg-slate-900/90 p-5 text-white">
          <p className="text-sm font-medium">Need something new?</p>
          <p className="mt-1 text-xs text-slate-200">Create a project brief and invite your team in seconds.</p>
          <Link
            href="#create-project"
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Start a new project
          </Link>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                {initials}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium text-slate-500">Welcome back</p>
                <p className="text-base font-semibold text-slate-900">
                  {session.user.name ?? session.user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MainNavigation items={navigationItems} orientation="horizontal" className="lg:hidden" />
              <SignOutButton
                className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-900 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                Sign out
              </SignOutButton>
            </div>
          </div>
        </header>
        <main className={cn("mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8", "space-y-10")}>{children}</main>
      </div>
    </div>
  );
}
