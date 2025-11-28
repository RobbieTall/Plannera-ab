import Link from "next/link";
import { getServerSession } from "next-auth";

import LandingHero from "@/components/landing/LandingHero";
import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";

const navigation: { label: string; href: string }[] = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "About", href: "#about" },
];

const featureHighlights: { title: string; description: string }[] = [
  {
    title: "Chat-first scoping",
    description: "Use natural language to unpack feasibility, risks and next steps in seconds.",
  },
  {
    title: "Council intelligence",
    description: "Mock data today, API ready tomorrow. Swap in your planning database with one config change.",
  },
  {
    title: "Stakeholder ready",
    description: "Share AI summaries with consultants, investors and councils from one workspace.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="text-lg font-semibold text-slate-900">Plannera.ai</div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-slate-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 sm:inline-flex"
                >
                  Dashboard
                </Link>
                <SignOutButton className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Sign out
                </SignOutButton>
              </>
            ) : (
              <Link
                href="/signin"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div id="product">
            <LandingHero />
          </div>

          <section id="how-it-works" className="mt-16 space-y-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Why Plannera</p>
              <h2 className="text-3xl font-semibold text-slate-900">Built for planning teams</h2>
              <p className="text-base text-slate-600">
                The landing experience is fully modular. Swap in your real council database, webhooks, or CRM without
                rewriting the UI. All copy, prompts and data sources live in dedicated config files.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {featureHighlights.map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="about" className="mt-16 space-y-6">
            <h2 className="text-2xl font-semibold text-slate-900">From idea to lodgement</h2>
            <p className="text-base text-slate-600">
              Plannera.ai orchestrates property development workflows across feasibility, approvals and delivery. The
              chat-first assistant showcased here is wired to mock data sources, making it straightforward to connect to
              your own planning intelligence APIs when ready.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Plannera.ai. Built with Next.js 14.</span>
          <div className="flex gap-4">
            <Link href="https://nextjs.org" className="transition hover:text-slate-700">
              Next.js
            </Link>
            <Link href="https://tailwindcss.com" className="transition hover:text-slate-700">
              Tailwind CSS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
