"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, FileText, Sparkles, Users } from "lucide-react";

import { SiteHeader } from "@/components/navigation/site-header";

const navigation: { label: string; href: string }[] = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "About", href: "#about" },
];

const featureHighlights: { title: string; description: string }[] = [
  {
    title: "Chat-first scoping",
    description: "Turn a rough idea into a structured pathway with feasibility, risks and next actions in one pass.",
  },
  {
    title: "Council intelligence",
    description: "Mock data today, API ready tomorrow. Swap in your planning database with one config change.",
  },
  {
    title: "Stakeholder ready",
    description: "Share clear summaries with consultants, investors and councils from one polished workspace.",
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

const pathwaySteps = [
  "Planning controls scanned",
  "Approval pathway drafted",
  "Consultant pack assembled",
];

async function startProjectFromPrompt(
  prompt: string,
  opts?: {
    setSubmitting?: (v: boolean) => void;
    setPrompt?: (v: string) => void;
    router?: ReturnType<typeof useRouter>;
  },
) {
  const trimmed = prompt.trim();
  if (!trimmed) return;

  const { setSubmitting, setPrompt, router } = opts ?? {};

  if (setSubmitting) setSubmitting(true);

  try {
    if (setPrompt) setPrompt(trimmed);

    const res = await fetch("/api/projects/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });

    if (!res.ok) {
      console.error("Failed to ensure project from landing", await res.text());
      return;
    }

    const data = await res.json();
    const projectId = data?.project?.id as string | undefined;
    if (!projectId || !router) return;

    const seedQuery = new URLSearchParams({ prompt: trimmed, initialAddress: trimmed }).toString();
    router.push(`/projects/${projectId}/workspace?${seedQuery}`);
  } catch (error) {
    console.error("startProjectFromPrompt error", error);
  } finally {
    if (setSubmitting) setSubmitting(false);
  }
}

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    await startProjectFromPrompt(prompt, { setSubmitting, router, setPrompt });
  }

  async function handleExampleClick(title: string) {
    await startProjectFromPrompt(title, { setSubmitting, setPrompt, router });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#eff6ff,transparent_34rem),linear-gradient(180deg,#f8fafc_0%,#eef2f7_48%,#f8fafc_100%)] text-slate-950">
      <SiteHeader navigation={navigation} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div id="product">
            <section className="space-y-5">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-5 py-6 text-white shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(96,165,250,0.34),transparent_26rem),radial-gradient(circle_at_82%_12%,rgba(14,165,233,0.18),transparent_22rem),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88)_48%,rgba(30,64,175,0.72))]" />
                <div className="relative z-10 grid items-center gap-7 lg:grid-cols-[1.05fr,0.95fr]">
                  <div className="max-w-2xl space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100 shadow-sm backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      AI Planning Copilot
                    </div>
                    <div className="space-y-3">
                      <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                        Navigate planning approvals with AI-level clarity.
                      </h1>
                      <p className="max-w-xl text-base leading-7 text-blue-100/90 sm:text-lg">
                        Describe the site once. Plannera tightens the brief, surfaces likely controls, and turns early
                        uncertainty into a practical pathway before your first consultant call.
                      </p>
                    </div>
                    <form
                      onSubmit={handleSubmit}
                      className="rounded-[1.4rem] border border-white/[0.12] bg-white/[0.12] p-2 shadow-2xl shadow-slate-950/20 backdrop-blur sm:flex sm:items-center sm:gap-2"
                    >
                      <input
                        type="text"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="Enter a site address or project idea…"
                        className="min-h-12 w-full rounded-2xl border border-transparent bg-white px-4 text-base text-slate-950 placeholder:text-slate-400 shadow-inner shadow-slate-200/60 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-400/20 sm:flex-1"
                      />
                      <button
                        type="submit"
                        disabled={submitting || !prompt.trim()}
                        className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-400 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 sm:mt-0 sm:w-auto"
                      >
                        {submitting ? "Starting..." : "Generate pathway"}
                        <ArrowRight className={`h-4 w-4 ${submitting ? "animate-pulse" : ""}`} />
                      </button>
                    </form>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/90">Try an example</p>
                      <div className="flex flex-wrap gap-2">
                        {examplePrompts.map((example) => (
                          <button
                            key={example}
                            type="button"
                            onClick={() => handleExampleClick(example)}
                            disabled={submitting}
                            className="rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-2 text-left text-xs font-medium text-white/90 transition hover:border-white/45 hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/[0.14] bg-white/10 p-3 shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
                    <div className="rounded-[1.35rem] bg-white p-4 text-slate-950 shadow-inner shadow-slate-200/80 sm:p-5">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace preview</p>
                          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Approval pathway</h2>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Risk</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">Low-med</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Timeline</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">6-10 wk</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Docs</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">8 items</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {pathwaySteps.map((step) => (
                          <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                            <span className="text-sm font-medium text-slate-700">{step}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                          <Clock3 className="h-4 w-4" />
                          Next best action
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          Confirm zoning overlays, then brief a town planner with a one-page scope and evidence list.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-white bg-white/90 p-3 shadow-sm shadow-slate-200/70 md:grid-cols-3">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 rounded-[1.15rem] px-3 py-3 transition hover:bg-slate-50">
                    <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{stat.label}</p>
                      <p className="text-xs leading-5 text-slate-500">{stat.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section id="how-it-works" className="mt-12 space-y-6">
            <div className="grid gap-4 md:grid-cols-[0.8fr,1.2fr] md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Why Plannera</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Built for planning teams</h2>
              </div>
              <p className="text-base leading-7 text-slate-600 md:max-w-2xl">
                The landing experience is fully modular. Swap in your real council database, webhooks, or CRM without
                rewriting the UI. All copy, prompts and data sources live in dedicated config files.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featureHighlights.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="about" className="mt-12 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm shadow-slate-200/70 sm:p-8">
            <div className="grid gap-3 md:grid-cols-[0.75fr,1.25fr] md:items-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">From idea to lodgement</h2>
              <p className="text-base leading-7 text-slate-600">
                Plannera.ai orchestrates property development workflows across feasibility, approvals and delivery. The
                chat-first assistant showcased here is wired to mock data sources, making it straightforward to connect to
                your own planning intelligence APIs when ready.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
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
