"use client";

import { FormEvent, KeyboardEvent, ReactNode, useCallback, useMemo, useState } from "react";
import { ArrowRight, Download, FileText, Share2, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { generatePlanningInsights, PlanningSummary } from "@/lib/mock-planning-data";
import { parseProjectDescription } from "@/lib/project-parser";
import { teamMembers, type Project } from "@/lib/mock-data";
import { useExperience } from "@/components/providers/experience-provider";
import { Modal } from "@/components/ui/modal";
import type { WorkspaceMessage } from "@/types/workspace";

const examplePrompts = [
  "I want to build a secondary dwelling on my property",
  "Planning a dual occupancy development on a suburban block",
  "Adding a second storey to an existing house",
  "Developing 6 townhouses on a 1,000sqm site",
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

async function ensureProject(title: string) {
  try {
    const res = await fetch("/api/projects/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      console.error("Failed to create project");
      return null;
    }

    const data: { project?: { id?: string; publicId?: string; name?: string } } = await res.json();
    const ensuredId = data.project?.id ?? data.project?.publicId;

    if (!ensuredId) {
      console.error("Project response missing id");
      return null;
    }

    return { id: ensuredId, name: data.project?.name ?? title };
  } catch (error) {
    console.error("Failed to ensure project", error);
    return null;
  }
}

export function ExampleStartButton({
  title,
  className,
  children,
  disabled,
}: {
  title: string;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();

  async function handleStart() {
    const project = await ensureProject(title);
    if (!project) {
      return;
    }
    router.push(`/projects/${project.id}/workspace`);
  }

  return (
    <button onClick={handleStart} className={className} type="button" disabled={disabled}>
      {children ?? "Use this example"}
    </button>
  );
}

export function PlanningAssistant() {
  const router = useRouter();
  const { state, canStartProject, trackProjectCreation, saveChatHistory, getChatHistory, registerProject } = useExperience();
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState<PlanningSummary | null>(null);
  const [modalState, setModalState] = useState<{ type: "limit" | "action"; context?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [pendingProject, setPendingProject] = useState<{ id: string; prompt: string } | null>(null);

  const timelineLabel = useMemo(() => {
    if (!summary) return null;
    return `${summary.timelineWeeks[0]}-${summary.timelineWeeks[1]} weeks`;
  }, [summary]);

  const handleGoToWorkspace = (projectId?: string) => {
    setModalState(null);
    const targetId = projectId ?? activeProjectId;
    if (targetId) {
      router.push(`/projects/${targetId}/workspace`);
    }
  };

  const createSummary = async (value: string, options: { shouldTrackProject: boolean; projectId: string }) => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: value, history: getChatHistory(options.projectId) }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate planning pathway");
      }

      const data: { summary: PlanningSummary; error?: string | null } = await response.json();
      setSummary(data.summary);
      setErrorMessage(data.error ?? null);
      const ensuredProjectId = await persistInitialConversation(
        options.projectId,
        value,
        data.summary,
        options.shouldTrackProject,
      );
      handleGoToWorkspace(ensuredProjectId);
    } catch (error) {
      console.error(error);
      setErrorMessage("We couldn't reach the planning assistant. Showing a fallback pathway.");
      const parsed = parseProjectDescription(value);
      const fallback = generatePlanningInsights(parsed);
      setSummary(fallback);
      const ensuredProjectId = await persistInitialConversation(
        options.projectId,
        value,
        fallback,
        options.shouldTrackProject,
      );
      handleGoToWorkspace(ensuredProjectId);
    } finally {
      setIsGenerating(false);
    }
  };

  const processSubmission = async () => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription || isGenerating) {
      return;
    }
    const ensuredProject = await ensureProject(trimmedDescription);
    if (!ensuredProject) {
      return;
    }
    const prospectiveId = ensuredProject.id;
    const gate = canStartProject(prospectiveId);
    if (!gate.allowed) {
      setPendingProject({ id: prospectiveId, prompt: trimmedDescription });
      setModalState({ type: "limit" });
      return;
    }
    await createSummary(trimmedDescription, { shouldTrackProject: !gate.alreadyTracked, projectId: prospectiveId });
  };

  const sendInitialWorkspaceMessage = useCallback(
    async (params: { project: Project; prompt: string; initialMessages: WorkspaceMessage[] }) => {
      const { project, prompt, initialMessages } = params;

      const history = getChatHistory(project.id);
      const historySeed = history.length ? history : initialMessages;

      try {
        const response = await fetch("/api/workspace-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: prompt,
            projectId: project.id,
            projectName: project.name,
          }),
        });
        const data: { reply?: string; lga?: string | null } = await response.json();
        const needsLocation = !data.lga;
        const replyFallback = needsLocation
          ? "I can tailor this better with the site address, suburb, or zone (e.g. B4 Mixed Use)."
          : "I’ll keep looking for the right LEP/SEPP clauses—share any uploads or zones to sharpen the answer.";
        const assistantMessage: WorkspaceMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: data.reply ?? replyFallback,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        saveChatHistory(project.id, [...historySeed, assistantMessage]);
      } catch (error) {
        console.error("Initial workspace chat error", error);
        const assistantMessage: WorkspaceMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content:
            "I couldn’t retrieve the Sydney LEP or SEPP clauses right now. Please try again or add the council area and zone for a precise lookup.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        saveChatHistory(project.id, [...historySeed, assistantMessage]);
      }
    },
    [getChatHistory, saveChatHistory]
  );

  const ensureProjectOnServer = async (params: {
    projectId: string;
    promptValue: string;
    summary: PlanningSummary;
    fallbackName: string;
    fallbackDescription?: string;
  }) => {
    const { projectId, promptValue, summary, fallbackName, fallbackDescription } = params;
    const body = {
      publicId: projectId,
      name: fallbackName,
      description: fallbackDescription ?? promptValue,
      propertyName: summary.location || summary.developmentType || fallbackName,
      propertyState: summary.state || undefined,
      propertyCountry: "Australia",
      landingPrompt: promptValue,
    };

    try {
      const ensureRes = await fetch("/api/projects/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!ensureRes.ok) {
        console.warn("[landing-first-chat] Project ensure failed", await ensureRes.text());
        return { projectId, projectName: fallbackName, projectDescription: body.description };
      }

      const ensureData: {
        projectId?: string;
        project?: { id?: string; publicId?: string; name?: string; description?: string | null };
      } = await ensureRes.json();
      const ensuredProject = ensureData.project ?? null;
      const ensuredId = ensuredProject?.publicId ?? ensuredProject?.id ?? ensureData.projectId ?? projectId;

      return {
        projectId: ensuredId,
        projectName: ensuredProject?.name ?? fallbackName,
        projectDescription: ensuredProject?.description ?? body.description,
      };
    } catch (error) {
      console.warn("[landing-first-chat] Project ensure error", error);
      return { projectId, projectName: fallbackName, projectDescription: body.description };
    }
  };

  const persistInitialConversation = async (
    projectId: string,
    promptValue: string,
    generatedSummary: PlanningSummary,
    shouldTrack: boolean
  ): Promise<string> => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const initialMessages: WorkspaceMessage[] = [
      {
        id: `msg-${Date.now()}`,
        role: "user",
        content: promptValue,
        timestamp,
      },
    ];

    const fallbackProject = buildProjectFromSummary(projectId, promptValue, generatedSummary);
    const ensuredProject = await ensureProjectOnServer({
      projectId,
      promptValue,
      summary: generatedSummary,
      fallbackName: fallbackProject.name,
      fallbackDescription: fallbackProject.description,
    });
    const effectiveProjectId = ensuredProject.projectId;
    const project: Project = {
      ...fallbackProject,
      id: effectiveProjectId,
      name: ensuredProject.projectName,
      description: ensuredProject.projectDescription ?? fallbackProject.description,
    };

    saveChatHistory(effectiveProjectId, initialMessages);
    registerProject(project);
    setActiveProjectId(effectiveProjectId);
    if (shouldTrack) {
      trackProjectCreation(effectiveProjectId, initialMessages);
    }
    await sendInitialWorkspaceMessage({ project, prompt: promptValue, initialMessages });
    return effectiveProjectId;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await processSubmission();
  };

  const handleDescriptionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void processSubmission();
    }
  };

  const handleRestrictedAction = (action: string) => {
    setModalState({ type: "action", context: action });
  };

  const handleContinueExploring = async () => {
    if (modalState?.type === "limit") {
      if (state.remainingProjects <= 0) {
        setModalState(null);
        return;
      }
      if (pendingProject) {
        setModalState(null);
        await createSummary(pendingProject.prompt, {
          shouldTrackProject: true,
          projectId: pendingProject.id,
        });
        setPendingProject(null);
        return;
      }
    }
    setModalState(null);
    handleGoToWorkspace(activeProjectId ?? undefined);
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
                onKeyDown={handleDescriptionKeyDown}
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
                  <ExampleStartButton
                    key={prompt}
                    title={prompt}
                    className="rounded-full border border-white/20 px-4 py-2 text-left text-sm text-white transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isGenerating}
                  >
                    {prompt}
                  </ExampleStartButton>
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
          <NswDataPanel summary={summary} />
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Continue in the project workspace</p>
              <p className="text-sm text-slate-600">
                Chat, upload sources and run agents in a NotebookLM-style layout tailored for {summary.location}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleGoToWorkspace(activeProjectId ?? undefined)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Continue exploring in workspace
              <ArrowRight className="h-4 w-4" />
            </button>
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

      <Modal
        open={Boolean(modalState)}
        onClose={() => setModalState(null)}
        title={modalState?.type === "limit" ? "You've used your 1 free project" : `Sign up to ${modalState?.context ?? "continue"}`}
        description={
          modalState?.type === "limit"
            ? "Create a Plannera account to unlock unlimited projects, uploads, and premium tools."
            : modalState
              ? `You can explore one project without an account. To ${modalState.context}, create a Plannera workspace and unlock downloads, exports and consultant invitations.`
              : ""
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/signin"
            className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign up free
          </a>
          <button
            type="button"
            onClick={handleContinueExploring}
            disabled={modalState?.type === "limit" && state.remainingProjects <= 0}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue exploring
          </button>
        </div>
      </Modal>
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

function NswDataPanel({ summary }: { summary: PlanningSummary }) {
  const snapshot = summary.nswData;
  if (!snapshot) {
    return null;
  }

  const propertyItems = buildPropertyItems(summary);
  const waterItems = buildWaterItems(summary);
  const tradeItems = buildTradeItems(summary);
  const hasData = propertyItems.length || waterItems.length || tradeItems.length;

  if (!hasData) {
    return null;
  }

  const sections: { title: string; description: string; items: string[] }[] = [
    { title: "Property", description: "Zoning, height and overlays", items: propertyItems },
    { title: "Water", description: "Catchments & controls", items: waterItems },
    { title: "Trades", description: "Licensing & approvals", items: tradeItems },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/80 p-2 text-blue-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">NSW live data attached</p>
          <p className="text-xs text-slate-600">Pulled via NSW Planning property, water and trades APIs during this run.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) =>
          section.items.length ? (
            <NswDataCard key={section.title} title={section.title} description={section.description} items={section.items} />
          ) : null
        )}
      </div>
    </div>
  );
}

type NswDataCardProps = {
  title: string;
  description: string;
  items: string[];
};

function NswDataCard({ title, description, items }: NswDataCardProps) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-slate-700">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildProjectFromSummary(projectId: string, description: string, summary: PlanningSummary): Project {
  const now = new Date();
  const locationLabel = summary.state ? `${summary.location}, ${summary.state}` : summary.location;
  const starterTeam = teamMembers.slice(0, 3);
  const actor = starterTeam[0] ?? teamMembers[0];
  const promptExcerpt = description.length > 120 ? `${description.slice(0, 117)}...` : description;

  return {
    id: projectId,
    name: `${summary.developmentType} in ${summary.location}`,
    description: `Planning scope created from user prompt: "${promptExcerpt}". Focus on ${summary.scale} with ${
      summary.council
    } requirements and ${summary.requirements[0] ?? "local controls"}.`,
    location: locationLabel,
    isDemo: false,
    status: "active",
    priority: "high",
    progress: 12,
    startDate: now.toISOString(),
    endDate: null,
    color: "#0f172a",
    tags: [summary.council, summary.state, summary.developmentType].filter(Boolean) as string[],
    tasks: [],
    teamMembers: starterTeam,
    createdAt: now.toISOString(),
    activity: [
      {
        id: `${projectId}-act-1`,
        summary: "New project created from planning assistant",
        detail: `Captured prompt and attached LEP context for ${locationLabel}.`,
        timestamp: now.toISOString(),
        actor: actor ?? {
          id: "agent",
          name: "Workspace Agent",
          avatarUrl: "https://api.dicebear.com/8.x/bottts/svg?seed=Plannera",
          role: "Assistant",
        },
      },
    ],
  };
}

function buildPropertyItems(summary: PlanningSummary) {
  return (
    summary.nswData?.property?.map((record) => {
      const fsrLabel = record.floorSpaceRatio ? ` • FSR ${record.floorSpaceRatio}` : "";
      const heightLabel = record.heightLimit ? ` • Height ${record.heightLimit}` : "";
      return `${record.address} – ${record.zoning}${fsrLabel}${heightLabel}`;
    }) ?? []
  );
}

function buildWaterItems(summary: PlanningSummary) {
  return (
    summary.nswData?.water?.map((record) => {
      const control = record.controls[0] ? ` • ${record.controls[0]}` : "";
      return `${record.name} (${record.authority}) – Flood risk ${record.floodRisk}${control}`;
    }) ?? []
  );
}

function buildTradeItems(summary: PlanningSummary) {
  return (
    summary.nswData?.trades?.map((record) => {
      const approvalsLabel = record.approvals[0] ? ` (${record.approvals[0]})` : "";
      return `${record.trade} – ${record.licence}${approvalsLabel}`;
    }) ?? []
  );
}
