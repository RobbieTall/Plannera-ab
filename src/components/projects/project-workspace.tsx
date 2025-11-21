"use client";

import {
  ChangeEvent,
  ComponentType,
  FormEvent,
  KeyboardEvent,
  SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  Check,
  FileSpreadsheet,
  FileText,
  Globe2,
  Image as ImageIcon,
  Layers3,
  Link2,
  ListChecks,
  ListFilter,
  Mail,
  MapPin,
  Moon,
  Notebook,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { Project } from "@/lib/mock-data";
import { setSiteFromCandidate, toPersistableSiteCandidate } from "@/lib/site-context-client";
import { cn } from "@/lib/utils";
import { useExperience } from "@/components/providers/experience-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { MapSnapshotsPanel } from "@/components/projects/map-snapshots-panel";
import { Modal } from "@/components/ui/modal";
import type {
  UserTier,
  WorkspaceArtefact,
  WorkspaceMessage,
  WorkspaceNoteCategory,
  WorkspaceSessionSignals,
  WorkspaceSource,
  WorkspaceSourceType,
} from "@/types/workspace";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import { ACCEPTED_EXTENSIONS } from "@/lib/upload-constraints";

interface ProjectWorkspaceProps {
  project: Project;
}

interface ToolCard {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
}

type SiteSelectionState = {
  source: "chat" | "manual";
  addressInput: string;
  candidates: SiteCandidate[];
  pendingQuestion?: string;
};

const normaliseCandidateForRequest = toPersistableSiteCandidate;

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

const noteCategories: WorkspaceNoteCategory[] = ["Note", "Meeting minutes", "Observation", "Idea"];

const ACCEPTED_EXTENSION_SET = new Set(ACCEPTED_EXTENSIONS.map((ext) => ext.replace(".", "")));

const sourceTypeLabels: Record<WorkspaceSourceType, string> = {
  email: "Email",
  document: "Document",
  link: "Link",
  pdf: "PDF",
  spreadsheet: "Spreadsheet",
  word: "Word",
  image: "Image",
  gis: "GIS",
  other: "Other",
};

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

const zoningPattern = /\b(R1|R2|R3|R4|R5|B1|B2|B3|B4|IN1|IN2|MU1|E1|E2|E3|E4|SP1|SP2|W1|W2)\b/i;

function extractSessionSignalsFromText(message: string, projectName: string): Partial<WorkspaceSessionSignals> {
  const normalized = message.toLowerCase();
  const zoneMatch = message.match(zoningPattern);
  const lgaMatch = normalized.match(/(sydney|parramatta|newcastle|wollongong|hornsby|blacktown)/);
  const sanitized = stripHtml(message);
  const intent = normalized.includes("summary")
    ? "Summarising updates"
    : normalized.includes("upload")
      ? "Coordinating documents"
      : normalized.includes("risk") || normalized.includes("hurdle")
        ? "Surfacing risks"
        : normalized.includes("timeline") || normalized.includes("deadline")
          ? "Planning a timeline"
          : `Chatting about ${projectName}`;

  return {
    zone: zoneMatch ? zoneMatch[1].toUpperCase() : undefined,
    lga: lgaMatch ? `${lgaMatch[1][0]?.toUpperCase() ?? ""}${lgaMatch[1].slice(1)} Council` : undefined,
    lastSummary: sanitized ? `${sanitized.slice(0, 160)}${sanitized.length > 160 ? "…" : ""}` : undefined,
    lastIntent: intent,
  };
}

function deriveSignalsFromAssistantPayload({
  lga,
  zone,
  instruments,
  reply,
  recentSource,
}: {
  lga?: string;
  zone?: string;
  instruments?: string[];
  reply?: string;
  recentSource?: string;
}): WorkspaceSessionSignals {
  const replySummary = reply ? summarizeReply(reply) : undefined;
  return {
    lga,
    zone,
    instruments,
    recentSource,
    lastSummary: replySummary,
    lastIntent: lga || zone ? "Planning controls lookup" : undefined,
  };
}

export function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    getChatHistory,
    saveChatHistory,
    addArtefact,
    getArtefacts,
    getUploadUsage,
    recordUpload,
    recordToolUsage,
    appendSourceContext,
    setSessionSignals,
    getSessionSignals,
    state,
  } = useExperience();
  const projectKey = project.publicId ?? project.id;

  const [sources, setSources] = useState<WorkspaceSource[]>([]);
  const [sourceFilter, setSourceFilter] = useState<WorkspaceSourceType | "all">("all");
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<
    Record<string, { status: "pending" | "uploading" | "success" | "error"; message?: string }>
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [serverLimitReached, setServerLimitReached] = useState(false);
  const [showMapsPanel, setShowMapsPanel] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<null | "documents" | "tools">(null);
  const [toolContext, setToolContext] = useState<string | null>(null);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteType, setNoteType] = useState<WorkspaceNoteCategory>("Note");
  const [noteBody, setNoteBody] = useState("");
  const [sessionSignals, setSessionSignalsState] = useState<WorkspaceSessionSignals>(() =>
    getSessionSignals(projectKey)
  );
  const [siteContext, setSiteContext] = useState<SiteContextSummary | null>(null);
  const [siteSelection, setSiteSelection] = useState<SiteSelectionState | null>(null);
  const [siteSelectionCandidateId, setSiteSelectionCandidateId] = useState<string | null>(null);
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [siteSelectionError, setSiteSelectionError] = useState<string | null>(null);
  const [siteSearchAvailable, setSiteSearchAvailable] = useState<"loading" | "ok" | "missing_env">("loading");
  const [suggestions, setSuggestions] = useState<SiteCandidate[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState<number | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SiteCandidate | null>(null);
  const [isSiteSearchPending, setIsSiteSearchPending] = useState(false);
  const [isConfirmingSite, setIsConfirmingSite] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const siteSearchInputRef = useRef<HTMLInputElement | null>(null);
  const suggestionAbortRef = useRef<AbortController | null>(null);
  const suggestionTimeoutRef = useRef<number | null>(null);
  const siteContextMutationsDisabled =
    process.env.NEXT_PUBLIC_DISABLE_SITE_CONTEXT === "true";

  const uploadUsage = getUploadUsage(projectKey);
  const uploadLimitReached = serverLimitReached || (uploadUsage.limit > 0 && uploadUsage.used >= uploadUsage.limit);
  const limitMessage = uploadLimitReached
    ? state.userTier === "guest"
      ? "You’ve used your free upload. Create a free account to upload more documents."
      : state.userTier === "free"
        ? "You’ve reached your 5-document limit. Upgrade to a paid plan to upload more."
        : "You've reached this workspace's document cap. Contact us to extend your plan."
    : null;
  const documentCta =
    state.userTier === "guest"
      ? { href: "/signin", label: "Create a free account" }
      : state.userTier === "free"
        ? { href: "mailto:hello@plannera.ai", label: "Contact sales to upgrade" }
        : { href: "mailto:hello@plannera.ai", label: "Contact us to extend your plan" };

  const displayedSources = useMemo(() => {
    if (sourceFilter === "all") {
      return sources;
    }
    const matching = sources.filter((source) => source.type === sourceFilter);
    const nonMatching = sources.filter((source) => source.type !== sourceFilter);
    return [...matching, ...nonMatching];
  }, [sourceFilter, sources]);

  const activeSourceFilterLabel = sourceFilter === "all" ? "All types" : sourceTypeLabels[sourceFilter];
  const isDarkMode = theme === "dark";


  const fetchSiteSearchAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/site-resolver/health");
      const data: { status?: "ok" | "missing_env" } = await response.json();
      if (response.ok && data?.status === "ok") {
        setSiteSearchAvailable("ok");
        return;
      }
      if (data?.status === "missing_env") {
        setSiteSearchAvailable("missing_env");
        return;
      }
      setSiteSearchAvailable("missing_env");
    } catch (error) {
      console.warn("Site resolver health check failed", error);
      setSiteSearchAvailable("missing_env");
    }
  }, []);

  useEffect(() => {
    setSessionSignalsState(getSessionSignals(projectKey));
  }, [getSessionSignals, projectKey]);

  useEffect(() => {
    if (siteSelection?.source === "manual" && siteSearchInputRef.current) {
      siteSearchInputRef.current.focus();
      siteSearchInputRef.current.select();
    }
  }, [siteSelection]);

  useEffect(() => {
    const history = getChatHistory(projectKey);
    if (history.length) {
      setMessages(history);
    } else {
      setMessages([]);
    }
  }, [getChatHistory, projectKey]);

  useEffect(() => {
    let cancelled = false;
    const loadUploads = async () => {
      try {
        const response = await fetch(`/api/projects/${projectKey}/uploads`);
        if (!response.ok) {
          return;
        }
        const data: {
          uploads?: Array<{
            id: string;
            fileName: string;
            fileExtension?: string | null;
            mimeType?: string | null;
            fileSize: number;
            publicUrl: string;
            createdAt: string;
          }>;
          usage?: { used?: number };
        } = await response.json();

        if (cancelled) return;

        const mappedSources: WorkspaceSource[] = (data.uploads ?? []).map((upload) => ({
          id: upload.id,
          name: upload.fileName,
          detail: upload.mimeType ?? upload.fileExtension ?? "File",
          type: determineSourceType(upload.fileName),
          uploadedAt: new Date(upload.createdAt).toLocaleDateString(),
          sizeLabel: formatFileSize(upload.fileSize),
          status: "Synced",
          url: upload.publicUrl,
          fileExtension: upload.fileExtension ?? null,
        }));

        setSources(mappedSources);

        if (typeof data.usage?.used === "number") {
          const delta = Math.max(data.usage.used - uploadUsage.used, 0);
          if (delta > 0) {
            recordUpload(projectKey, delta);
          }
        }
      } catch (error) {
        console.error("Failed to load project uploads", error);
      }
    };

    void loadUploads();
    return () => {
      cancelled = true;
    };
  }, [projectKey, recordUpload, uploadUsage.used]);

  useEffect(() => {
    void fetchSiteSearchAvailability();
  }, [fetchSiteSearchAvailability]);

  useEffect(() => {
    if (siteSelection) {
      void fetchSiteSearchAvailability();
    }
  }, [fetchSiteSearchAvailability, siteSelection]);

  useEffect(() => {
    let isMounted = true;
    const loadSiteContext = async () => {
      try {
        const response = await fetch(`/api/site-context?projectId=${projectKey}`);
        if (!response.ok) {
          return;
        }
        const data: { siteContext: SiteContextSummary | null } = await response.json();
        if (isMounted) {
          setSiteContext(data.siteContext ?? null);
        }
      } catch (error) {
        console.warn("Workspace site context load failed", error);
      }
    };
    void loadSiteContext();
    return () => {
      isMounted = false;
    };
  }, [projectKey]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (siteSelection?.source !== "manual") {
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
        suggestionAbortRef.current = null;
      }
      if (suggestionTimeoutRef.current) {
        window.clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = null;
      }
      setSuggestions([]);
      setSelectedSuggestion(null);
      setHighlightedSuggestionIndex(null);
      setIsSuggesting(false);
      setSiteSearchQuery("");
    }
  }, [siteSelection]);

  useEffect(() => {
    if (!siteSelection || siteSelection.source !== "manual") {
      if (suggestions.length) {
        setSuggestions([]);
      }
      return;
    }
    if (!suggestionsEnabled) {
      setSuggestions([]);
      setIsSuggesting(false);
      setHighlightedSuggestionIndex(null);
      return;
    }
    if (siteSearchAvailable !== "ok") {
      setSuggestions([]);
      setIsSuggesting(false);
      setHighlightedSuggestionIndex(null);
      return;
    }
    const trimmedQuery = siteSearchQuery.trim();
    if (selectedSuggestion && selectedSuggestion.formattedAddress === trimmedQuery) {
      setSuggestions([]);
      setIsSuggesting(false);
      setHighlightedSuggestionIndex(null);
      return;
    }
    if (trimmedQuery.length < 3) {
      setSuggestions([]);
      setIsSuggesting(false);
      setHighlightedSuggestionIndex(null);
      return;
    }
    setIsSuggesting(true);
    setSiteSelectionError(null);
    const controller = new AbortController();
    suggestionAbortRef.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/site-context/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmedQuery }),
          signal: controller.signal,
        });
        const data: { status?: string; candidates?: SiteCandidate[]; error?: string } = await response.json();
        if (!response.ok) {
          if (data?.error === "property_search_failed") {
            setSiteSelectionError("Address search failed. Please try again.");
          } else if (data?.error === "property_search_not_configured") {
            setSiteSearchAvailable("missing_env");
            setSiteSelectionError(null);
          }
          setSuggestions([]);
          setHighlightedSuggestionIndex(null);
          return;
        }
        const candidates = (data.candidates ?? []).map((candidate) => normaliseCandidateForRequest(candidate));
        setSuggestions(candidates);
        setHighlightedSuggestionIndex(candidates.length ? 0 : null);
        setSiteSelectionError(
          candidates.length ? null : "No NSW address matches were found. Try refining the suburb or street number.",
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Site suggest error", error);
        setSiteSelectionError("Address search failed. Please try again.");
        setSuggestions([]);
        setHighlightedSuggestionIndex(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggesting(false);
        }
        if (suggestionAbortRef.current === controller) {
          suggestionAbortRef.current = null;
        }
        if (suggestionTimeoutRef.current === timer) {
          suggestionTimeoutRef.current = null;
        }
      }
    }, 350);
    suggestionTimeoutRef.current = timer;
    return () => {
      controller.abort();
      if (suggestionAbortRef.current === controller) {
        suggestionAbortRef.current = null;
      }
      window.clearTimeout(timer);
      if (suggestionTimeoutRef.current === timer) {
        suggestionTimeoutRef.current = null;
      }
    };
  }, [
    selectedSuggestion,
    siteSearchQuery,
    siteSelection,
    siteSearchAvailable,
    suggestionsEnabled,
    suggestions.length,
  ]);

  const applySessionSignals = useCallback(
    (updates: Partial<WorkspaceSessionSignals>) => {
      setSessionSignalsState((previous) => {
        const merged = { ...previous, ...updates };
        setSessionSignals(projectKey, merged);
        return merged;
      });
    },
    [projectKey, setSessionSignals]
  );

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const sendMessage = async (options?: { message?: string; skipUserMessage?: boolean }) => {
    const prompt = options?.message ?? input;
    const trimmedInput = prompt.trim();
    if (!trimmedInput) return;

    const skipUserMessage = options?.skipUserMessage ?? false;

    if (!skipUserMessage) {
      applySessionSignals({
        ...extractSessionSignalsFromText(trimmedInput, project.name),
        recentSource: sources[0]?.name ?? sessionSignals.recentSource,
      });
      const newMessage: WorkspaceMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: trimmedInput,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((previous) => {
        const updated = [...previous, newMessage];
        saveChatHistory(projectKey, updated);
        return updated;
      });
      setInput("");
    }

    setIsThinking(true);
    try {
      const response = await fetch("/api/workspace-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedInput,
          projectId: projectKey,
          projectName: project.name,
        }),
      });
      const data: {
        reply?: string;
        lga?: string;
        zone?: string;
        instruments?: string[];
        siteContext?: SiteContextSummary | null;
        requiresSiteSelection?: boolean;
        candidates?: SiteCandidate[];
        addressInput?: string;
      } = await response.json();

      if (data.siteContext) {
        setSiteContext(data.siteContext);
      }

      if (data.requiresSiteSelection && data.candidates?.length) {
        const normalizedCandidates = data.candidates.map((candidate) => normaliseCandidateForRequest(candidate));
        setSiteSelection({
          source: "chat",
          addressInput: data.addressInput ?? trimmedInput,
          candidates: normalizedCandidates,
          pendingQuestion: trimmedInput,
        });
        setSiteSelectionCandidateId(null);
        setSiteSelectionError(null);
        if (!skipUserMessage) {
          setInput(trimmedInput);
        }
        return;
      }

      const needsLocation = !data.zone && !data.lga;
      const replyFallback = needsLocation
        ? "I can tailor this better with the site address, suburb, or zone (e.g. B4 Mixed Use)."
        : "I’ll keep looking for the right LEP/SEPP clauses—share any uploads or zones to sharpen the answer.";
      const assistantMessage: WorkspaceMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.reply ?? replyFallback,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      applySessionSignals(
        deriveSignalsFromAssistantPayload({
          reply: assistantMessage.content,
          lga: data?.lga,
          zone: data?.zone,
          instruments: data?.instruments,
          recentSource: sources[0]?.name,
        })
      );
      setMessages((previous) => {
        const updated = [...previous, assistantMessage];
        saveChatHistory(projectKey, updated);
        return updated;
      });
    } catch (error) {
      console.error("Workspace chat send error", error);
      const assistantMessage: WorkspaceMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content:
          "I couldn’t retrieve the Sydney LEP or SEPP clauses right now. Please try again or add the council area and zone for a precise lookup.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((previous) => {
        const updated = [...previous, assistantMessage];
        saveChatHistory(projectKey, updated);
        return updated;
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleRefresh = () => {
    setMessages([]);
    saveChatHistory(projectKey, []);
    setSessionSignalsState({});
    setSessionSignals(projectKey, {});
    setInput("");
  };

  const handleSaveChat = () => {
    const timestampLabel = new Date().toLocaleString();
    const messagesSnapshot = messages.map((message) => ({ ...message }));
    const artefact: WorkspaceArtefact = {
      id: `chat-${Date.now()}`,
      title: `Chat Summary - ${timestampLabel}`,
      owner: "Workspace Agent",
      updatedAt: "Just now",
      type: "chat",
      metadata: `${messages.length} messages captured`,
      messages: messagesSnapshot,
    };
    addArtefact(projectKey, artefact);
    showToast("Chat saved to artefacts");
  };

  const handleArtefactOpen = (artefact: WorkspaceArtefact) => {
    if (artefact.type !== "chat" || !artefact.messages?.length) {
      return;
    }
    setMessages(artefact.messages);
    saveChatHistory(projectKey, artefact.messages);
    showToast(`Restored ${artefact.messages.length} chat message${artefact.messages.length === 1 ? "" : "s"}`);
  };

  const openManualSiteSelection = () => {
    void fetchSiteSearchAvailability();
    setSiteSelection({ source: "manual", addressInput: "", candidates: [] });
    setSiteSelectionCandidateId(null);
    setSiteSelectionError(null);
    setSiteSearchQuery("");
    setSuggestions([]);
    setSelectedSuggestion(null);
    setHighlightedSuggestionIndex(null);
    setSuggestionsEnabled(true);
  };

  const closeSiteSelection = () => {
    setSiteSelection(null);
    setSiteSelectionCandidateId(null);
    setSiteSelectionError(null);
    setSiteSearchQuery("");
    setSuggestions([]);
    setSelectedSuggestion(null);
    setHighlightedSuggestionIndex(null);
    setSuggestionsEnabled(true);
  };

  const dismissSuggestionOverlay = useCallback(() => {
    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort();
      suggestionAbortRef.current = null;
    }
    if (suggestionTimeoutRef.current) {
      window.clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = null;
    }
    setIsSuggesting(false);
    setSuggestions([]);
    setHighlightedSuggestionIndex(null);
    setSuggestionsEnabled(false);
  }, []);

  const applySuggestionSelection = (candidate: SiteCandidate) => {
    setSelectedSuggestion(candidate);
    setSiteSelection({ source: "manual", addressInput: candidate.formattedAddress, candidates: [candidate] });
    setSiteSelectionCandidateId(candidate.id);
    setSiteSelectionError(null);
    setSiteSearchQuery(candidate.formattedAddress);
    dismissSuggestionOverlay();
  };

  const handleSiteSearch = async () => {
    if (!siteSelection || siteSelection.source !== "manual") {
      return;
    }
    dismissSuggestionOverlay();
    const trimmedQuery = siteSearchQuery.trim();
    if (!trimmedQuery) {
      setSiteSelectionError("Enter an NSW address or suburb to search.");
      return;
    }

    if (selectedSuggestion) {
      await handleSiteCandidateConfirm(selectedSuggestion);
      return;
    }

    if (siteSearchAvailable !== "ok") {
      setSiteSelection((previous) =>
        previous ? { ...previous, addressInput: trimmedQuery, candidates: [] } : previous,
      );
      setSiteSelectionCandidateId(null);
      setSelectedSuggestion(null);
      setSiteSelectionError(null);
      setSuggestions([]);
      setHighlightedSuggestionIndex(null);
      return;
    }

    setIsSiteSearchPending(true);
    setSiteSelectionError(null);
    setSiteSelectionCandidateId(null);
    setHighlightedSuggestionIndex(null);
    setSuggestions([]);
    try {
      const response = await fetch("/api/site-context/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
      });
      const data: { candidates?: SiteCandidate[]; message?: string; error?: string } = await response.json();
      if (!response.ok) {
        if (data?.error === "property_search_failed") {
          setSiteSelectionError("Address search failed. Please try again.");
          return;
        }
        if (data?.error === "property_search_not_configured") {
          setSiteSearchAvailable("missing_env");
          setSiteSelectionError(null);
          return;
        }
        throw new Error(data?.message ?? "Address search failed");
      }
      const normalizedCandidates = (data.candidates ?? []).map((candidate) => normaliseCandidateForRequest(candidate));
      setSiteSelection((previous) =>
        previous ? { ...previous, addressInput: trimmedQuery, candidates: normalizedCandidates } : previous,
      );
      setSiteSelectionCandidateId(null);
      setSelectedSuggestion(null);
      if (!data.candidates?.length) {
        setSiteSelectionError("No NSW address matches were found. Try refining the suburb or street number.");
      }
    } catch (error) {
      console.error("Site search error", error);
      setSiteSelectionError("Address search failed. Please try again.");
    } finally {
      setIsSiteSearchPending(false);
    }
  };

  const injectSelectedSiteIntoChat = async (
    address: string,
    pendingQuestion?: string,
  ) => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      return;
    }

    const siteMessage = `My site is ${trimmedAddress}.`;
    setSiteSelectionError(null);
    closeSiteSelection();
    await sendMessage({ message: siteMessage });

    if (pendingQuestion) {
      await sendMessage({ message: pendingQuestion, skipUserMessage: true });
    }
  };

  const handleSiteCandidateConfirm = async (candidateOverride?: SiteCandidate) => {
    const selectedCandidate =
      candidateOverride ??
      selectedSuggestion ??
      (siteSelectionCandidateId ? siteSelection?.candidates.find((candidate) => candidate.id === siteSelectionCandidateId) : null);
    const manualAddressInput =
      siteSelection?.addressInput || siteSearchQuery || selectedCandidate?.formattedAddress || input;

    if (siteSearchAvailable === "missing_env" && !selectedCandidate) {
      const trimmedAddress = manualAddressInput.trim();
      if (!trimmedAddress) {
        setSiteSelectionError("Enter an NSW address before confirming.");
        return;
      }
      setIsConfirmingSite(true);
      setSiteSelectionError(null);
      try {
        const response = await fetch("/api/site-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectKey,
            rawAddress: trimmedAddress,
            lgaName: siteContext?.lgaName ?? sessionSignals.lga ?? null,
            lgaCode: siteContext?.lgaCode ?? null,
            resolverStatus: "manual_no_property_api",
          }),
        });
        const data: { siteContext?: SiteContextSummary | null; message?: string } = await response.json();
        if (!response.ok) {
          throw new Error(data?.message ?? "Unable to save site");
        }
        setSiteContext(data.siteContext ?? null);
        const pendingQuestion = siteSelection?.pendingQuestion;
        closeSiteSelection();
        if (pendingQuestion) {
          await sendMessage({ message: pendingQuestion, skipUserMessage: true });
        }
      } catch (error) {
        console.error("Manual site confirm error", error);
        setSiteSelectionError("Unable to save the selected site. Please try again.");
      } finally {
        setIsConfirmingSite(false);
      }
      return;
    }
    if (!selectedCandidate) {
      setSiteSelectionError("Select a valid NSW site before confirming.");
      return;
    }
    const normalizedCandidate = normaliseCandidateForRequest(selectedCandidate);
    const pendingQuestion = siteSelection?.pendingQuestion;
    const fallbackAddress = normalizedCandidate.formattedAddress || manualAddressInput || "";
    const fallbackToChatInjection = async () => {
      await injectSelectedSiteIntoChat(fallbackAddress, pendingQuestion);
    };

    setIsConfirmingSite(true);
    setSiteSelectionError(null);

    if (siteContextMutationsDisabled) {
      await fallbackToChatInjection();
      setIsConfirmingSite(false);
      return;
    }

    try {
      console.log("[site-selection-confirm]", {
        provider: normalizedCandidate.provider,
        formattedAddress: normalizedCandidate.formattedAddress,
        latitude: normalizedCandidate.latitude,
        longitude: normalizedCandidate.longitude,
        id: normalizedCandidate.id,
      });
      const siteContextPayload = await setSiteFromCandidate({
        projectId: projectKey,
        candidate: normalizedCandidate,
        addressInput: manualAddressInput || normalizedCandidate.formattedAddress,
      });
      setSiteContext(siteContextPayload ?? null);
      setSiteSelectionError(null);
      closeSiteSelection();
      if (pendingQuestion) {
        await sendMessage({ message: pendingQuestion, skipUserMessage: true });
      }
    } catch (error) {
      console.error("Site candidate confirm error", error);
      await fallbackToChatInjection();
    } finally {
      setIsConfirmingSite(false);
    }
  };

  const handleSuggestionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!siteSelection || siteSelection.source !== "manual") {
      return;
    }
    if (!suggestions.length) {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleSiteSearch();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedSuggestionIndex((previous) => {
        if (previous === null) return 0;
        return Math.min(suggestions.length - 1, previous + 1);
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedSuggestionIndex((previous) => {
        if (previous === null) return suggestions.length - 1;
        return Math.max(0, previous - 1);
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const targetIndex = highlightedSuggestionIndex ?? 0;
      const candidate = suggestions[targetIndex];
      if (candidate) {
        applySuggestionSelection(candidate);
      }
    }
  };

  const handleAddSourceClick = () => {
    if (uploadLimitReached || uploadUsage.limit === 0) {
      setUpgradeModal("documents");
      return;
    }
    setShowUploadModal(true);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      setUploadQueue([]);
      setUploadStatuses({});
      return;
    }
    setUploadError(null);
    const files = Array.from(event.target.files);
    const acceptedFiles = files.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ext ? ACCEPTED_EXTENSION_SET.has(ext) : false;
    });
    if (!acceptedFiles.length) {
      setUploadQueue([]);
      setUploadStatuses({});
      setUploadError("Unsupported file type. Please choose a PDF, document, spreadsheet, text, image, or ZIP file.");
      return;
    }
    if (acceptedFiles.length < files.length) {
      setUploadError("Some files were skipped because they are not supported.");
    }
    setUploadQueue(acceptedFiles);
    const statusMap: Record<string, { status: "pending" }> = {};
    acceptedFiles.forEach((file) => {
      statusMap[file.name] = { status: "pending" };
    });
    setUploadStatuses(statusMap);
  };

  const handleFileDrop = (files: File[]) => {
    if (!files.length) return;
    setUploadError(null);
    const acceptedFiles = files.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ext ? ACCEPTED_EXTENSION_SET.has(ext) : false;
    });
    if (!acceptedFiles.length) {
      setUploadQueue([]);
      setUploadStatuses({});
      setUploadError("Unsupported file type. Please choose a PDF, document, spreadsheet, text, image, or ZIP file.");
      return;
    }
    if (acceptedFiles.length < files.length) {
      setUploadError("Some files were skipped because they are not supported.");
    }
    setUploadQueue(acceptedFiles);
    const statusMap: Record<string, { status: "pending" }> = {};
    acceptedFiles.forEach((file) => {
      statusMap[file.name] = { status: "pending" };
    });
    setUploadStatuses(statusMap);
  };

  const buildStatusMap = (
    status: "pending" | "uploading" | "success" | "error",
    message?: string,
  ): Record<string, { status: "pending" | "uploading" | "success" | "error"; message?: string }> => {
    const statusMap: Record<string, { status: "pending" | "uploading" | "success" | "error"; message?: string }> = {};
    uploadQueue.forEach((file) => {
      statusMap[file.name] = message ? { status, message } : { status };
    });
    return statusMap;
  };

  const handleUploadConfirm = async () => {
    if (!uploadQueue.length) {
      setShowUploadModal(false);
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadStatuses(buildStatusMap("uploading"));
    try {
      const formData = new FormData();
      for (const file of uploadQueue) {
        formData.append("files", file);
      }

      const response = await fetch(`/api/projects/${projectKey}/uploads`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        errorCode?: string;
        message?: string;
        tier?: UserTier;
        limit?: number;
        uploads?: Array<{
          id: string;
          fileName: string;
          fileExtension?: string | null;
          mimeType?: string | null;
          fileSize: number;
          publicUrl: string;
          createdAt: string;
        }>;
        usage?: { used: number; limit: number };
      };

      if (!response.ok || payload?.ok === false) {
        const errorCode = payload.errorCode ?? payload.error;
        const messageFromServer = payload.message;

        if (errorCode === "upload_limit_reached") {
          setServerLimitReached(true);
          setUpgradeModal("documents");
          setShowUploadModal(false);
          setUploadQueue([]);
          setUploadStatuses(buildStatusMap("error", "Upload limit reached"));
          return;
        }

        if (errorCode === "storage_config_missing") {
          const message =
            messageFromServer || "Document storage is not configured for this environment.";
          setUploadStatuses(buildStatusMap("error", message));
          setUploadError(message);
          return;
        }

        if (errorCode === "storage_upload_failed") {
          const message =
            messageFromServer || "We couldn’t save that file right now. Please try again or contact support.";
          setUploadStatuses(buildStatusMap("error", message));
          setUploadError(message);
          return;
        }

        if (errorCode === "invalid_file") {
          const message = messageFromServer || "Please choose at least one file to upload.";
          setUploadError(message);
          setUploadStatuses(buildStatusMap("error", message));
          return;
        }

        const message =
          messageFromServer ||
          (errorCode === "unsupported_file_type"
            ? "Only PDF, DOCX, XLSX, CSV, TXT, MD, PNG, JPG, JPEG, ZIP are allowed."
            : errorCode === "file_too_large"
              ? "One or more files exceed the upload limit."
              : errorCode === "project_not_found" || errorCode === "project_id_missing"
                ? "Project could not be found."
                : errorCode === "db_write_failed" || errorCode === "db_read_failed"
                  ? "We couldn’t save that file right now. Please try again or contact support."
                  : "Unable to upload documents right now.");

        setUploadStatuses(buildStatusMap("error", message));
        setUploadError(message);
        return;
      }

      if (!payload?.usage || !payload.uploads) {
        const message = "Unable to upload documents right now.";
        setUploadStatuses(buildStatusMap("error", message));
        setUploadError(message);
        return;
      }

      setServerLimitReached(payload.usage.limit > 0 && payload.usage.used >= payload.usage.limit);
      const mappedSources: WorkspaceSource[] = (payload.uploads ?? []).map((upload) => ({
        id: upload.id,
        name: upload.fileName,
        detail: upload.mimeType ?? upload.fileExtension ?? "File",
        type: determineSourceType(upload.fileName),
        uploadedAt: new Date(upload.createdAt).toLocaleDateString(),
        sizeLabel: formatFileSize(upload.fileSize),
        status: "Synced",
        url: upload.publicUrl,
        fileExtension: upload.fileExtension ?? null,
      }));
      setSources((previous) => [...mappedSources, ...previous]);
      for (const file of uploadQueue) {
        const snippet = await extractContextSnippet(file);
        appendSourceContext(projectKey, snippet);
        applySessionSignals({ recentSource: file.name });
      }
      recordUpload(projectKey, Math.max(payload.usage.used - uploadUsage.used, 0));
      setUploadStatuses(buildStatusMap("success"));
      showToast(`Uploaded ${uploadQueue.length} document${uploadQueue.length === 1 ? "" : "s"}`);
      setUploadQueue([]);
      setShowUploadModal(false);
    } catch (error) {
      console.error("Workspace upload error", error);
      const message = "Unable to upload documents right now.";
      setUploadError(message);
      setUploadStatuses(buildStatusMap("error", message));
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToolClick = (tool: ToolCard) => {
    const usage = recordToolUsage(projectKey, tool.id);
    if (!usage.allowed) {
      setToolContext(tool.name);
      setUpgradeModal("tools");
      return;
    }
    showToast(`${tool.name} received the latest chat context`);
  };

  const experienceArtefacts = getArtefacts(projectKey);
  const artefacts = useMemo(() => experienceArtefacts, [experienceArtefacts]);

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
    addArtefact(projectKey, noteArtefact);
    setIsNoteEditorOpen(false);
    setNoteBody("");
    setNoteTitle("");
    setNoteType("Note");
    showToast("Note saved to artefacts");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-10 text-slate-900 transition-colors sm:px-6 lg:px-10 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <span className="text-base font-semibold text-slate-900 dark:text-white">Plannera.ai</span>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:text-white"
          >
            ← My Projects
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100"
            aria-label="Toggle light and dark mode"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDarkMode ? "Light mode" : "Dark mode"}
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500">
            <Sparkles className="h-4 w-4" />
            Get help
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Interactive notebook for pathways, risks, and council-ready artefacts.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:text-white">
          <Notebook className="h-4 w-4" />
          Share workspace
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Sources</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">Emails, documents & references</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Usage</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {uploadUsage.limit === 0 ? "Sign up to upload" : `${uploadUsage.used} of ${uploadUsage.limit} documents used`}
              </p>
            </div>
          </header>
          {limitMessage ? (
            <p className="text-xs font-semibold text-rose-600">{limitMessage}</p>
          ) : null}
          <div className="flex flex-nowrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddSourceClick}
              disabled={uploadLimitReached}
              title={limitMessage ?? undefined}
              className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:disabled:border-slate-800 dark:disabled:text-slate-500"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <ListFilter className="h-3 w-3" aria-hidden />
              <label htmlFor="source-filter" className="sr-only">
                Filter sources
              </label>
              <select
                id="source-filter"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as WorkspaceSourceType | "all")}
                className="bg-transparent pr-0 text-[11px] font-semibold focus:outline-none"
              >
                <option value="all">Show all</option>
                {Object.entries(sourceTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label} first
                  </option>
                ))}
              </select>
            </div>
          </div>
          {sourceFilter !== "all" ? (
            <p className="text-[11px] text-slate-500">Prioritising {activeSourceFilterLabel.toLowerCase()} uploads.</p>
          ) : null}
          <ul className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {displayedSources.map((source) => {
              const Icon = sourceIcons[source.type] ?? FileText;
              return (
                <li key={source.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-colors dark:border-slate-800 dark:bg-slate-800/70">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 no-underline hover:text-slate-900 dark:hover:text-white"
                    >
                      <span className="mt-1 rounded-xl bg-white p-2 text-slate-600 transition-colors dark:bg-slate-800 dark:text-slate-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{source.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-300">
                          {source.detail}
                          {source.fileExtension ? (
                            <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600 transition-colors dark:border-slate-700 dark:text-slate-200">
                              {source.fileExtension}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{source.uploadedAt} · {source.sizeLabel}</p>
                      </div>
                      {source.status ? (
                        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-200/10 dark:text-slate-200">{source.status}</span>
                      ) : null}
                    </a>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="mt-1 rounded-xl bg-white p-2 text-slate-600 transition-colors dark:bg-slate-800 dark:text-slate-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{source.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-300">
                          {source.detail}
                          {source.fileExtension ? (
                            <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600 transition-colors dark:border-slate-700 dark:text-slate-200">
                              {source.fileExtension}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{source.uploadedAt} · {source.sizeLabel}</p>
                      </div>
                      {source.status ? (
                        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-200/10 dark:text-slate-200">{source.status}</span>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Chat</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Set the site, ask follow-ups, send to agents, or refresh to start over.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openManualSiteSelection}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
              >
                <MapPin className="h-3.5 w-3.5" />
                {siteContext ? "Change site" : "Set site"}
              </button>
              <button
                onClick={handleSaveChat}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
              >
                <Save className="h-4 w-4" />
                Save Chat
              </button>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </header>
          <div className="flex-1 space-y-4 overflow-hidden px-6 py-6">
            {siteSelection ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-slate-700 transition-colors dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {siteSelection.source === "chat" ? "Confirm the site for this question" : "Search for a new NSW site"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-200">
                      {siteSelection.source === "chat"
                        ? `Looking for: ${siteSelection.addressInput}`
                        : siteSelection.addressInput
                          ? `Search results for: ${siteSelection.addressInput}`
                          : "Enter the address below to search the NSW property dataset."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeSiteSelection}
                    className="rounded-full p-1 text-slate-500 transition hover:bg-white hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {siteSelection.source === "manual" ? (
                  <>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                      <input
                        type="text"
                        ref={siteSearchInputRef}
                        value={siteSearchQuery}
                        onChange={(event) => {
                          setSiteSearchQuery(event.target.value);
                          setSelectedSuggestion(null);
                          setSiteSelectionCandidateId(null);
                          setHighlightedSuggestionIndex(null);
                          setSuggestionsEnabled(true);
                        }}
                        onKeyDown={handleSuggestionKeyDown}
                        placeholder="e.g. 6 Myola Road Newport NSW"
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 pr-10 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                      />
                      {isSuggesting ? (
                        <span className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                      ) : null}
                      {suggestions.length ? (
                        <ul className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          {suggestions.map((candidate, index) => (
                            <li key={candidate.id}>
                              <button
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applySuggestionSelection(candidate);
                                }}
                                onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                                className={cn(
                                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition",
                                  index === highlightedSuggestionIndex
                                    ? "bg-slate-900/5 dark:bg-slate-700/60"
                                    : "hover:bg-slate-900/5 dark:hover:bg-slate-800/60",
                                )}
                              >
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{candidate.formattedAddress}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-300">{candidate.lgaName ? `${candidate.lgaName} LGA` : "LGA pending"}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                      <button
                        type="button"
                        onClick={handleSiteSearch}
                        disabled={isSiteSearchPending || siteSearchAvailable !== "ok"}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
                      >
                        {isSiteSearchPending ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                        {isSiteSearchPending ? "Searching" : "Search"}
                      </button>
                    </div>
                    {siteSearchAvailable === "missing_env" ? (
                      <p className="text-xs text-slate-500">
                        NSW property search isn’t configured in this environment, but you can still set the site manually.
                      </p>
                    ) : null}
                  </>
                ) : null}
                {siteSelection.candidates.length ? (
                  <ul className="mt-3 space-y-2">
                    {siteSelection.candidates.map((candidate) => (
                      <li key={candidate.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
                          <input
                            type="radio"
                            name="site-candidate"
                            className="h-4 w-4 text-slate-900 dark:text-white"
                            value={candidate.id}
                            checked={siteSelectionCandidateId === candidate.id}
                            onChange={() => {
                              setSiteSelectionCandidateId(candidate.id);
                              setSelectedSuggestion(candidate);
                              setSiteSelectionError(null);
                            }}
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{candidate.formattedAddress}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-300">
                              {candidate.lgaName ? `${candidate.lgaName} LGA` : "LGA pending"}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : siteSelection.source === "chat" ? (
                  <p className="mt-3 text-xs text-slate-500">
                    I couldn’t confidently match that address. Pick the right site or try searching again.
                  </p>
                ) : null}
                {siteSelectionError ? (
                  <p className="mt-2 text-xs font-semibold text-rose-600">{siteSelectionError}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSiteCandidateConfirm()}
                    disabled={(!siteSelectionCandidateId && !selectedSuggestion) || isConfirmingSite}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
                  >
                    {isConfirmingSite ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {isConfirmingSite ? "Saving" : "Use this site"}
                  </button>
                  <button
                    type="button"
                    onClick={closeSiteSelection}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            <div
              ref={chatScrollRef}
              className="flex max-h-[460px] flex-col space-y-4 overflow-y-auto pr-2"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Start by typing a question to begin this chat.</p>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-3xl border px-4 py-3 text-sm leading-relaxed",
                      message.role === "assistant"
                        ? "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
                        : "ml-auto border-blue-200 bg-blue-600/10 text-slate-900 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-white",
                    )}
                  >
                    <p>{message.content}</p>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{message.timestamp}</p>
                  </article>
                ))
              )}
              {isThinking ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Drafting response…
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
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
                className="w-full resize-none border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">Responses stay inside this project unless you share them.</p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:hover:bg-slate-800"
                >
                  Send
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Maps & External Tools</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">Keep overlays and exports aligned with the workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapsPanel(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
              >
                <Globe2 className="h-4 w-4" />
                Maps & external tools
              </button>
            </div>
          </div>
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
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tools & Agents</p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">Send context or open in split view.</p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Pro access
                </span>
              </header>
              <div className="mt-4 grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleToolClick(tool)}
                      className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-slate-600"
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br", tool.accent)}>
                          <Icon className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                        </span>
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Pro</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{tool.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{tool.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Artefacts</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">Save outputs from tools or chats.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteEditorOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
              >
                <Plus className="h-4 w-4" />
                Add note
              </button>
            </header>
            <ul className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {artefacts.map((artefact) => (
                <li key={artefact.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors dark:border-slate-800 dark:bg-slate-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{artefact.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {artefact.owner} · {artefact.updatedAt}
                        {artefact.noteType ? ` · ${artefact.noteType}` : ""}
                      </p>
                      {artefact.metadata ? <p className="text-[11px] text-slate-400 dark:text-slate-500">{artefact.metadata}</p> : null}
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", artefactBadges[artefact.type])}>
                      {artefact.type}
                    </span>
                  </div>
                  {artefact.type === "chat" && artefact.messages?.length ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleArtefactOpen(artefact)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Reopen in chat
                      </button>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Restores {artefact.messages.length} message{artefact.messages.length === 1 ? "" : "s"} in the chat window.
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 transition-colors dark:border-slate-700 dark:text-slate-400">
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

      {showMapsPanel ? (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-6xl space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMapsPanel(false)}
                  className="rounded-2xl border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
                >
                  Close
                </button>
              </div>
              <MapSnapshotsPanel
                projectId={projectKey}
                projectName={project.name}
                onToast={showToast}
                onClose={() => setShowMapsPanel(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadQueue([]);
          setUploadStatuses({});
          setUploadError(null);
        }}
        title="Upload project sources"
        description="Sync PDFs, GIS files, and council emails to keep the assistant grounded in your evidence."
      >
        <label
          htmlFor="source-upload"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
            handleFileDrop(droppedFiles);
          }}
        >
          <Upload className="mb-2 h-6 w-6 text-slate-400" />
          Drag & drop or click to browse
          <span className="mt-2 text-xs text-slate-400">PDF, Word, Excel/CSV, TXT/MD, JPEG/PNG, ZIP</span>
          <input
            id="source-upload"
            type="file"
            className="hidden"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleFileSelection}
          />
        </label>
        {uploadQueue.length ? (
          <ul className="mt-4 space-y-2 rounded-2xl border border-slate-100 p-3 text-sm text-slate-600">
            {uploadQueue.map((file) => (
              <li key={file.name} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  {uploadStatuses[file.name]?.message ? (
                    <p className="text-xs font-medium text-rose-600">{uploadStatuses[file.name]?.message}</p>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">
                  {uploadStatuses[file.name]?.status === "uploading"
                    ? "Uploading…"
                    : uploadStatuses[file.name]?.status === "success"
                      ? "Uploaded"
                      : uploadStatuses[file.name]?.status === "error"
                        ? "Error"
                        : "Queued"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {uploadError ? <p className="mt-2 text-xs font-semibold text-rose-600">{uploadError}</p> : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={handleUploadConfirm}
            disabled={isUploading}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Uploading…" : "Upload"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUploadModal(false);
              setUploadQueue([]);
            }}
            disabled={isUploading}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={upgradeModal === "documents"}
        onClose={() => setUpgradeModal(null)}
        title="Upload limit reached"
        description={
          limitMessage ??
          (state.userTier === "guest"
            ? "You’ve used your free upload. Create a free account to upload more documents."
            : "You’ve reached your document limit. Upgrade to a paid plan to continue uploading.")
        }
      >
        <div className="space-y-3">
          <a
            href={documentCta.href}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {documentCta.label}
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

function determineSourceType(filename: string): WorkspaceSourceType {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return "other";
  if (["pdf"].includes(extension)) return "pdf";
  if (["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet";
  if (["doc", "docx", "rtf"].includes(extension)) return "word";
  if (["txt", "md"].includes(extension)) return "document";
  if (["jpg", "jpeg", "png"].includes(extension)) return "image";
  if (["zip"].includes(extension)) return "other";
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

function summarizeReply(reply: string) {
  const clean = stripHtml(reply);
  if (!clean) return "";
  return `${clean.slice(0, 200)}${clean.length > 200 ? "…" : ""}`;
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Note editor</p>
          <p className="text-sm text-slate-500 dark:text-slate-300">Draft notes, minutes and ideas.</p>
        </div>
      </header>
      <div className="mt-4 space-y-3">
        <input
          value={noteTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Add a title"
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
        />
        <select
          value={noteType}
          onChange={(event) => onTypeChange(event.target.value as WorkspaceNoteCategory)}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
        >
          {noteCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
          <button
            type="button"
            onClick={() => format("bold")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition-colors dark:border-slate-700 dark:text-slate-100"
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => format("italic")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition-colors dark:border-slate-700 dark:text-slate-100"
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => format("insertUnorderedList")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition-colors dark:border-slate-700 dark:text-slate-100"
          >
            Bullets
          </button>
          <button
            type="button"
            onClick={() => format("insertOrderedList")}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition-colors dark:border-slate-700 dark:text-slate-100"
          >
            Numbers
          </button>
          <button
            type="button"
            onClick={handleLink}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition-colors dark:border-slate-700 dark:text-slate-100"
          >
            Link
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="min-h-[160px] rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
          dangerouslySetInnerHTML={{ __html: noteBody }}
        />
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Save as artefact
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors dark:border-slate-700 dark:text-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
