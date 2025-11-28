"use client";

import { FormEvent, useState } from "react";
import { FileText, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { setSiteFromCandidate, toPersistableSiteCandidate } from "@/lib/site-context-client";
import type { SiteCandidate } from "@/types/site";

const examplePrompts = [
  "6 Myola Road, Newport",
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

    const data = await res.json();
    const id = (data?.project?.id as string | undefined) ?? (data?.projectId as string | undefined);
    if (!id) {
      console.error("No project id returned from /api/projects/ensure", data);
      return null;
    }

    return id;
  } catch (error) {
    console.error("Error ensuring project", error);
    return null;
  }
}

async function setSite(projectId: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return;

  try {
    const searchResponse = await fetch("/api/site-context/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmedQuery }),
    });

    const searchData: { candidates?: SiteCandidate[]; error?: string } = await searchResponse.json();

    if (searchResponse.ok && searchData.candidates?.length) {
      const candidate = toPersistableSiteCandidate(searchData.candidates[0]);
      await setSiteFromCandidate({ projectId, addressInput: trimmedQuery, candidate });
      return;
    }

    if (!searchResponse.ok && searchData?.error !== "property_search_not_configured") {
      console.error("Site search failed", searchData);
      return;
    }

    const fallbackResponse = await fetch("/api/site-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        rawAddress: trimmedQuery,
        resolverStatus: "manual_from_landing",
        lgaName: null,
        lgaCode: null,
      }),
    });

    if (!fallbackResponse.ok) {
      console.error("Unable to save manual site from landing", await fallbackResponse.text());
    }
  } catch (error) {
    console.error("Set site from landing error", error);
  }
}

export default function LandingHero() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || submitting) return;

    setSubmitting(true);
    try {
      const projectId = await ensureProject(trimmedPrompt);
      if (!projectId) return;

      await setSite(projectId, trimmedPrompt);
      router.push(`/projects/${projectId}/workspace`);
    } finally {
      setSubmitting(false);
    }
  };

  const startExample = async (title: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const projectId = await ensureProject(title);
      if (!projectId) return;
      router.push(`/projects/${projectId}/workspace`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-10">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-10 text-white">
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200">AI Planning Copilot</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Navigate planning approvals with AI
            </h1>
            <p className="text-lg text-blue-100">
              Streamline your development from concept to consent. Describe your project and Plannera will surface local
              requirements, documentation, timelines and costs in seconds.
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
                disabled={submitting}
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
                    onClick={() => startExample(example)}
                    disabled={submitting}
                    className="rounded-full border border-white/20 px-4 py-2 text-left text-sm text-white transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-[28px] bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold text-blue-100">Plannera learns from:</p>
            <ul className="space-y-4 text-sm text-blue-50">
              <li>Historic DA outcomes across 50+ councils</li>
              <li>Library of planning reports and submission packs</li>
              <li>Consultant directories for specialist referrals</li>
            </ul>
            <div className="rounded-2xl bg-black/20 p-4 text-sm text-blue-100">
              Secure sandbox mode – no project data is stored. Perfect for early-stage scoping.
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        {quickStats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl p-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{stat.label}</p>
              <p className="text-xs text-slate-500">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
