"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  FileSpreadsheet,
  FileText,
  Globe2,
  Image as ImageIcon,
  Layers3,
  Link2,
  ListChecks,
  Mail,
  Notebook,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { Project } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useExperience } from "@/components/providers/experience-provider";
import { Modal } from "@/components/ui/modal";
import type {
  WorkspaceArtefact,
  WorkspaceMessage,
  WorkspaceNoteCategory,
  WorkspaceSource,
  WorkspaceSourceType,
} from "@/types/workspace";

interface ProjectWorkspaceProps {
  project: Project;
}

interface ToolCard {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: string;
}

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

const seededArtefacts: WorkspaceArtefact[] = [
  {
    id: "art-001",
    title: "Council-ready summary",
    owner: "Avery Johnson",
    updatedAt: "3m ago",
    type: "summary",
    metadata: "Updated by Planning Pathway",
  },
  {
    id: "art-002",
    title: "Viability brief v2",
    owner: "Maya Patel",
    updatedAt: "1h ago",
    type: "brief",
    metadata: "Shared with stakeholders",
  },
  {
    id: "art-003",
    title: "Sustainability addendum",
    owner: "Notebook Agent",
    updatedAt: "Yesterday",
    type: "report",
    metadata: "Includes ESD commitments",
  },
];

const noteCategories: WorkspaceNoteCategory[] = ["Note", "Meeting minutes", "Observation", "Idea"];

const sourceIcons: Record<WorkspaceSourceType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  email: Mail,
  document: FileText,
  link: Link2,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  word: FileText,
  image: ImageIcon,
  gis: Globe2,
  other: Layers3,
};

const artefactBadges: Record<string, string> = {
  summary: "text-emerald-700 bg-emerald-50 border-emerald-200",
  brief: "text-blue-700 bg-blue-50 border-blue-200",
  report: "text-amber-700 bg-amber-50 border-amber-200",
  chat: "text-indigo-700 bg-indigo-50 border-indigo-200",
  note: "text-rose-700 bg-rose-50 border-rose-200",
};

export function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  const router = useRouter();
  const {
    getChatHistory,
    saveChatHistory,
    addArtefact,
    getArtefacts,
    getUploadUsage,
    recordUpload,
    recordToolUsage,
    appendSourceContext,
    getSourceContext,
    state,
  } = useExperience();

  const initialSources = useMemo<WorkspaceSource[]>(
    () => [
      {
        id: "src-1",
        name: "Council pre-lodgement feedback.eml",
        detail: `Forwarded by ${project.teamMembers[0]?.name ?? "council liaison"}`,
        type: "email",
        uploadedAt: "2 days ago",
        sizeLabel: "86 KB",
      },
      {
        id: "src-2",
        name: "ESD Statement draft.pdf",
        detail: "Uploaded 2 days ago · 14 pages",
        type: "pdf",
        uploadedAt: "2 days ago",
        sizeLabel: "1.2 MB",
        status: "In review",
      },
      {
        id: "src-3",
        name: "Flood overlay guidance",
        detail: "NSW Planning Portal",
        type: "link",
        uploadedAt: "Last week",
        sizeLabel: "Link",
      },
      {
        id: "src-4",
        name: `${project.name} feasibility deck.pptx`,
        detail: "Slides · Updated last week",
        type: "document",
        uploadedAt: "Last week",
        sizeLabel: "4.3 MB",
      },
    ],
    [project.name, project.teamMembers],
  );

  const fallbackMessages = useMemo(() => createFallbackMessages(project), [project]);

  const [sources, setSources] = useState<WorkspaceSource[]>(initialSources);
  const [messages, setMessages] = useState<WorkspaceMessage[]>(fallbackMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [upgradeModal, setUpgradeModal] = useState<null | "documents" | "tools">(null);
  const [toolContext, setToolContext] = useState<string | null>(null);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteType, setNoteType] = useState<WorkspaceNoteCategory>("Note");
  const [noteBody, setNoteBody] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const uploadUsage = getUploadUsage(project.id);

  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  useEffect(() => {
    const history = getChatHistory(project.id);
    if (history.length) {
      setMessages(history);
    } else {
      setMessages(fallbackMessages);
      saveChatHistory(project.id, fallbackMessages);
    }
  }, [fallbackMessages, getChatHistory, project.id, saveChatHistory]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const sendMessage = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    const newMessage: WorkspaceMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: trimmedInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((previous) => [...previous, newMessage]);
    setInput("");
    setIsThinking(true);
    const contextSnippets = getSourceContext(project.id);
    window.setTimeout(() => {
      const assistantMessage: WorkspaceMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: generateAssistantResponse({
          userMessage: trimmedInput,
          project,
          contextSnippets,
          sources,
        }),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((previous) => {
        const updated = [...previous, assistantMessage];
        saveChatHistory(project.id, updated);
        return updated;
      });
      setIsThinking(false);
    }, 900);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleRefresh = () => {
    const history = getChatHistory(project.id);
    if (history.length) {
      setMessages(history);
    } else {
      setMessages(fallbackMessages);
      saveChatHistory(project.id, fallbackMessages);
    }
    setInput("");
  };

  const handleSaveChat = () => {
    const timestampLabel = new Date().toLocaleString();
    const artefact: WorkspaceArtefact = {
      id: `chat-${Date.now()}`,
      title: `Chat Summary - ${timestampLabel}`,
      owner: "Workspace Agent",
      updatedAt: "Just now",
      type: "chat",
      metadata: `${messages.length} messages captured`,
    };
    addArtefact(project.id, artefact);
    showToast("Chat saved to artefacts");
  };

  const handleAddSourceClick = () => {
    if (uploadUsage.limit === 0 && state.userTier === "anonymous") {
      setUpgradeModal("documents");
      return;
    }
    setShowUploadModal(true);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      setUploadQueue([]);
      return;
    }
    setUploadQueue(Array.from(event.target.files));
  };

  const handleUploadConfirm = async () => {
    if (!uploadQueue.length) {
      setShowUploadModal(false);
      return;
    }
    if (uploadUsage.limit > 0 && uploadUsage.used + uploadQueue.length > uploadUsage.limit) {
      setUpgradeModal("documents");
      return;
    }

    const newSources: WorkspaceSource[] = [];
    for (const file of uploadQueue) {
      const type = determineSourceType(file.name);
      newSources.unshift({
        id: `upload-${Date.now()}-${file.name}`,
        name: file.name,
        detail: `${file.type || "File"}`,
        type,
        uploadedAt: new Date().toLocaleDateString(),
        sizeLabel: formatFileSize(file.size),
        status: "Synced",
      });
      const snippet = await extractContextSnippet(file);
      appendSourceContext(project.id, snippet);
    }

    setSources((previous) => [...newSources, ...previous]);
    recordUpload(project.id, uploadQueue.length);
    showToast(`Uploaded ${uploadQueue.length} document${uploadQueue.length === 1 ? "" : "s"}`);
    setUploadQueue([]);
    setShowUploadModal(false);
  };

  const handleToolClick = (tool: ToolCard) => {
    const usage = recordToolUsage(project.id, tool.id);
    if (!usage.allowed) {
      setToolContext(tool.name);
      setUpgradeModal("tools");
      return;
    }
    showToast(`${tool.name} received the latest chat context`);
  };

  const experienceArtefacts = getArtefacts(project.id);
  const artefacts = useMemo(() => [...seededArtefacts, ...experienceArtefacts], [experienceArtefacts]);

  const handleSaveNote = () => {
    if (!noteTitle.trim()) {
      showToast("Add a title before saving", "error");
      return;
    }
    const preview = stripHtml(noteBody);
    const noteArtefact: WorkspaceArtefact = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim(),
      owner: "You",
      updatedAt: "Just now",
      type: "note",
      noteType,
      metadata: `${preview.slice(0, 80)}${preview.length > 80 ? "…" : ""}`,
    };
    addArtefact(project.id, noteArtefact);
    setIsNoteEditorOpen(false);
    setNoteBody("");
    setNoteTitle("");
    setNoteType("Note");
    showToast("Note saved to artefacts");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-base font-semibold text-slate-900">Plannera.ai</span>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
          >
            ← My Projects
          </button>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900">
          <Sparkles className="h-4 w-4" />
          Get help
        </button>
      </div>

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
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Usage</p>
              <p className="text-xs text-slate-500">
                {uploadUsage.limit === 0 ? "Sign up to upload" : `${uploadUsage.used} of ${uploadUsage.limit} documents used`}
              </p>
            </div>
          </header>
          <button
            type="button"
            onClick={handleAddSourceClick}
            className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          <ul className="space-y-3">
            {sources.map((source) => {
              const Icon = sourceIcons[source.type] ?? FileText;
              return (
                <li key={source.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 rounded-xl bg-white p-2 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{source.name}</p>
                      <p className="text-xs text-slate-500">{source.detail}</p>
                      <p className="text-[11px] text-slate-400">{source.uploadedAt} · {source.sizeLabel}</p>
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveChat}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
              >
                <Save className="h-4 w-4" />
                Save Chat
              </button>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </header>
          <div className="flex-1 space-y-4 overflow-hidden px-6 py-6">
            <div ref={chatScrollRef} className="h-[420px] space-y-4 overflow-y-auto pr-2">
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
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Drafting response…
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
                onKeyDown={handleKeyDown}
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
          {isNoteEditorOpen ? (
            <NoteEditor
              noteTitle={noteTitle}
              onTitleChange={setNoteTitle}
              noteType={noteType}
              onTypeChange={setNoteType}
              noteBody={noteBody}
              onBodyChange={setNoteBody}
              onSave={handleSaveNote}
              onCancel={() => setIsNoteEditorOpen(false)}
            />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tools & Agents</p>
                  <p className="text-sm text-slate-500">Send context or open in split view.</p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Pro access
                </span>
              </header>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleToolClick(tool)}
                      className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br", tool.accent)}>
                          <Icon className="h-4 w-4 text-slate-900" />
                        </span>
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Pro</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{tool.name}</p>
                      <p className="text-xs text-slate-500">{tool.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Artefacts</p>
                <p className="text-sm text-slate-500">Save outputs from tools or chats.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteEditorOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
              >
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
                      <p className="text-xs text-slate-500">
                        {artefact.owner} · {artefact.updatedAt}
                        {artefact.noteType ? ` · ${artefact.noteType}` : ""}
                      </p>
                      {artefact.metadata ? <p className="text-[11px] text-slate-400">{artefact.metadata}</p> : null}
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

      <Modal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadQueue([]);
        }}
        title="Upload project sources"
        description="Sync PDFs, GIS files, and council emails to keep the assistant grounded in your evidence."
      >
        <label
          htmlFor="source-upload"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
        >
          <Upload className="mb-2 h-6 w-6 text-slate-400" />
          Drag & drop or click to browse
          <span className="mt-2 text-xs text-slate-400">PDF, Word, Excel, JPEG/PNG, EML/MSG, SHP/KML/GeoJSON</span>
          <input
            id="source-upload"
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.eml,.msg,.shp,.kml,.geojson,.txt"
            onChange={handleFileSelection}
          />
        </label>
        {uploadQueue.length ? (
          <ul className="mt-4 space-y-2 rounded-2xl border border-slate-100 p-3 text-sm text-slate-600">
            {uploadQueue.map((file) => (
              <li key={file.name} className="flex items-center justify-between">
                <span>{file.name}</span>
                <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={handleUploadConfirm}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUploadModal(false);
              setUploadQueue([]);
            }}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={upgradeModal === "documents"}
        onClose={() => setUpgradeModal(null)}
        title="Upload limit reached"
        description="You've used your 1 free project. Sign up to create unlimited projects and upload documents."
      >
        <div className="space-y-3">
          <a
            href="/signin"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign up to continue
          </a>
          <button
            type="button"
            onClick={() => setUpgradeModal(null)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Maybe later
          </button>
        </div>
      </Modal>

      <Modal
        open={upgradeModal === "tools"}
        onClose={() => setUpgradeModal(null)}
        title="Tools are available on paid plans"
        description="Sign up free to unlock 5 document uploads, or upgrade for full access to planning agents."
      >
        <p className="text-sm text-slate-600">
          {toolContext ? `${toolContext} is a premium agent that needs an account.` : "Create an account to unlock workspace tools."}
        </p>
        <div className="space-y-3">
          <a
            href="/signin"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign up free
          </a>
          <button
            type="button"
            onClick={() => setUpgradeModal(null)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Continue later
          </button>
        </div>
      </Modal>

      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 rounded-2xl px-4 py-3 text-sm shadow-lg",
            toast.variant === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white",
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function createFallbackMessages(project: Project): WorkspaceMessage[] {
  return [
    {
      id: "msg-seed-1",
      role: "assistant",
      content: `Here’s the approvals pathway we generated for ${project.name}—key actions are lodging the revised concept package and validating the flood overlay assumptions.`,
      timestamp: "09:14",
    },
    {
      id: "msg-seed-2",
      role: "user",
      content: "Summarise what we need from council before Friday.",
      timestamp: "09:16",
    },
    {
      id: "msg-seed-3",
      role: "assistant",
      content:
        "You’ll need confirmation on traffic impact scope, written acceptance of the updated setbacks, and the preferred sequencing for community consultation.",
      timestamp: "09:16",
    },
  ];
}

function determineSourceType(filename: string): WorkspaceSourceType {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return "other";
  if (["pdf"].includes(extension)) return "pdf";
  if (["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet";
  if (["doc", "docx", "rtf"].includes(extension)) return "word";
  if (["jpg", "jpeg", "png"].includes(extension)) return "image";
  if (["shp", "kml", "geojson"].includes(extension)) return "gis";
  if (["eml", "msg"].includes(extension)) return "email";
  if (extension === "link") return "link";
  return "document";
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

async function extractContextSnippet(file: File) {
  const readableExtensions = ["txt", "md", "geojson", "csv"]; // sample supported types
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type.startsWith("text/") || (extension && readableExtensions.includes(extension))) {
    const text = await file.text();
    return text.slice(0, 500);
  }
  return `${file.name} uploaded ${new Date().toLocaleDateString()}`;
}

function stripHtml(value: string) {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function generateAssistantResponse({
  userMessage,
  project,
  contextSnippets,
  sources,
}: {
  userMessage: string;
  project: Project;
  contextSnippets: string[];
  sources: WorkspaceSource[];
}) {
  const normalized = userMessage.toLowerCase();
  const teamMembers = project.teamMembers ?? [];
  const hasContext = contextSnippets.length > 0;
  const sanitizedPrompt = stripHtml(userMessage);
  const promptLabel = sanitizedPrompt
    ? sanitizedPrompt.length > 180
      ? `${sanitizedPrompt.slice(0, 180)}…`
      : sanitizedPrompt
    : "that update";
  const questionRegex = /(\?|\bwhat\b|\bhow\b|\bcan\b|\bcould\b|\bwhere\b|\bwhy\b|\bwhen\b|\bdo you\b)/i;
  const requestKeywords = ["prepare", "draft", "create", "write", "send", "share", "brief", "note", "plan", "summarise", "summarize"];
  const isActionRequest = requestKeywords.some((keyword) => normalized.includes(keyword));
  const isQuestion = questionRegex.test(userMessage);

  const describeSources = () => {
    if (!sources.length) {
      return "I don't have any workspace documents yet, so feel free to use the Add button in Sources and I'll cite anything you upload in future answers.";
    }
    const highlightedSources = sources.slice(0, 3).map((source) => `${source.name} (${source.type})`);
    const remaining = sources.length - highlightedSources.length;
    const extras = remaining > 0 ? `, plus ${remaining} other source${remaining === 1 ? "" : "s"}` : "";
    const contextLabel = hasContext
      ? `I've already indexed ${contextSnippets.length} snippet${contextSnippets.length === 1 ? "" : "s"} from those uploads, so I'll reference them as I reply.`
      : "I'll read through each upload as soon as it's synced so I can cite it in answers.";
    return `Here's what I can reference right now: ${highlightedSources.join(", ")}${extras}. ${contextLabel}`;
  };

  const describeTeam = () => {
    if (!teamMembers.length) {
      return "This workspace is only linked to you right now, but I can still package updates as artefacts if you need to share them.";
    }
    const highlightedTeam = teamMembers.slice(0, 3).map((member) => `${member.name} (${member.role})`);
    const remaining = teamMembers.length - highlightedTeam.length;
    const extras = remaining > 0 ? ` and ${remaining} other teammate${remaining === 1 ? "" : "s"}` : "";
    return `You're collaborating here with ${highlightedTeam.join(", ")}${extras}. I can turn our chats into summaries to send their way when you're ready.`;
  };

  if (
    normalized.includes("what data") ||
    normalized.includes("data do you") ||
    normalized.includes("have access") ||
    normalized.includes("what info") ||
    normalized.includes("what information") ||
    normalized.includes("sources do you") ||
    normalized.includes("documents do you")
  ) {
    return describeSources();
  }

  if (normalized.includes("who") && normalized.includes("team")) {
    return describeTeam();
  }

  if (normalized.includes("team")) {
    return `${describeTeam()} Just let me know if you want me to capture actions for a specific person.`;
  }

  if (normalized.includes("timeline") || normalized.includes("deadline") || normalized.includes("when")) {
    const scheduleTip = project.endDate
      ? `You're tracking toward ${new Date(project.endDate).toLocaleDateString()} and I can keep milestones aligned to that.`
      : "Drop in any target dates and I'll tag the follow-up tasks so the team sees them.";
    return `${scheduleTip} In the meantime I’ll continue organising the approvals pathway for ${project.name}.`;
  }

  if (isQuestion || isActionRequest) {
    const responseParts: string[] = [];
    responseParts.push(`I'm working directly off your note about "${promptLabel}" for ${project.name}.`);
    if (normalized.includes("api") || normalized.includes("backend") || normalized.includes("integration")) {
      responseParts.push(
        "I'll line up which internal and council APIs we can pull from so the answer stays grounded in verifiable data, then surface the relevant excerpts back here."
      );
    }
    if (normalized.includes("prepare") || normalized.includes("draft") || normalized.includes("brief") || normalized.includes("note")) {
      responseParts.push(
        "I'll start structuring that into a shareable brief—once you're happy I can save it as an artefact or email-style note for the team."
      );
    }
    if (!responseParts.some((part) => part.includes("brief")) && normalized.includes("see")) {
      responseParts.push("I'll surface a concise view so you can sanity-check it before we distribute anything wider.");
    }
    if (hasContext) {
      responseParts.push(
        `Expect callouts to ${contextSnippets.length} synced source${contextSnippets.length === 1 ? "" : "s"} plus any new uploads you cue up.`
      );
    } else {
      responseParts.push("If you drop in supporting documents, I'll cite them inline so every answer is auditable.");
    }
    responseParts.push("Let me know if you want this routed to a specific tool or agent next.");
    return responseParts.join(" ");
  }

  const defaultResponse: string[] = [];
  defaultResponse.push(`Captured that update for ${project.name}.`);
  if (hasContext) {
    defaultResponse.push(
      `I'll reference ${contextSnippets.length} synced source${contextSnippets.length === 1 ? "" : "s"} and keep the response grounded in them.`
    );
  } else {
    defaultResponse.push("Upload any council emails, drawings, or studies and I'll automatically weave them into the answers.");
  }
  defaultResponse.push(
    "Say the word if you'd like this to become a shareable artefact, email-style note, or briefing for another agent."
  );
  return defaultResponse.join(" ");
}

interface NoteEditorProps {
  noteTitle: string;
  onTitleChange: (value: string) => void;
  noteType: WorkspaceNoteCategory;
  onTypeChange: (value: WorkspaceNoteCategory) => void;
  noteBody: string;
  onBodyChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function NoteEditor({ noteTitle, onTitleChange, noteType, onTypeChange, noteBody, onBodyChange, onSave, onCancel }: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onBodyChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onBodyChange(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const url = window.prompt("Paste the URL");
    if (url) {
      format("createLink", url);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Note editor</p>
          <p className="text-sm text-slate-500">Draft notes, minutes and ideas.</p>
        </div>
      </header>
      <div className="mt-4 space-y-3">
        <input
          value={noteTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Add a title"
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
        <select
          value={noteType}
          onChange={(event) => onTypeChange(event.target.value as WorkspaceNoteCategory)}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        >
          {noteCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => format("bold")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700"
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => format("italic")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700"
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => format("insertUnorderedList")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700"
          >
            Bullets
          </button>
          <button
            type="button"
            onClick={() => format("insertOrderedList")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700"
          >
            Numbers
          </button>
          <button
            type="button"
            onClick={handleLink}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700"
          >
            Link
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="min-h-[160px] rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-slate-900"
          dangerouslySetInnerHTML={{ __html: noteBody }}
        />
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Save as artefact
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
