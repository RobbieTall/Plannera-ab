"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  FileSpreadsheet,
  FileText,
  Globe2,
  Layers3,
  Link2,
  ListChecks,
  Mail,
  Notebook,
  Plus,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

import type { Project } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ProjectWorkspaceProps {
  project: Project;
}

interface Source {
  id: string;
  title: string;
  type: "email" | "document" | "link";
  detail: string;
  status?: string;
}

interface ToolCard {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: string;
}

interface Artefact {
  id: string;
  title: string;
  owner: string;
  updatedAt: string;
  type: "summary" | "brief" | "report";
}

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

const sourceIcons: Record<Source["type"], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  email: Mail,
  document: FileText,
  link: Link2,
};

const artefactBadges: Record<Artefact["type"], string> = {
  summary: "text-emerald-700 bg-emerald-50 border-emerald-200",
  brief: "text-blue-700 bg-blue-50 border-blue-200",
  report: "text-amber-700 bg-amber-50 border-amber-200",
};

const tools: ToolCard[] = [
  {
    id: "pathway",
    name: "Planning Pathway",
    description: "Step-by-step approvals map",
    icon: Layers3,
    accent: "from-blue-500/20 to-blue-600/30",
  },
  {
    id: "risks",
    name: "Risk Radar",
    description: "Surface blockers early",
    icon: Sparkles,
    accent: "from-rose-500/20 to-rose-600/30",
  },
  {
    id: "timeline",
    name: "Timeline Builder",
    description: "Auto-populate milestones",
    icon: ListChecks,
    accent: "from-emerald-500/20 to-emerald-600/30",
  },
  {
    id: "stakeholders",
    name: "Stakeholder Brief",
    description: "Summaries for councils",
    icon: Notebook,
    accent: "from-purple-500/20 to-purple-600/30",
  },
  {
    id: "financials",
    name: "Funding Model",
    description: "Blend grants + equity",
    icon: FileSpreadsheet,
    accent: "from-amber-500/20 to-amber-600/30",
  },
  {
    id: "compliance",
    name: "Compliance Pulse",
    description: "Track codes + clauses",
    icon: Globe2,
    accent: "from-slate-500/20 to-slate-600/30",
  },
];

const artefacts: Artefact[] = [
  {
    id: "art-001",
    title: "Council-ready summary",
    owner: "Avery Johnson",
    updatedAt: "3m ago",
    type: "summary",
  },
  {
    id: "art-002",
    title: "Viability brief v2",
    owner: "Maya Patel",
    updatedAt: "1h ago",
    type: "brief",
  },
  {
    id: "art-003",
    title: "Sustainability addendum",
    owner: "Notebook Agent",
    updatedAt: "Yesterday",
    type: "report",
  },
];

export function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  const sources: Source[] = useMemo(
    () => [
      {
        id: "src-1",
        title: "Council pre-lodgement feedback",
        type: "email",
        detail: `Forwarded by ${project.teamMembers[0]?.name ?? "council liaison"}`,
      },
      {
        id: "src-2",
        title: "ESD Statement draft.pdf",
        type: "document",
        detail: "Uploaded 2 days ago · 14 pages",
        status: "In review",
      },
      {
        id: "src-3",
        title: "Flood overlay guidance",
        type: "link",
        detail: "NSW Planning Portal",
      },
      {
        id: "src-4",
        title: `${project.name} feasibility deck`,
        type: "document",
        detail: "Slides · Updated last week",
      },
    ],
    [project.name, project.teamMembers],
  );

  const baseMessages = useMemo<Message[]>(
    () => [
      {
        id: "msg-1",
        role: "assistant",
        content: `Here’s the approvals pathway we generated for ${project.name}—key actions are lodging the revised concept package and validating the flood overlay assumptions.`,
        timestamp: "09:14",
      },
      {
        id: "msg-2",
        role: "user",
        content: "Summarise what we need from Byron council before Friday.",
        timestamp: "09:16",
      },
      {
        id: "msg-3",
        role: "assistant",
        content:
          "You’ll need: (1) confirmation on traffic impact scope, (2) written acceptance of the updated setbacks, and (3) their preferred sequencing for community consultation.",
        timestamp: "09:16",
      },
    ],
    [project.name],
  );

  const [messages, setMessages] = useState<Message[]>(baseMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    setMessages(baseMessages);
  }, [baseMessages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((previous) => [...previous, newMessage]);
    setInput("");
    setIsThinking(true);
    window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content:
            "Got it. I’ll cross-check your sources and draft an artefact so you can save this thread to the library.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsThinking(false);
    }, 900);
  };

  const handleRefresh = () => {
    setMessages(baseMessages);
    setInput("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Interactive notebook for pathways, risks, and council-ready artefacts.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
          <Notebook className="h-4 w-4" />
          Share workspace
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sources</p>
              <p className="text-sm text-slate-500">Emails, documents & references</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </header>
          <ul className="space-y-3">
            {sources.map((source) => {
              const Icon = sourceIcons[source.type];
              return (
                <li key={source.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 rounded-xl bg-white p-2 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{source.title}</p>
                      <p className="text-xs text-slate-500">{source.detail}</p>
                    </div>
                    {source.status ? (
                      <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">{source.status}</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chat</p>
              <p className="text-sm text-slate-500">Ask follow-ups, send to agents, or refresh to start over.</p>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </header>
          <div className="flex-1 space-y-4 overflow-hidden px-6 py-6">
            <div className="h-[420px] space-y-4 overflow-y-auto pr-2">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-3xl border px-4 py-3 text-sm leading-relaxed",
                    message.role === "assistant"
                      ? "border-slate-200 bg-slate-50 text-slate-800"
                      : "ml-auto border-blue-200 bg-blue-600/10 text-slate-900",
                  )}
                >
                  <p>{message.content}</p>
                  <p className="mt-2 text-xs text-slate-400">{message.timestamp}</p>
                </article>
              ))}
              {isThinking ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  Drafting response…
                </div>
              ) : null}
            </div>
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <label htmlFor="chat-input" className="sr-only">
                Ask the workspace
              </label>
              <textarea
                id="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={3}
                placeholder="Ask for a summary, send to an agent, or type / to see slash commands"
                className="w-full resize-none border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">Responses stay inside this project unless you share them.</p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Send
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tools & Agents</p>
                <p className="text-sm text-slate-500">Send context or open in split view.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900">
                <Sparkles className="h-4 w-4" />
                Browse
              </button>
            </header>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:border-slate-300"
                  >
                    <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br", tool.accent)}>
                      <Icon className="h-4 w-4 text-slate-900" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{tool.name}</p>
                    <p className="text-xs text-slate-500">{tool.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Artefacts</p>
                <p className="text-sm text-slate-500">Save outputs from tools or chats.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900">
                <Plus className="h-4 w-4" />
                Add note
              </button>
            </header>
            <ul className="mt-4 space-y-3">
              {artefacts.map((artefact) => (
                <li key={artefact.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{artefact.title}</p>
                      <p className="text-xs text-slate-500">{artefact.owner} · {artefact.updatedAt}</p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", artefactBadges[artefact.type])}>
                      {artefact.type}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              Drop a chat summary or upload an attachment to pin it here.
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-900/90 p-5 text-white">
            <p className="text-sm font-semibold">Need a new artefact?</p>
            <p className="mt-1 text-xs text-slate-200">Send any conversation to a tool and it’ll appear here for future reference.</p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20">
              <Archive className="h-4 w-4" />
              Manage library
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
