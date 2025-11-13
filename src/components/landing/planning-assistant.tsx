"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Download, FileText, Share2, Sparkles, Users } from "lucide-react";

import { generatePlanningInsights, PlanningSummary } from "@/lib/mock-planning-data";
import { parseProjectDescription } from "@/lib/project-parser";

const examplePrompts = [
  "I want to build 6 townhouses on a 1200sqm block in Bondi",
  "Planning a dual occupancy development in Brisbane",
  "Adding a second story to existing house in Melbourne",
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

const actionButtons = [
  { label: "Download starter documents", action: "download the document pack", icon: Download },
  { label: "Export pathway", action: "export this pathway", icon: ArrowRight },
  { label: "Share with team", action: "share this plan", icon: Share2 },
];

export function PlanningAssistant() {
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState<PlanningSummary | null>(null);
  const [hasExplored, setHasExplored] = useState(false);
  const [modalContext, setModalContext] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timelineLabel = useMemo(() => {
    if (!summary) return null;
    return `${summary.timelineWeeks[0]}-${summary.timelineWeeks[1]} weeks`;
  }, [summary]);

  const handlePromptSelection = (prompt: string) => {
    setDescription(prompt);
    if (hasExplored) {
      setModalContext("add a second project");
      return;
    }
    void createSummary(prompt);
  };

  const createSummary = async (value: string) => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate planning pathway");
      }

      const data: { summary: PlanningSummary; error?: string | null } = await response.json();
      setSummary(data.summary);
      setHasExplored(true);
      setErrorMessage(data.error ?? null);
    } catch (error) {
      console.error(error);
      setErrorMessage("We couldn't reach the planning assistant. Showing a fallback pathway.");
      const parsed = parseProjectDescription(value);
      const fallback = generatePlanningInsights(parsed);
      setSummary(fallback);
      setHasExplored(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim()) {
      return;
    }
    if (hasExplored && summary) {
      setModalContext("add a second project");
      return;
    }
    await createSummary(description);
  };

  const handleRestrictedAction = (action: string) => {
    setModalContext(action);
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
              Streamline your development from concept to consent. Describe your project and Plannera will surface
              local requirements, documentation, timelines and costs in seconds.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe your development project..."
                className="min-h-[140px] w-full resize-none rounded-2xl border border-white/10 bg-white/10 p-4 text-base text-white placeholder:text-blue-200 focus:border-blue-200 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/90 px-5 py-3 text-base font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGenerating ? "Generating..." : "Generate planning pathway"}
                <Sparkles className={`h-4 w-4 text-blue-700 ${isGenerating ? "animate-pulse" : ""}`} />
              </button>
              {errorMessage && (
                <p className="text-sm text-amber-200" role="alert">
                  {errorMessage}
                </p>
              )}
            </form>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Try an example</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptSelection(prompt)}
                    disabled={isGenerating}
                    className="rounded-full border border-white/20 px-4 py-2 text-left text-sm text-white transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
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

      {summary ? (
        <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Project overview</p>
              <h2 className="text-2xl font-semibold text-slate-900">
                {summary.developmentType} – {summary.scale}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                {summary.location}, {summary.state}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                {summary.council}
              </span>
              {timelineLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  Timeline: {timelineLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                Budget: {summary.budgetRange}
              </span>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <InsightCard title="Local council requirements" items={summary.requirements} />
            <InsightCard title="Required documents & reports" items={summary.documents} />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <InsightCard title="Approval hurdles" items={summary.hurdles} />
            <div className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-600">What happens next?</p>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                <li>📍 Confirm zoning with {summary.council} planning duty officer</li>
                <li>🗂️ Commission consultants listed in the directory</li>
                <li>🗓️ Prep submission pack targeting week {summary.timelineWeeks[0]}</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {actionButtons.map((button) => (
                  <button
                    key={button.label}
                    type="button"
                    onClick={() => handleRestrictedAction(button.action)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300"
                  >
                    <button.icon className="h-4 w-4" />
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
          <p className="text-lg font-semibold text-slate-700">Preview your planning pathway</p>
          <p className="mt-2 text-sm">
            Submit a project description or choose an example prompt to generate local council requirements, document
            checklists and approval timelines.
          </p>
        </div>
      )}

      {modalContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-blue-600">Create a free workspace</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Sign up to {modalContext}</h3>
            <p className="mt-3 text-sm text-slate-600">
              You can explore one project without an account. To {modalContext}, create a Plannera workspace and unlock
              downloads, exports and consultant invitations.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/signin"
                className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign up free
              </a>
              <button
                type="button"
                onClick={() => setModalContext(null)}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Continue exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type InsightCardProps = {
  title: string;
  items: string[];
};

function InsightCard({ title, items }: InsightCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
