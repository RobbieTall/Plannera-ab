"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Sparkles, Users } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/ui/logo";
import { setSiteFromCandidate, toPersistableSiteCandidate } from "@/lib/site-context-client";
import type { SiteCandidate } from "@/types/site";

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

const examplePrompts = [
  "Mixed-use development in Australia",
  "Dual occupancy on a suburban block",
  "Secondary dwelling for family in the backyard",
  "Mixed-use concept on a 1,000sqm site",
];

const quickStats = [
  {
    label: "DA approval timelines tracked",
    description: "Live monitoring across NSW, QLD & VIC",
    icon: Sparkles,
  },
  {
    label: "Document templates",
    description: "Planning reports, checklists and letters",
    icon: FileText,
  },
  {
    label: "Consultant directory",
    description: "Planners, certifiers and heritage experts",
    icon: Users,
  },
];

type HomePageClientProps = {
  userId: string | null;
};

export function HomePageClient({ userId }: HomePageClientProps) {
  const isSignedIn = Boolean(userId);
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function ensureProject(title: string): Promise<string | null> {
    try {
      const res = await fetch("/api/projects/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!res.ok) {
        console.error("Failed to ensure project", await res.text());
        return null;
      }

      const data = (await res.json()) as { projectId?: string };
      return data.projectId ?? null;
    } catch (error) {
      console.error("Failed to ensure project", error);
      return null;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setSubmitting(true);

    try {
      const projectId = await ensureProject(trimmedPrompt);

      if (!projectId) {
        setSubmitting(false);
        return;
      }

      const candidate: SiteCandidate = {
        id: crypto.randomUUID(),
        formattedAddress: trimmedPrompt,
        lgaName: null,
      };

      setSiteFromCandidate({
        projectId,
        addressInput: trimmedPrompt,
        candidate: toPersistableSiteCandidate(candidate),
      });
      setPrompt("");
      router.push(`/projects/${projectId}/workspace`);
    } catch (error) {
      console.error("Failed to submit prompt", error);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
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
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 sm:inline-flex"
                >
                  My Projects
                </Link>
                <SignOutButton className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Logout
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
            <section className="space-y-10">
              <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-10 text-white">
                <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
                  <div className="space-y-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-blue-200">AI Planning Copilot</p>
                    <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                      Navigate planning approvals with AI
                    </h1>
                    <p className="text-lg text-blue-100">
                      Streamline your development from concept to consent. Describe your project and Plannera will surface
                      local requirements, documentation, timelines and costs in seconds.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <input
                        type="text"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="Enter a site address or project idea…"
                        className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-blue-200 focus:border-blue-200 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={submitting || !prompt.trim()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/90 px-5 py-3 text-base font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submitting ? "Starting workspace..." : "Generate planning pathway"}
                        <Sparkles className={`h-4 w-4 text-blue-700 ${submitting ? "animate-pulse" : ""}`} />
                      </button>
                    </form>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Try an example</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {examplePrompts.map((example) => (
                          <button
                            key={example}
                            type="button"
                            onClick={() => setPrompt(example)}
                            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-white/40 hover:text-white"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl bg-white/5 p-6 shadow-xl ring-1 ring-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-blue-500/10 to-slate-900/20" aria-hidden />
                    <div className="relative space-y-6">
                      <div className="flex items-start justify-between rounded-2xl bg-white/10 p-4 backdrop-blur">
                        <div>
                          <p className="text-sm text-blue-100">Your project</p>
                          <p className="text-lg font-semibold">Mixed-use concept</p>
                          <p className="text-sm text-blue-100">1,000sqm site</p>
                        </div>
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-100">Live</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-100">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">AI Planner</p>
                            <p className="text-sm text-blue-100">Drafts DA pathway, controls, and risks in seconds.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-100">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">Council pack</p>
                            <p className="text-sm text-blue-100">Auto-assemble reports and letters with your data.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-100">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">Invite collaborators</p>
                            <p className="text-sm text-blue-100">Share your workspace with consultants and clients.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-400/5" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(94,234,212,0.15),transparent_25%),radial-gradient(circle_at_80%_50%,rgba(129,140,248,0.12),transparent_35%)]" />
              </div>
            </section>
          </div>
        </div>

        <section id="how-it-works" className="border-t border-slate-200 bg-white/90 py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">How it works</p>
                <h2 className="text-3xl font-semibold text-slate-900">Everything you need for planning approvals</h2>
                <p className="text-lg text-slate-600">
                  Plannera combines site intelligence, AI drafting, and workflows in one workspace.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                See your projects
              </Link>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {featureHighlights.map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="bg-slate-50 py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Why Plannera</p>
              <h2 className="text-3xl font-semibold text-slate-900">Built for planners, developers, and consultants</h2>
              <p className="text-lg text-slate-600">AI that respects planning context and your project data.</p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Plannera keeps you moving.</p>
                  <p className="mt-2 text-sm text-slate-600">{stat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white/80 py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="rounded-[32px] bg-gradient-to-br from-slate-900 to-blue-900 p-10 text-white shadow-xl">
              <div className="grid gap-10 md:grid-cols-[1fr,0.8fr]">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-blue-200">Get started</p>
                  <h3 className="text-3xl font-semibold leading-tight">Open a workspace and test your site</h3>
                  <p className="text-lg text-blue-100">
                    Try Plannera with your own site or a sample project. Save workspaces by signing in.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/dashboard"
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
                    >
                      Go to dashboard
                    </Link>
                    <Link
                      href="/signin"
                      className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/50"
                    >
                      Sign in to save
                    </Link>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-6 backdrop-blur">
                  <p className="text-sm text-blue-100">Instant pathway drafts</p>
                  <p className="mt-2 text-xl font-semibold">Upload documents, set objectives, and get a DA-ready plan.</p>
                  <div className="mt-4 space-y-3 text-sm text-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Council controls and overlays summarised
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      Milestones, tasks, and consultants mapped out
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Risks, gaps, and next steps highlighted
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
