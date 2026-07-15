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
  useTransition,
} from "react";
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  Layers3,
  Link2,
  ListFilter,
  LogOut,
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
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MapsToolsModal } from "@/components/projects/maps-tools-modal";
import { MessageReactionBar } from "@/components/projects/message-reaction-bar";
import { QuickSiteCheckModal } from "@/components/projects/quick-site-check-modal";
import { ChatConfidenceBadge } from "@/components/projects/chat-confidence-badge";
import { SetSiteInput } from "@/components/projects/set-site-input";
import { SeeDocumentPanel } from "@/components/projects/see-document-panel";
import { FeasibilityPanel } from "@/components/projects/feasibility-panel";
import { SourceConfidenceBadge } from "@/components/projects/source-confidence-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/ui/logo";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useExperience } from "@/components/providers/experience-provider";
import { useAuthGuard } from "@/components/providers/auth-guard-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { formatTranscript } from "@/lib/chat-transcript";
import {
  formatReviewRequestHandoff,
  reviewRequestFilename,
} from "@/lib/review-request-handoff";
import {
  buildCommercialNextAction,
  type CommercialReadinessStatus,
} from "@/lib/commercial-next-action";
import { highlightText } from "@/lib/highlight-text";
import { selectCurrentSiteDetailedPlanningPackArtefact } from "@/lib/detailed-planning-pack-selector";
import { detailedPlanningPackScope, isArtefactCurrentForSite, preSeeScope, quickSiteCheckScope, reviewRequestScope } from "@/lib/site-scoped-artefacts";
import { getRelativeTime } from "@/lib/relative-time";
import { generateSuggestions } from "@/lib/suggestion-chips";
import type { Project } from "@/lib/mock-data";
import {
  setSiteFromCandidate,
  toPersistableSiteCandidate,
} from "@/lib/site-context-client";
import { ACCEPTED_EXTENSIONS } from "@/lib/upload-constraints";
import { useLgaCoverageStatus } from "@/hooks/use-lga-coverage-status";
import { cn } from "@/lib/utils";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type {
  UserTier,
  FeasibilityContent,
  FeasibilityItem,
  DetailedPlanningPackContent,
  WorkspaceArtefact,
  WorkspaceMessage,
  WorkspacePreSeePlanningMemoContent,
  ReviewRequestContent,
  WorkspaceSessionSignals,
  WorkspaceSource,
  WorkspaceSourceType,
} from "@/types/workspace";

interface ProjectWorkspaceProps {
  project: Project;
  initialPrompt?: string | null;
  initialAddress?: string | null;
}

type SiteSelectionState = {
  source: "chat" | "manual";
  addressInput: string;
  candidates: SiteCandidate[];
  pendingQuestion?: string;
};

type DcpLink = {
  lgaCode: string;
  name: string | null;
  url: string | null;
};

type ServerArtefactRecord = {
  id: string;
  title: string;
  type: string;
  payload?: unknown;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  capturedAt?: string | null;
  staleAt?: string | null;
};

type ServerChatHistoryMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  confidenceScore?: number | null;
  lepSourceRefs?: string[];
  reactions?: Record<string, number> | null;
};

type StaleArtefact = {
  id: string;
  type: string;
  staleAt: string;
  createdAt: string;
};

type RegenerationState = "idle" | "loading" | "success" | "error";

type ProjectNotification = {
  id: string;
  type: "LGA_SEARCHABLE_READY";
  title: string;
  message: string;
  lgaCode: string | null;
  createdAt: string;
};

const normaliseCandidateForRequest = toPersistableSiteCandidate;

const workspaceQuickPrompts = [
  "What are the likely planning risks for this site?",
  "Draft a practical approval pathway",
  "What documents should I prepare next?",
];

const ACCEPTED_EXTENSION_SET = new Set(
  ACCEPTED_EXTENSIONS.map((ext) => ext.replace(".", "")),
);

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

const sourceIcons: Record<
  WorkspaceSourceType,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
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

const zoningPattern =
  /\b(R1|R2|R3|R4|R5|B1|B2|B3|B4|IN1|IN2|MU1|E1|E2|E3|E4|SP1|SP2|W1|W2)\b/i;

function ProjectTitleEditor({
  projectId,
  initialTitle,
}: {
  projectId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle || "Untitled project");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(initialTitle || "Untitled project");
  }, [initialTitle]);

  const handleBlur = () => {
    const trimmed = title.trim();

    if (!trimmed) {
      setTitle(initialTitle || "Untitled project");
      return;
    }

    if (trimmed === initialTitle) return;

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        console.error("Failed to rename project");
        setTitle(initialTitle || "Untitled project");
        return;
      }

      router.refresh();
    });
  };

  return (
    <input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={handleBlur}
      disabled={isPending}
      className="mt-1.5 w-full max-w-xl bg-transparent text-2xl font-semibold tracking-[-0.03em] text-white outline-none ring-0 transition placeholder:text-slate-400 focus:border-b focus:border-blue-200 sm:text-3xl"
    />
  );
}

const buildZoningLabel = (context: SiteContextSummary | null) => {
  if (!context) return null;
  if (context.zoningCode || context.zoningName) {
    return [context.zoningCode, context.zoningName].filter(Boolean).join(" – ");
  }
  return context.zone;
};

const normaliseMemoLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[_\s]+/g, " ")
    .trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const coerceRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};
const readString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const readNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;
const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const normaliseCitations = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((citation) => {
      const citationRecord = coerceRecord(citation);
      const type = citationRecord.type === "LEP" || citationRecord.type === "DCP" ? citationRecord.type : null;
      const ref = readString(citationRecord.ref);
      return type && ref ? { ref, type } : null;
    })
    .filter((citation): citation is { ref: string; type: "LEP" | "DCP" } => Boolean(citation));
};

const parsePossibleJson = (value: unknown) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const normaliseQuickSiteControls = (
  value: unknown,
): WorkspacePreSeePlanningMemoContent["applicableControls"]["quickSiteControls"] => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, control]) => {
      const controlRecord = coerceRecord(control);
      return [
        key,
        {
          label: readNullableString(controlRecord.label) ?? key,
          value: readNullableString(controlRecord.value),
          interpretation:
            readNullableString(controlRecord.interpretation) ??
            "Confirm against source controls.",
        },
      ];
    }),
  );
};

const normaliseDcpClauses = (
  value: unknown,
): WorkspacePreSeePlanningMemoContent["applicableControls"]["dcpClauses"] => {
  if (!Array.isArray(value)) return [];

  return value.map((clause) => {
    const clauseRecord = coerceRecord(clause);
    return {
      ref: readNullableString(clauseRecord.ref),
      title: readNullableString(clauseRecord.title),
      headingPath: Array.isArray(clauseRecord.headingPath)
        ? clauseRecord.headingPath.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [],
      bodyText: readString(clauseRecord.bodyText),
      score: readNumber(clauseRecord.score),
    };
  });
};

const normaliseSourceExcerpts = (
  value: unknown,
): WorkspacePreSeePlanningMemoContent["applicableControls"]["sourceExcerpts"] => {
  if (!Array.isArray(value)) return [];

  return value.map((source, index) => {
    const sourceRecord = coerceRecord(source);
    return {
      id: readString(sourceRecord.id, `source-${index}`),
      heading: readNullableString(sourceRecord.heading),
      sourceType: readString(sourceRecord.sourceType, "source"),
      content: readString(sourceRecord.content),
      score: readNumber(sourceRecord.score),
    };
  });
};

const normaliseAssessments = (
  value: unknown,
): WorkspacePreSeePlanningMemoContent["consistencyAssessment"] => {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const itemRecord = coerceRecord(item);
    return {
      topic: readString(itemRecord.topic, `Assessment ${index + 1}`),
      assessment: readString(
        itemRecord.assessment,
        "Assessment details were not saved with this memo.",
      ),
      citations: normaliseCitations(itemRecord.citations),
    };
  });
};

const normaliseLimitations = (value: unknown) => {
  if (!Array.isArray(value))
    return [
      "Confirm all controls against current source documents before relying on this memo.",
    ];
  const limitations = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
  return limitations.length
    ? limitations
    : [
        "Confirm all controls against current source documents before relying on this memo.",
      ];
};


const normaliseDetailedPlanningPackContent = (
  value: unknown,
): DetailedPlanningPackContent | null => {
  const parsedValue = parsePossibleJson(value);
  if (!isRecord(parsedValue) || parsedValue.packType !== "detailed_planning_pack") return null;
  const site = coerceRecord(parsedValue.site);
  const sourceQuickSiteCheck = coerceRecord(parsedValue.sourceQuickSiteCheck);
  const dcpEvidence = Array.isArray(parsedValue.dcpEvidence) ? parsedValue.dcpEvidence : [];
  return {
    packType: "detailed_planning_pack",
    generatedAt: readString(parsedValue.generatedAt, new Date().toISOString()),
    projectId: readString(parsedValue.projectId),
    site: {
      address: readNullableString(site.address),
      lga: readNullableString(site.lga),
      lgaCode: readNullableString(site.lgaCode),
      zoneCode: readNullableString(site.zoneCode),
      zoneName: readNullableString(site.zoneName),
      zoneLabel: readNullableString(site.zoneLabel),
    },
    proposalBrief: readString(parsedValue.proposalBrief, "Proposed works brief was not saved with this pack."),
    sourceQuickSiteCheck: {
      artefactId: readString(sourceQuickSiteCheck.artefactId),
      title: readString(sourceQuickSiteCheck.title, "Saved Quick Site Check"),
      generatedAt: readNullableString(sourceQuickSiteCheck.generatedAt),
      lepEvidenceSummary: isRecord(sourceQuickSiteCheck.lepEvidenceSummary)
        ? (sourceQuickSiteCheck.lepEvidenceSummary as DetailedPlanningPackContent["sourceQuickSiteCheck"]["lepEvidenceSummary"])
        : null,
    },
    carriedLepEvidenceSummary: isRecord(parsedValue.carriedLepEvidenceSummary)
      ? (parsedValue.carriedLepEvidenceSummary as DetailedPlanningPackContent["carriedLepEvidenceSummary"])
      : null,
    dcpEvidence: dcpEvidence.map((item) => {
      const record = coerceRecord(item);
      const status = record.status === "Cited" || record.status === "Needs Expert Review" ? record.status : "Unavailable";
      return {
        topicId: readString(record.topicId),
        topicLabel: readString(record.topicLabel, "Planning topic"),
        status,
        reason: readString(record.reason, "No reason saved."),
        citations: Array.isArray(record.citations)
          ? record.citations.map((citation) => {
              const c = coerceRecord(citation);
              return {
                ref: readString(c.ref, "DCP source"),
                title: readNullableString(c.title),
                headingPath: Array.isArray(c.headingPath) ? c.headingPath.filter((part): part is string => typeof part === "string") : [],
                excerpt: readString(c.excerpt),
                score: typeof c.score === "number" ? c.score : 0,
              };
            })
          : [],
      };
    }),
    topicMatrix: Array.isArray(parsedValue.topicMatrix) ? (parsedValue.topicMatrix as DetailedPlanningPackContent["topicMatrix"]) : [],
    unresolvedTopics: Array.isArray(parsedValue.unresolvedTopics) ? parsedValue.unresolvedTopics.filter((item): item is string => typeof item === "string") : [],
    consultantReviewQuestions: Array.isArray(parsedValue.consultantReviewQuestions) ? parsedValue.consultantReviewQuestions.filter((item): item is string => typeof item === "string") : [],
    nextAction: readString(parsedValue.nextAction, "Review this pack with a consultant before relying on it."),
    commercialReady: parsedValue.commercialReady === true,
  };
};

const normalisePreSeeMemoContent = (
  value: unknown,
): WorkspacePreSeePlanningMemoContent | null => {
  const parsedValue = parsePossibleJson(value);
  if (!isRecord(parsedValue)) return null;

  const siteDescription = coerceRecord(parsedValue.siteDescription);
  const applicableControls = coerceRecord(parsedValue.applicableControls);
  const hasMemoShape =
    parsedValue.memoType === "pre_see_planning_memo" ||
    isRecord(parsedValue.siteDescription) ||
    isRecord(parsedValue.applicableControls) ||
    Array.isArray(parsedValue.consistencyAssessment);

  if (!hasMemoShape) return null;

  return {
    memoType: "pre_see_planning_memo",
    generatedAt: readString(parsedValue.generatedAt, new Date().toISOString()),
    projectId: readString(parsedValue.projectId),
    siteDescription: {
      address: readNullableString(siteDescription.address),
      lga: readNullableString(siteDescription.lga),
      zoneCode: readNullableString(siteDescription.zoneCode),
      zoneName: readNullableString(siteDescription.zoneName),
      zoneLabel: readNullableString(siteDescription.zoneLabel),
    },
    proposedWorksSummary: readString(
      parsedValue.proposedWorksSummary,
      "Proposed works summary was not saved with this memo.",
    ),
    applicableControls: {
      lepInstrument: isRecord(applicableControls.lepInstrument)
        ? (applicableControls.lepInstrument as WorkspacePreSeePlanningMemoContent["applicableControls"]["lepInstrument"])
        : null,
      permissibility: isRecord(applicableControls.permissibility)
        ? (applicableControls.permissibility as WorkspacePreSeePlanningMemoContent["applicableControls"]["permissibility"])
        : null,
      quickSiteControls: normaliseQuickSiteControls(
        applicableControls.quickSiteControls,
      ),
      dcpClauses: normaliseDcpClauses(applicableControls.dcpClauses),
      sourceExcerpts: normaliseSourceExcerpts(
        applicableControls.sourceExcerpts,
      ),
    },
    consistencyAssessment: normaliseAssessments(
      parsedValue.consistencyAssessment,
    ),
    limitations: normaliseLimitations(parsedValue.limitations),
  };
};

const isFeasibilityVerdict = (
  value: unknown,
): value is FeasibilityContent["overallVerdict"] =>
  value === "proceed" ||
  value === "caution" ||
  value === "redesign" ||
  value === "blocked" ||
  value === "unresolved";

const isFeasibilityConfidence = (
  value: unknown,
): value is FeasibilityContent["items"][number]["confidence"] =>
  value === "cited" || value === "inferred" || value === "unavailable";

const normaliseFeasibilityContent = (
  value: unknown,
): FeasibilityContent | null => {
  const parsedValue = coerceRecord(value);
  if (!parsedValue) return null;

  const developmentType = readString(parsedValue.developmentType);
  const overallVerdict = isFeasibilityVerdict(parsedValue.overallVerdict)
    ? parsedValue.overallVerdict
    : null;
  const summary = readString(parsedValue.summary);
  const generatedAt = readString(
    parsedValue.generatedAt,
    new Date().toISOString(),
  );
  const rawItems = Array.isArray(parsedValue.items) ? parsedValue.items : [];

  if (!developmentType || !overallVerdict || !summary) return null;

  const items: FeasibilityItem[] = rawItems
    .map((item): FeasibilityItem | null => {
      const entry = coerceRecord(item);
      if (!entry) return null;
      const verdict = isFeasibilityVerdict(entry.verdict)
        ? entry.verdict
        : "unresolved";
      const confidence = isFeasibilityConfidence(entry.confidence)
        ? entry.confidence
        : "unavailable";
      return {
        label: readString(entry.label, "Assessment item"),
        verdict,
        detail: readString(
          entry.detail,
          "No detail was saved for this feasibility item.",
        ),
        confidence,
        source: readString(entry.source) || undefined,
      } satisfies FeasibilityContent["items"][number];
    })
    .filter((item): item is FeasibilityItem => Boolean(item));

  return {
    developmentType,
    overallVerdict,
    summary,
    items: items.length
      ? items
      : [
          {
            label: "Assessment",
            verdict: "unresolved",
            detail: "No saved feasibility checklist items were available.",
            confidence: "unavailable",
          },
        ],
    generatedAt,
  };
};

const normaliseQuickSiteCheckReport = (value: unknown): QuickSiteCheckReport | null => {
  const parsedValue = parsePossibleJson(value);
  if (!isRecord(parsedValue) || !isRecord(parsedValue.site) || !isRecord(parsedValue.controls)) return null;
  return parsedValue as QuickSiteCheckReport;
};


const hasCitedQuickSiteCheckEvidence = (report: QuickSiteCheckReport | null) => {
  if (!report) return false;
  if (report.lepEvidenceSummary) return report.lepEvidenceSummary.label === "Cited";
  const lepControls = [
    report.controls?.heightOfBuilding,
    report.controls?.floorSpaceRatio,
    report.controls?.minimumLotSize,
  ];
  const citedLepControls = lepControls.filter((control) => control?.lepSource && Boolean(control?.clauseRef));
  const hasResolvedZone = Boolean(report.site?.zoneCode || report.site?.zoneName || report.site?.zoneLabel);
  return hasResolvedZone && citedLepControls.length > 0;
};

const READINESS_CONFLICT_SCOPE = /\b(rural zones?|rural land|rural boundary|residential zones?|residential d1|residential accommodation|dual occupanc(?:y|ies)|secondary dwelling|dwelling houses?|bed and breakfast|large lot residential|environmental conservation|top[- ]?up housing)\b/i;
const READINESS_ZONE_CODE = /\b(?:RU|R|E|MU|B|IN|SP|RE|C|W|DM)\d[A-Z]?\b/i;
const siteZoneCodeForReadiness = (memo: WorkspacePreSeePlanningMemoContent) =>
  memo.siteDescription.zoneCode?.trim().toUpperCase() || memo.siteDescription.zoneLabel?.match(READINESS_ZONE_CODE)?.[0]?.toUpperCase() || null;
const isApplicableReadinessText = (text: string, zoneCode: string | null) => {
  const isCommercialOrTourist = zoneCode === "E2" || zoneCode === "SP3";
  if (!isCommercialOrTourist) return text.trim().length > 0;
  const mentionsCurrentZone = Boolean(zoneCode && new RegExp(`\\b${zoneCode}\\b`, "i").test(text));
  const scope = text.split("\n", 1)[0] ?? text;
  if (READINESS_CONFLICT_SCOPE.test(scope) && !mentionsCurrentZone) return false;
  if (READINESS_CONFLICT_SCOPE.test(text) && !mentionsCurrentZone) return false;
  return text.trim().length > 0;
};

const hasQualitySeeEvidence = (memo: WorkspacePreSeePlanningMemoContent | null) => {
  if (!memo) return false;
  const hasSiteZone = Boolean(memo.siteDescription.zoneCode || memo.siteDescription.zoneName || memo.siteDescription.zoneLabel);
  if (!hasSiteZone) return false;
  const zoneCode = siteZoneCodeForReadiness(memo);
  const applicableDcpRefs = new Set(
    (memo.applicableControls.dcpClauses ?? [])
      .filter((clause) => isApplicableReadinessText([clause.ref, clause.title, clause.headingPath?.join(" "), clause.bodyText].filter(Boolean).join("\n"), zoneCode))
      .map((clause) => clause.title || clause.ref || clause.headingPath.join(" > "))
      .filter(Boolean),
  );
  const assessmentCitations = memo.consistencyAssessment.flatMap((item) => item.citations ?? []);
  const hasApplicableCitation = assessmentCitations.some((citation) => citation.type === "LEP" || applicableDcpRefs.has(citation.ref));
  const hasApplicableRetrievedEvidence =
    applicableDcpRefs.size > 0 ||
    (memo.applicableControls.sourceExcerpts ?? []).some((excerpt) => isApplicableReadinessText([excerpt.heading, excerpt.content].filter(Boolean).join("\n"), zoneCode));
  return hasApplicableCitation || hasApplicableRetrievedEvidence;
};

const normaliseReviewRequestContent = (value: unknown): ReviewRequestContent | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ReviewRequestContent>;
  return candidate.requestType === "expert_review_request" && Array.isArray(candidate.includedArtefacts)
    ? (candidate as ReviewRequestContent)
    : null;
};

const isPreSeeMemoArtefact = (artefact: WorkspaceArtefact) => {
  const normalizedTitle = normaliseMemoLabel(artefact.title);
  const normalizedNoteType = artefact.noteType
    ? normaliseMemoLabel(artefact.noteType)
    : "";
  return (
    normalizedNoteType === "pre-see memo" ||
    normalisePreSeeMemoContent(artefact.preSeeMemo) !== null ||
    normalizedTitle.includes("pre-see planning memo") ||
    normalizedTitle.includes("see memo")
  );
};

const formatMemoDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};


const mapServerDetailedPlanningPackArtefact = (
  artefact: ServerArtefactRecord,
): WorkspaceArtefact | null => {
  const detailedPlanningPack = normaliseDetailedPlanningPackContent(artefact.payload);
  if (!detailedPlanningPack) return null;
  const citedCount = detailedPlanningPack.dcpEvidence.filter((topic) => topic.status === "Cited").length;
  return {
    id: artefact.id,
    title: artefact.title,
    owner: "You",
    updatedAt: formatMemoDate(detailedPlanningPack.generatedAt ?? artefact.capturedAt ?? artefact.updatedAt ?? artefact.createdAt ?? new Date().toISOString()),
    type: "detailed_planning_pack",
    noteType: "Detailed Planning Pack",
    metadata: [
      detailedPlanningPack.site.zoneLabel,
      `${citedCount} cited DCP topic${citedCount === 1 ? "" : "s"}`,
      `${detailedPlanningPack.unresolvedTopics.length} unresolved topic${detailedPlanningPack.unresolvedTopics.length === 1 ? "" : "s"}`,
    ].filter(Boolean).join(" · ") || artefact.notes || "Saved Detailed Planning Pack",
    detailedPlanningPack,
    staleAt: artefact.staleAt ?? undefined,
  };
};

const mapServerPreSeeMemoArtefact = (
  artefact: ServerArtefactRecord,
): WorkspaceArtefact | null => {
  const preSeeMemo = normalisePreSeeMemoContent(artefact.payload);

  if (!preSeeMemo) {
    return null;
  }

  const generatedAt =
    preSeeMemo?.generatedAt ??
    artefact.capturedAt ??
    artefact.updatedAt ??
    artefact.createdAt;
  const dcpCount = preSeeMemo?.applicableControls.dcpClauses.length ?? 0;
  const sourceCount = preSeeMemo?.applicableControls.sourceExcerpts.length ?? 0;
  const metadata = [
    preSeeMemo?.siteDescription.zoneLabel,
    `${dcpCount} DCP clause${dcpCount === 1 ? "" : "s"}`,
    `${sourceCount} source excerpt${sourceCount === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: artefact.id,
    title: artefact.title,
    owner: "You",
    updatedAt: generatedAt ? formatMemoDate(generatedAt) : "Saved",
    type: "report",
    noteType: "Pre-SEE memo",
    metadata: metadata || artefact.notes || "Saved pre-SEE planning memo",
    preSeeMemo: preSeeMemo ?? undefined,
  };
};

const mapServerFeasibilityArtefact = (
  artefact: ServerArtefactRecord,
): WorkspaceArtefact | null => {
  const content = normaliseFeasibilityContent(artefact.payload);
  if (!content) return null;

  return {
    id: artefact.id,
    title: artefact.title,
    owner: "You",
    updatedAt: formatMemoDate(
      content.generatedAt ??
        artefact.capturedAt ??
        artefact.updatedAt ??
        artefact.createdAt ??
        new Date().toISOString(),
    ),
    type: "feasibility",
    noteType: "Basic Feasibility",
    metadata: `${content.developmentType} · ${content.overallVerdict}`,
    content,
    staleAt: artefact.staleAt ?? undefined,
  };
};


const mapServerReviewRequestArtefact = (
  artefact: ServerArtefactRecord,
): WorkspaceArtefact | null => {
  const reviewRequest = normaliseReviewRequestContent(artefact.payload);
  if (!reviewRequest) return null;

  return {
    id: artefact.id,
    title: artefact.title,
    owner: "You",
    updatedAt: formatMemoDate(
      reviewRequest.generatedAt ??
        artefact.capturedAt ??
        artefact.updatedAt ??
        artefact.createdAt ??
        new Date().toISOString(),
    ),
    type: "review_request",
    noteType: "Expert review request",
    metadata: `${reviewRequest.includedArtefacts.length} artefacts · ${reviewRequest.citedSources.length} cited sources`,
    reviewRequest,
  };
};

const mapServerQuickSiteCheckArtefact = (
  artefact: ServerArtefactRecord,
): WorkspaceArtefact | null => {
  const report = normaliseQuickSiteCheckReport(artefact.payload);
  if (!report) return null;
  const controls = Object.values(report.controls ?? {}).filter((control) => control?.present).length;
  const evidenceMetadata = report.lepEvidenceSummary
    ? `LEP evidence quality: ${report.lepEvidenceSummary.label} · ${report.lepEvidenceSummary.sourceRef}`
    : null;
  return {
    id: artefact.id,
    title: artefact.title,
    owner: "You",
    updatedAt: formatMemoDate(report.generatedAt ?? artefact.capturedAt ?? artefact.updatedAt ?? artefact.createdAt ?? new Date().toISOString()),
    type: "report",
    noteType: "Quick Site Check",
    metadata: [evidenceMetadata, report.site?.zoneLabel, report.site?.lga, `${controls} cited/structured control${controls === 1 ? "" : "s"}`].filter(Boolean).join(" · ") || artefact.notes || "Saved Quick Site Check",
    quickSiteCheck: report,
    staleAt: artefact.staleAt ?? undefined,
  };
};

const mapServerWorkspaceArtefact = (
  artefact: ServerArtefactRecord,
): WorkspaceArtefact | null => {
  if (artefact.type === "quick_site_check") return mapServerQuickSiteCheckArtefact(artefact);
  if (artefact.type === "feasibility") return mapServerFeasibilityArtefact(artefact);
  if (artefact.type === "review_request") return mapServerReviewRequestArtefact(artefact);
  if (artefact.type === "detailed_planning_pack") return mapServerDetailedPlanningPackArtefact(artefact);
  return mapServerPreSeeMemoArtefact(artefact);
};

function extractSessionSignalsFromText(
  message: string,
  projectName: string,
): Partial<WorkspaceSessionSignals> {
  const normalized = message.toLowerCase();
  const zoneMatch = message.match(zoningPattern);
  const lgaMatch = normalized.match(
    /(sydney|parramatta|newcastle|wollongong|hornsby|blacktown)/,
  );
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
    lga: lgaMatch
      ? `${lgaMatch[1][0]?.toUpperCase() ?? ""}${lgaMatch[1].slice(1)} Council`
      : undefined,
    lastSummary: sanitized
      ? `${sanitized.slice(0, 160)}${sanitized.length > 160 ? "…" : ""}`
      : undefined,
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

function OutputSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 py-5 last:border-b-0 dark:border-slate-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {title}
        </h2>
        {action}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ReviewRequestCard({
  artefact,
  content,
}: {
  artefact: WorkspaceArtefact;
  content: ReviewRequestContent;
}) {
  const [copied, setCopied] = useState(false);
  const siteLabel = [
    content.site?.address,
    content.site?.lga,
    content.site?.zoneLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const listPreview = (items: string[]) => items.slice(0, 3);
  const plainText = formatReviewRequestHandoff(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      // Clipboard access can be unavailable in some browsers; keep the UI non-blocking.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([plainText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reviewRequestFilename(content);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 text-sm dark:border-purple-500/20 dark:bg-purple-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-950 dark:text-white">
            {artefact.title}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {content.packageSummary}
          </p>
          {siteLabel ? (
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-purple-700 dark:text-purple-200">
              {siteLabel}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5 border-purple-200 bg-white/80 text-purple-700 hover:text-purple-900 dark:border-purple-400/30 dark:bg-slate-950/30 dark:text-purple-200 dark:hover:text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="gap-1.5 border-purple-200 bg-white/80 text-purple-700 hover:text-purple-900 dark:border-purple-400/30 dark:bg-slate-950/30 dark:text-purple-200 dark:hover:text-white"
          >
            <Download className="h-3.5 w-3.5" /> Download .txt
          </Button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-white/80 p-2 dark:bg-slate-950/30">
          <dt className="text-slate-400 dark:text-slate-500">Artefacts</dt>
          <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
            {(content.includedArtefacts ?? []).length}
          </dd>
        </div>
        <div className="rounded-xl bg-white/80 p-2 dark:bg-slate-950/30">
          <dt className="text-slate-400 dark:text-slate-500">Citations</dt>
          <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
            {(content.citedSources ?? []).length}
          </dd>
        </div>
        <div className="rounded-xl bg-white/80 p-2 dark:bg-slate-950/30">
          <dt className="text-slate-400 dark:text-slate-500">Gaps</dt>
          <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
            {(content.confidenceGaps ?? []).length}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Included outputs
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {(content.includedArtefacts ?? []).map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span className="min-w-0 truncate">{item.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {content.lepEvidenceSummary ? (
            <div className="sm:col-span-2 rounded-xl border border-purple-100 bg-white/70 p-3 text-xs text-slate-600 dark:border-purple-500/20 dark:bg-slate-950/20 dark:text-slate-300">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                LEP evidence quality
              </p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {content.lepEvidenceSummary.label} · {content.lepEvidenceSummary.sourceRef}
              </p>
              <p className="mt-1">{content.lepEvidenceSummary.detail}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {content.lepEvidenceSummary.objectiveCount} objectives · {content.lepEvidenceSummary.landUseEntryCount} land-use entries · {content.lepEvidenceSummary.citedControlCount}/{content.lepEvidenceSummary.totalControlCount} cited numeric LEP controls
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Confidence gaps
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {listPreview(content.confidenceGaps ?? []).map((gap) => (
                <li key={gap}>• {gap}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Missing inputs
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {listPreview(content.missingInputs ?? []).map((input) => (
                <li key={input}>• {input}</li>
              ))}
            </ul>
          </div>
        </div>

        <details className="rounded-xl border border-purple-100 bg-white/70 p-3 text-xs dark:border-purple-500/20 dark:bg-slate-950/20">
          <summary className="cursor-pointer font-semibold text-purple-700 dark:text-purple-200">
            View assumptions and review scope
          </summary>
          <div className="mt-3 space-y-3 text-slate-600 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Assumptions
              </p>
              <ul className="mt-1 space-y-1">
                {(content.assumptions ?? []).map((assumption) => (
                  <li key={assumption}>• {assumption}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Recommended review scope
              </p>
              <ul className="mt-1 space-y-1">
                {(content.recommendedReviewScope ?? []).map((scope) => (
                  <li key={scope}>• {scope}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>

      <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Saved {artefact.updatedAt}
      </p>
    </article>
  );
}

const readinessStatusClasses: Record<CommercialReadinessStatus, string> = {
  Confirmed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  Likely:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  "Needs Input":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  "Needs Expert Review":
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-200",
  Unavailable:
    "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function ProjectWorkspace({
  project,
  initialPrompt,
  initialAddress,
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { requireAuth, openAuthModal, isAuthenticated } = useAuthGuard();
  const {
    getChatHistory,
    saveChatHistory,
    addArtefact,
    getArtefacts,
    getUploadUsage,
    recordUpload,
    appendSourceContext,
    setSessionSignals,
    getSessionSignals,
    state,
  } = useExperience();
  const projectKey = project.publicId ?? project.id;

  const [sources, setSources] = useState<WorkspaceSource[]>([]);
  const [sourceFilter, setSourceFilter] = useState<WorkspaceSourceType | "all">(
    "all",
  );
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [messageReactions, setMessageReactions] = useState<
    Record<string, Record<string, number>>
  >({});
  const [openLepSourcesByMessageId, setOpenLepSourcesByMessageId] = useState<
    Record<string, boolean>
  >({});
  const [now, setNow] = useState(() => new Date());
  const [chatSearch, setChatSearch] = useState("");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [hasClaimedProjects, setHasClaimedProjects] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<
    Record<
      string,
      {
        status: "pending" | "uploading" | "success" | "error";
        message?: string;
      }
    >
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [serverLimitReached, setServerLimitReached] = useState(false);
  const [isMapsToolsModalOpen, setIsMapsToolsModalOpen] = useState(false);
  const [isQuickSiteCheckOpen, setIsQuickSiteCheckOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<null | "documents">(null);
  const [staleArtefacts, setStaleArtefacts] = useState<StaleArtefact[]>([]);
  const [staleArtefactsDismissed, setStaleArtefactsDismissed] = useState(false);
  const [regenerationState, setRegenerationState] = useState<
    Record<string, RegenerationState>
  >({});
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [dismissingNotificationId, setDismissingNotificationId] = useState<
    string | null
  >(null);
  const [, setIsGeneratingPreSeeMemo] = useState(false);
  const [isGeneratingSee, setIsGeneratingSee] = useState(false);
  const [proposalBrief, setProposalBrief] = useState("");
  const [isGeneratingDetailedPack, setIsGeneratingDetailedPack] = useState(false);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [serverArtefacts, setServerArtefacts] = useState<WorkspaceArtefact[]>(
    [],
  );
  const [hasLoadedServerArtefacts, setHasLoadedServerArtefacts] =
    useState(false);
  const [sessionSignals, setSessionSignalsState] =
    useState<WorkspaceSessionSignals>(() => getSessionSignals(projectKey));
  const [siteContext, setSiteContext] = useState<SiteContextSummary | null>(
    null,
  );
  const [siteContextLoaded, setSiteContextLoaded] = useState(false);
  const zoningLabel = useMemo(
    () => buildZoningLabel(siteContext),
    [siteContext],
  );
  const [siteSelection, setSiteSelection] = useState<SiteSelectionState | null>(
    null,
  );
  const [siteSelectionCandidateId, setSiteSelectionCandidateId] = useState<
    string | null
  >(null);
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [siteSelectionError, setSiteSelectionError] = useState<string | null>(
    null,
  );
  const [siteSearchAvailable, setSiteSearchAvailable] = useState<
    "loading" | "ok" | "missing_env"
  >("loading");
  const [suggestions, setSuggestions] = useState<SiteCandidate[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState<
    number | null
  >(null);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<SiteCandidate | null>(null);
  const [isSiteSearchPending, setIsSiteSearchPending] = useState(false);
  const [isConfirmingSite, setIsConfirmingSite] = useState(false);
  const [dcpLink, setDcpLink] = useState<DcpLink | null>(null);
  const [isLoadingDcpLink, setIsLoadingDcpLink] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const siteSearchInputRef = useRef<HTMLInputElement | null>(null);
  const suggestionAbortRef = useRef<AbortController | null>(null);
  const suggestionTimeoutRef = useRef<number | null>(null);
  const initialPromptAppliedRef = useRef(false);
  const autoSiteAttemptedRef = useRef(false);
  const siteContextMutationsDisabled =
    process.env.NEXT_PUBLIC_DISABLE_SITE_CONTEXT === "true";
  const initialInlineAddress = useMemo(
    () => initialAddress?.trim() || undefined,
    [initialAddress],
  );
  const { maturity: lgaCoverageMaturity } = useLgaCoverageStatus(
    siteContext?.lgaCode,
  );

  const uploadUsage = getUploadUsage(projectKey);
  const uploadLimitReached =
    serverLimitReached ||
    (uploadUsage.limit > 0 && uploadUsage.used >= uploadUsage.limit);
  const limitMessage = uploadLimitReached
    ? state.userTier === "guest"
      ? "You’ve used your free upload. Create a free account to upload more documents."
      : state.userTier === "free"
        ? "You’ve reached your 5-document limit. Upgrade to a paid plan to upload more."
        : "You've reached this workspace's document cap. Contact us to extend your plan."
    : null;
  const isDcpLinkAvailable = Boolean(dcpLink?.url);
  const filteredMessages = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();

    if (!query) {
      return messages;
    }

    return messages.filter((message) =>
      message.content.toLowerCase().includes(query),
    );
  }, [chatSearch, messages]);
  const documentCta =
    state.userTier === "guest"
      ? { href: "/signin", label: "Create a free account" }
      : state.userTier === "free"
        ? {
            href: "mailto:hello@plannera.ai",
            label: "Contact sales to upgrade",
          }
        : {
            href: "mailto:hello@plannera.ai",
            label: "Contact us to extend your plan",
          };

  const displayedSources = useMemo(() => {
    if (sourceFilter === "all") {
      return sources;
    }
    const matching = sources.filter((source) => source.type === sourceFilter);
    const nonMatching = sources.filter(
      (source) => source.type !== sourceFilter,
    );
    return [...matching, ...nonMatching];
  }, [sourceFilter, sources]);

  const activeSourceFilterLabel =
    sourceFilter === "all" ? "All types" : sourceTypeLabels[sourceFilter];
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
    if (!isAuthenticated || hasClaimedProjects) {
      return;
    }

    const claimProjects = async () => {
      try {
        const response = await fetch("/api/projects/claim", { method: "POST" });
        if (!response.ok) {
          return;
        }
        setHasClaimedProjects(true);
        router.refresh();
      } catch (error) {
        console.error("[workspace] Failed to claim projects", error);
      }
    };

    void claimProjects();
  }, [hasClaimedProjects, isAuthenticated, router]);

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
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    const loadChatHistory = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectKey}/chat-history`,
          { credentials: "include" },
        );
        if (!response.ok) {
          return;
        }

        const data: { messages?: ServerChatHistoryMessage[] } =
          await response.json();
        if (cancelled || !Array.isArray(data.messages)) {
          return;
        }

        const hydratedMessages = data.messages
          .filter(
            (
              message,
            ): message is ServerChatHistoryMessage & {
              role: WorkspaceMessage["role"];
            } => message.role === "user" || message.role === "assistant",
          )
          .map(
            (message): WorkspaceMessage => ({
              id: message.id,
              role: message.role,
              content: message.content,
              createdAt: message.createdAt,
              timestamp: new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              confidenceScore: message.confidenceScore ?? null,
              lepSourceRefs: message.lepSourceRefs ?? [],
              reactions: (message.reactions as Record<string, number>) ?? {},
            }),
          );

        setMessages(hydratedMessages);
        const initReactions: Record<string, Record<string, number>> = {};
        hydratedMessages.forEach((message) => {
          if (message.reactions && Object.keys(message.reactions).length > 0) {
            initReactions[message.id] = message.reactions;
          }
        });
        setMessageReactions(initReactions);
        saveChatHistory(projectKey, hydratedMessages);
      } catch (error) {
        console.error("[workspace] Failed to load chat history", error);
      }
    };

    void loadChatHistory();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, projectKey, saveChatHistory]);

  useEffect(() => {
    if (!isAuthenticated) {
      setServerArtefacts([]);
      setHasLoadedServerArtefacts(false);
      return;
    }

    setHasLoadedServerArtefacts(false);

    let cancelled = false;
    const loadServerArtefacts = async () => {
      try {
        const response = await fetch(`/api/projects/${projectKey}/artefacts`, {
          credentials: "include",
        });
        if (!response.ok) {
          if (!cancelled) setHasLoadedServerArtefacts(true);
          return;
        }

        const data = (await response
          .json()
          .catch(() => [])) as ServerArtefactRecord[];
        if (cancelled) return;

        setServerArtefacts(
          data
            .map(mapServerWorkspaceArtefact)
            .filter((artefact): artefact is WorkspaceArtefact =>
              Boolean(artefact),
            ),
        );
        setHasLoadedServerArtefacts(true);
      } catch (error) {
        console.error("Failed to load project artefacts", error);
        if (!cancelled) setHasLoadedServerArtefacts(true);
      }
    };

    void loadServerArtefacts();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, projectKey]);

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

        const mappedSources: WorkspaceSource[] = (data.uploads ?? []).map(
          (upload) => ({
            id: upload.id,
            name: upload.fileName,
            detail: upload.mimeType ?? upload.fileExtension ?? "File",
            type: determineSourceType(upload.fileName),
            uploadedAt: new Date(upload.createdAt).toLocaleDateString(),
            sizeLabel: formatFileSize(upload.fileSize),
            status: "Synced",
            url: upload.publicUrl,
            fileExtension: upload.fileExtension ?? null,
          }),
        );

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
        const response = await fetch(
          `/api/site-context?projectId=${projectKey}`,
        );
        if (!response.ok) {
          return;
        }
        const data: { siteContext: SiteContextSummary | null } =
          await response.json();
        if (isMounted) {
          setSiteContext(data.siteContext ?? null);
        }
      } catch (error) {
        console.warn("Workspace site context load failed", error);
      } finally {
        if (isMounted) {
          setSiteContextLoaded(true);
        }
      }
    };
    void loadSiteContext();
    return () => {
      isMounted = false;
    };
  }, [projectKey]);

  useEffect(() => {
    const trimmedInitialAddress = initialInlineAddress;

    if (
      !siteContextLoaded ||
      siteContext ||
      !trimmedInitialAddress ||
      autoSiteAttemptedRef.current
    ) {
      return;
    }

    autoSiteAttemptedRef.current = true;

    if (siteContextMutationsDisabled) {
      setSiteSelectionError(null);
      setSiteSearchQuery(trimmedInitialAddress);
      return;
    }

    const attemptAutoSiteSelection = async () => {
      setIsConfirmingSite(true);
      try {
        const response = await fetch("/api/site-context/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmedInitialAddress }),
        });

        const data: {
          candidates?: SiteCandidate[];
          error?: string;
          message?: string;
        } = await response.json();

        if (response.ok && data.candidates?.length) {
          const normalizedCandidates = data.candidates.map((candidate) =>
            normaliseCandidateForRequest(candidate),
          );
          const primaryCandidate = normalizedCandidates[0];
          const siteContextPayload = await setSiteFromCandidate({
            projectId: projectKey,
            candidate: primaryCandidate,
            addressInput: trimmedInitialAddress,
          });
          setSiteContext(siteContextPayload ?? null);
          router.refresh();
          setSiteSelection(null);
          setSiteSelectionError(null);
          return;
        }

        if (data?.error === "property_search_not_configured") {
          setSiteSearchAvailable("missing_env");
          const resolvedLgaName = sessionSignals?.lga ?? null;
          const manualResponse = await fetch("/api/site-context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: projectKey,
              rawAddress: trimmedInitialAddress,
              lgaName: resolvedLgaName,
              lgaCode: null,
              resolverStatus: "manual_no_property_api",
            }),
          });
          const manualData: {
            siteContext?: SiteContextSummary | null;
            message?: string;
          } = await manualResponse.json();
          if (manualResponse.ok) {
            setSiteContext(manualData.siteContext ?? null);
            router.refresh();
            setSiteSelection(null);
            setSiteSelectionError(null);
            return;
          }
        }

        setSiteSelection({
          source: "manual",
          addressInput: trimmedInitialAddress,
          candidates: [],
        });
        setSiteSearchQuery(trimmedInitialAddress);
        setSiteSelectionError(
          "I couldn’t find that address. Please confirm or adjust it below.",
        );
      } catch (error) {
        console.warn("Auto site set failed", error);
        setSiteSelection({
          source: "manual",
          addressInput: trimmedInitialAddress,
          candidates: [],
        });
        setSiteSearchQuery(trimmedInitialAddress);
      } finally {
        setIsConfirmingSite(false);
      }
    };

    void attemptAutoSiteSelection();
  }, [
    initialInlineAddress,
    projectKey,
    router,
    sessionSignals.lga,
    siteContext,
    siteContextLoaded,
    siteContextMutationsDisabled,
    siteContext?.lgaCode,
  ]);

  useEffect(() => {
    let cancelled = false;
    const fetchDcpLink = async () => {
      const lgaCode = siteContext?.lgaCode;

      if (!lgaCode) {
        setDcpLink(null);
        setIsLoadingDcpLink(false);
        return;
      }

      setIsLoadingDcpLink(true);

      try {
        const response = await fetch(
          `/api/dcp-link?lgaCode=${encodeURIComponent(lgaCode)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load DCP link");
        }

        const data: DcpLink = await response.json();
        if (cancelled) return;

        setDcpLink({
          lgaCode: data?.lgaCode ?? lgaCode,
          name: data?.name ?? null,
          url: data?.url ?? null,
        });
      } catch (error) {
        console.warn("Unable to load DCP link", error);
        if (!cancelled) {
          setDcpLink({ lgaCode: lgaCode.toUpperCase(), name: null, url: null });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDcpLink(false);
        }
      }
    };

    void fetchDcpLink();

    return () => {
      cancelled = true;
    };
  }, [siteContext?.lgaCode]);

  const adjustChatInputHeight = useCallback(() => {
    if (!chatInputRef.current) return;
    const textarea = chatInputRef.current;
    const maxHeight = 144; // roughly 6 lines at the text-sm line height
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

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
    adjustChatInputHeight();
  }, [adjustChatInputHeight, input]);

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
    if (
      selectedSuggestion &&
      selectedSuggestion.formattedAddress === trimmedQuery
    ) {
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
        const data: {
          status?: string;
          candidates?: SiteCandidate[];
          error?: string;
        } = await response.json();
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
        const candidates = (data.candidates ?? []).map((candidate) =>
          normaliseCandidateForRequest(candidate),
        );
        setSuggestions(candidates);
        setHighlightedSuggestionIndex(candidates.length ? 0 : null);
        setSiteSelectionError(
          candidates.length
            ? null
            : "No NSW address matches were found. Try refining the suburb or street number.",
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
    [projectKey, setSessionSignals],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const appendToolMessage = useCallback(
    (content: string, signals?: WorkspaceSessionSignals) => {
      const createdAt = new Date().toISOString();
      const toolMessage: WorkspaceMessage = {
        id: `msg-${Date.now()}-tool`,
        role: "assistant",
        content,
        createdAt,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      if (signals) {
        applySessionSignals(signals);
      }

      setMessages((previous) => {
        const updated = [...previous, toolMessage];
        saveChatHistory(projectKey, updated);
        return updated;
      });
    },
    [applySessionSignals, projectKey, saveChatHistory],
  );

  const showToast = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      setToast({ message, variant });
      window.setTimeout(() => setToast(null), 3500);
    },
    [],
  );

  const handleQuickSiteCheckArtefactSaved = useCallback(
    (title: string, summary: string, report?: QuickSiteCheckReport) => {
      const preview = summary.replace(/\s+/g, " ").trim();
      const artefact: WorkspaceArtefact = {
        id: `quick-site-check-${Date.now()}`,
        title,
        owner: "You",
        updatedAt: "Just now",
        type: "report",
        metadata:
          `${preview.slice(0, 80)}${preview.length > 80 ? "…" : ""}` ||
          "LEP quick site check summary",
        quickSiteCheck: report,
      };
      addArtefact(projectKey, artefact);
      showToast("Saved Quick Site Check as artefact");
    },
    [addArtefact, projectKey, showToast],
  );

  const sendMessage = useCallback(
    async (options?: { message?: string; skipUserMessage?: boolean }) => {
      const prompt = options?.message ?? input;
      const trimmedInput = prompt.trim();
      if (!trimmedInput) return;

      const skipUserMessage = options?.skipUserMessage ?? false;

      if (!skipUserMessage) {
        applySessionSignals({
          ...extractSessionSignalsFromText(trimmedInput, project.name),
          recentSource: sources[0]?.name ?? sessionSignals.recentSource,
        });
        const createdAt = new Date().toISOString();
        const newMessage: WorkspaceMessage = {
          id: `msg-${Date.now()}`,
          role: "user",
          content: trimmedInput,
          createdAt,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
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
            messages: [
              ...messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
              ...(skipUserMessage
                ? []
                : [{ role: "user", content: trimmedInput }]),
            ],
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
          sourceAttribution?: WorkspaceMessage["sourceAttribution"];
          lepSourceRefs?: string[];
          assistantMessageId?: string | null;
        } = await response.json();

        if (data.siteContext) {
          setSiteContext(data.siteContext);
        }

        if (data.requiresSiteSelection && data.candidates?.length) {
          const normalizedCandidates = data.candidates.map((candidate) =>
            normaliseCandidateForRequest(candidate),
          );
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
        const assistantCreatedAt = new Date().toISOString();
        const assistantMessage: WorkspaceMessage = {
          id: data.assistantMessageId ?? `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: data.reply ?? replyFallback,
          createdAt: assistantCreatedAt,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sourceAttribution: data.sourceAttribution,
          lepSourceRefs: data.lepSourceRefs ?? [],
        };
        applySessionSignals(
          deriveSignalsFromAssistantPayload({
            reply: assistantMessage.content,
            lga: data?.lga,
            zone: data?.zone,
            instruments: data?.instruments,
            recentSource: sources[0]?.name,
          }),
        );
        setMessages((previous) => {
          const updated = [...previous, assistantMessage];
          saveChatHistory(projectKey, updated);
          return updated;
        });
      } catch (error) {
        console.error("Workspace chat send error", error);
        const assistantCreatedAt = new Date().toISOString();
        const assistantMessage: WorkspaceMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content:
            "I couldn’t retrieve the Sydney LEP or SEPP clauses right now. Please try again or add the council area and zone for a precise lookup.",
          createdAt: assistantCreatedAt,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((previous) => {
          const updated = [...previous, assistantMessage];
          saveChatHistory(projectKey, updated);
          return updated;
        });
      } finally {
        setIsThinking(false);
      }
    },
    [
      applySessionSignals,
      input,
      messages,
      project.name,
      projectKey,
      saveChatHistory,
      sessionSignals,
      sources,
    ],
  );

  useEffect(() => {
    const trimmedPrompt = initialPrompt?.trim();
    const hasInitialAddress = Boolean(initialAddress?.trim());
    if (
      !trimmedPrompt ||
      initialPromptAppliedRef.current ||
      messages.length > 0 ||
      hasInitialAddress
    ) {
      return;
    }
    initialPromptAppliedRef.current = true;
    setInput(trimmedPrompt);
    void sendMessage({ message: trimmedPrompt });
  }, [initialAddress, initialPrompt, messages.length, sendMessage]);

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

  const handleNewThread = () => {
    setMessages([]);
    saveChatHistory(projectKey, []);
    setInput("");
  };

  const handleCopyTranscript = async () => {
    const text = formatTranscript(messages);
    await navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      setMessageReactions((prev) => {
        const current = prev[messageId] ?? {};
        const updated = { ...current };
        if (updated[emoji]) {
          delete updated[emoji];
        } else {
          updated[emoji] = 1;
        }
        return { ...prev, [messageId]: updated };
      });

      try {
        const res = await fetch(`/api/workspace-chat/${messageId}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
        if (res.ok) {
          const data: { reactions?: Record<string, number> } = await res.json();
          setMessageReactions((prev) => ({
            ...prev,
            [messageId]: data.reactions ?? {},
          }));
        }
      } catch {
        // Optimistic update stands; reactions are non-critical feedback.
      }
    },
    [],
  );

  const saveChatArtefact = useCallback(() => {
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
  }, [addArtefact, messages, projectKey, showToast]);

  const handleSaveChat = useCallback(() => {
    requireAuth(saveChatArtefact);
  }, [requireAuth, saveChatArtefact]);

  const openManualSiteSelection = useCallback(() => {
    void fetchSiteSearchAvailability();
    setSiteSelection({ source: "manual", addressInput: "", candidates: [] });
    setSiteSelectionCandidateId(null);
    setSiteSelectionError(null);
    setSiteSearchQuery("");
    setSuggestions([]);
    setSelectedSuggestion(null);
    setHighlightedSuggestionIndex(null);
    setSuggestionsEnabled(true);
  }, [fetchSiteSearchAvailability]);

  const handleInlineSiteSubmit = useCallback(
    (address: string) => {
      const trimmed = address.trim();
      if (!trimmed) return;
      openManualSiteSelection();
      setSiteSelection((previous) => ({
        ...(previous ?? { source: "manual", candidates: [] }),
        addressInput: trimmed,
      }));
      setSiteSearchQuery(trimmed);
    },
    [openManualSiteSelection],
  );

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
    setSiteSelection({
      source: "manual",
      addressInput: candidate.formattedAddress,
      candidates: [candidate],
    });
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
        previous
          ? { ...previous, addressInput: trimmedQuery, candidates: [] }
          : previous,
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
      const data: {
        candidates?: SiteCandidate[];
        message?: string;
        error?: string;
      } = await response.json();
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
      const normalizedCandidates = (data.candidates ?? []).map((candidate) =>
        normaliseCandidateForRequest(candidate),
      );
      setSiteSelection((previous) =>
        previous
          ? {
              ...previous,
              addressInput: trimmedQuery,
              candidates: normalizedCandidates,
            }
          : previous,
      );
      setSiteSelectionCandidateId(null);
      setSelectedSuggestion(null);
      if (!data.candidates?.length) {
        setSiteSelectionError(
          "No NSW address matches were found. Try refining the suburb or street number.",
        );
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

  const handleSiteCandidateConfirm = async (
    candidateOverride?: SiteCandidate,
  ) => {
    const selectedCandidate =
      candidateOverride ??
      selectedSuggestion ??
      (siteSelectionCandidateId
        ? siteSelection?.candidates.find(
            (candidate) => candidate.id === siteSelectionCandidateId,
          )
        : null);
    const manualAddressInput =
      siteSelection?.addressInput ||
      siteSearchQuery ||
      selectedCandidate?.formattedAddress ||
      input;

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
        const data: {
          siteContext?: SiteContextSummary | null;
          message?: string;
        } = await response.json();
        if (!response.ok) {
          throw new Error(data?.message ?? "Unable to save site");
        }
        setSiteContext(data.siteContext ?? null);
        const pendingQuestion = siteSelection?.pendingQuestion;
        closeSiteSelection();
        if (pendingQuestion) {
          await sendMessage({
            message: pendingQuestion,
            skipUserMessage: true,
          });
        }
      } catch (error) {
        console.error("Manual site confirm error", error);
        setSiteSelectionError(
          "Unable to save the selected site. Please try again.",
        );
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
    const fallbackAddress =
      normalizedCandidate.formattedAddress || manualAddressInput || "";
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
        addressInput:
          manualAddressInput || normalizedCandidate.formattedAddress,
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

  const openUploadFlow = useCallback(() => {
    if (uploadLimitReached || uploadUsage.limit === 0) {
      setUpgradeModal("documents");
      return;
    }
    setShowUploadModal(true);
  }, [uploadLimitReached, uploadUsage.limit]);

  const handleAddSourceClick = useCallback(() => {
    requireAuth(openUploadFlow);
  }, [openUploadFlow, requireAuth]);

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
      setUploadError(
        "Unsupported file type. Please choose a PDF, document, spreadsheet, text, image, or ZIP file.",
      );
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
      setUploadError(
        "Unsupported file type. Please choose a PDF, document, spreadsheet, text, image, or ZIP file.",
      );
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
  ): Record<
    string,
    { status: "pending" | "uploading" | "success" | "error"; message?: string }
  > => {
    const statusMap: Record<
      string,
      {
        status: "pending" | "uploading" | "success" | "error";
        message?: string;
      }
    > = {};
    uploadQueue.forEach((file) => {
      statusMap[file.name] = message ? { status, message } : { status };
    });
    return statusMap;
  };

  const handleUploadConfirm = async () => {
    if (!isAuthenticated) {
      requireAuth(handleUploadConfirm);
      return;
    }
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
            messageFromServer ||
            "Document storage is not configured for this environment.";
          setUploadStatuses(buildStatusMap("error", message));
          setUploadError(message);
          return;
        }

        if (errorCode === "storage_upload_failed") {
          const message =
            messageFromServer ||
            "We couldn’t save that file right now. Please try again or contact support.";
          setUploadStatuses(buildStatusMap("error", message));
          setUploadError(message);
          return;
        }

        if (errorCode === "invalid_file") {
          const message =
            messageFromServer || "Please choose at least one file to upload.";
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
              : errorCode === "project_not_found" ||
                  errorCode === "project_id_missing"
                ? "Project could not be found."
                : errorCode === "db_write_failed" ||
                    errorCode === "db_read_failed"
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

      setServerLimitReached(
        payload.usage.limit > 0 && payload.usage.used >= payload.usage.limit,
      );
      const mappedSources: WorkspaceSource[] = (payload.uploads ?? []).map(
        (upload) => ({
          id: upload.id,
          name: upload.fileName,
          detail: upload.mimeType ?? upload.fileExtension ?? "File",
          type: determineSourceType(upload.fileName),
          uploadedAt: new Date(upload.createdAt).toLocaleDateString(),
          sizeLabel: formatFileSize(upload.fileSize),
          status: "Synced",
          url: upload.publicUrl,
          fileExtension: upload.fileExtension ?? null,
        }),
      );
      setSources((previous) => [...mappedSources, ...previous]);
      for (const file of uploadQueue) {
        const snippet = await extractContextSnippet(file);
        appendSourceContext(projectKey, snippet);
        applySessionSignals({ recentSource: file.name });
      }
      recordUpload(
        projectKey,
        Math.max(payload.usage.used - uploadUsage.used, 0),
      );
      setUploadStatuses(buildStatusMap("success"));
      showToast(
        `Uploaded ${uploadQueue.length} document${uploadQueue.length === 1 ? "" : "s"}`,
      );
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

  const experienceArtefacts = getArtefacts(projectKey);
  const artefacts = useMemo(() => {
    const merged = new Map<string, WorkspaceArtefact>();
    const serverMemoKeys = new Set<string>();

    serverArtefacts.forEach((artefact) => {
      merged.set(artefact.id, artefact);
      serverMemoKeys.add(normaliseMemoLabel(artefact.title));
    });

    experienceArtefacts.forEach((artefact) => {
      const isLocalMemoWithoutPayload =
        isPreSeeMemoArtefact(artefact) &&
        !normalisePreSeeMemoContent(artefact.preSeeMemo);
      const isDuplicateLocalMemo =
        isLocalMemoWithoutPayload &&
        serverMemoKeys.has(normaliseMemoLabel(artefact.title));
      const isStaleUnretrievableLocalMemo =
        isLocalMemoWithoutPayload && hasLoadedServerArtefacts;

      if (!isDuplicateLocalMemo && !isStaleUnretrievableLocalMemo) {
        merged.set(artefact.id, artefact);
      }
    });

    return Array.from(merged.values());
  }, [experienceArtefacts, hasLoadedServerArtefacts, serverArtefacts]);
  const latestFeasibilityContent = useMemo(() => {
    const feasibilityArtefact = artefacts.find(
      (artefact) =>
        artefact.type === "feasibility" &&
        normaliseFeasibilityContent(artefact.content),
    );
    return feasibilityArtefact
      ? normaliseFeasibilityContent(feasibilityArtefact.content)
      : null;
  }, [artefacts]);

  const generateDetailedPlanningPack = useCallback(async () => {
    if (!proposalBrief.trim()) {
      showToast("Enter a proposed-works brief before generating the Detailed Planning Pack", "error");
      return;
    }
    setIsGeneratingDetailedPack(true);
    try {
      const response = await fetch("/api/artefacts/generate-detailed-planning-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId: projectKey, proposalBrief }),
      });
      const data = (await response.json().catch(() => ({}))) as { artefactId?: string; content?: DetailedPlanningPackContent; error?: string };
      if (!response.ok || !data.artefactId || !data.content) throw new Error(data.error ?? "Unable to generate Detailed Planning Pack");
      const citedCount = data.content.dcpEvidence.filter((topic) => topic.status === "Cited").length;
      addArtefact(projectKey, {
        id: data.artefactId,
        title: `Detailed Planning Pack${data.content.site.address ? ` — ${data.content.site.address}` : ""}`,
        owner: "You",
        updatedAt: "Just now",
        type: "detailed_planning_pack",
        noteType: "Detailed Planning Pack",
        metadata: `${citedCount} cited DCP topic${citedCount === 1 ? "" : "s"} · ${data.content.unresolvedTopics.length} unresolved topic${data.content.unresolvedTopics.length === 1 ? "" : "s"}`,
        detailedPlanningPack: data.content,
      });
      showToast("Detailed Planning Pack saved as an artefact");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate Detailed Planning Pack";
      showToast(message, "error");
    } finally {
      setIsGeneratingDetailedPack(false);
    }
  }, [addArtefact, projectKey, proposalBrief, showToast]);

  const generatePreSeeMemo = useCallback(async () => {
    if (!siteContext) {
      showToast(
        "Set a confirmed site before generating a pre-SEE memo",
        "error",
      );
      return;
    }

    setIsGeneratingPreSeeMemo(true);
    setIsGeneratingSee(true);
    try {
      const response = await fetch("/api/artefacts/generate-see", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: projectKey,
          proposedWorksSummary:
            project.description?.trim() ||
            `Planning memo for ${project.name}${siteContext.formattedAddress ? ` at ${siteContext.formattedAddress}` : ""}.`,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        artefactId?: string;
        content?: WorkspacePreSeePlanningMemoContent;
        error?: string;
      };

      if (!response.ok || !data.artefactId || !data.content) {
        throw new Error(data.error ?? "Unable to generate pre-SEE memo");
      }

      const dcpCount =
        data.content?.applicableControls?.dcpClauses?.length ?? 0;
      const sourceCount =
        data.content?.applicableControls?.sourceExcerpts?.length ?? 0;
      const address =
        data.content?.siteDescription?.address ?? siteContext.formattedAddress;
      const zone = data.content?.siteDescription?.zoneLabel ?? zoningLabel;

      const artefact: WorkspaceArtefact = {
        id: data.artefactId,
        title: `Pre-SEE planning memo${address ? ` — ${address}` : ""}`,
        owner: "You",
        updatedAt: "Just now",
        type: "report",
        noteType: "Pre-SEE memo",
        metadata: [
          zone,
          `${dcpCount} DCP clause${dcpCount === 1 ? "" : "s"}`,
          `${sourceCount} source excerpt${sourceCount === 1 ? "" : "s"}`,
        ]
          .filter(Boolean)
          .join(" · "),
        preSeeMemo: data.content,
      };

      addArtefact(projectKey, artefact);
      showToast("Generated pre-SEE planning memo");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate pre-SEE memo";
      showToast(message, "error");
    } finally {
      setIsGeneratingPreSeeMemo(false);
      setIsGeneratingSee(false);
    }
  }, [
    addArtefact,
    project.description,
    project.name,
    projectKey,
    showToast,
    siteContext,
    zoningLabel,
  ]);

  const handleGeneratePreSeeMemo = useCallback(() => {
    if (!isAuthenticated) {
      showToast("Sign in, then click Draft SEE memo again", "error");
      openAuthModal();
      return;
    }

    void generatePreSeeMemo();
  }, [generatePreSeeMemo, isAuthenticated, openAuthModal, showToast]);

  useEffect(() => {
    let cancelled = false;

    async function loadStaleArtefacts() {
      try {
        const response = await fetch(
          `/api/projects/${projectKey}/artefacts/stale`,
        );
        if (!response.ok) return;

        const data = (await response.json()) as {
          staleArtefacts?: StaleArtefact[];
        };
        if (!cancelled) {
          setStaleArtefacts(data.staleArtefacts ?? []);
        }
      } catch (error) {
        console.error(
          "[workspace-outputs] Unable to load stale artefacts",
          error,
        );
      }
    }

    void loadStaleArtefacts();

    return () => {
      cancelled = true;
    };
  }, [projectKey]);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectKey}/notifications`,
          { credentials: "include" },
        );
        if (!response.ok) return;

        const data = (await response.json()) as {
          notifications?: ProjectNotification[];
        };
        if (!cancelled) {
          setNotifications(
            (data.notifications ?? []).filter(
              (notification) => notification.type === "LGA_SEARCHABLE_READY",
            ),
          );
        }
      } catch {
        // Keep workspace usable if notification fetch fails.
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [projectKey]);

  const staleArtefactTypes = useMemo(() => {
    const grouped = new Map<string, StaleArtefact>();
    for (const artefact of staleArtefacts) {
      if (!grouped.has(artefact.type)) {
        grouped.set(artefact.type, artefact);
      }
    }
    return Array.from(grouped.values());
  }, [staleArtefacts]);

  const regenerateStaleOutputs = useCallback(async () => {
    const artefact = staleArtefactTypes[0];
    if (!artefact) return;

    setRegenerationState((current) => ({
      ...current,
      [artefact.id]: "loading",
    }));

    try {
      const response = await fetch(
        `/api/projects/${projectKey}/artefacts/${artefact.id}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artefactType: artefact.type }),
        },
      );

      if (!response.ok) {
        throw new Error("Regeneration failed");
      }

      setRegenerationState((current) => ({
        ...current,
        [artefact.id]: "success",
      }));
      setStaleArtefacts((current) =>
        current.filter((item) => item.type !== artefact.type),
      );
      showToast("Regenerated stale output");
    } catch (error) {
      console.error(
        "[workspace-outputs] Unable to regenerate stale artefact",
        error,
      );
      setRegenerationState((current) => ({
        ...current,
        [artefact.id]: "error",
      }));
      showToast("Unable to regenerate output", "error");
    }
  }, [projectKey, showToast, staleArtefactTypes]);

  const dismissNotification = useCallback(
    async (notificationId: string) => {
      setDismissingNotificationId(notificationId);

      try {
        const response = await fetch(
          `/api/projects/${projectKey}/notifications/${notificationId}/read`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        if (!response.ok) return;

        setNotifications((current) =>
          current.filter((notification) => notification.id !== notificationId),
        );
      } catch {
        // Leave the notification visible so it can be dismissed later.
      } finally {
        setDismissingNotificationId(null);
      }
    },
    [projectKey],
  );

  const currentSiteScope = useMemo(() => ({
    address: siteContext?.formattedAddress ?? project.name,
    lgaName: siteContext?.lgaName,
    lgaCode: siteContext?.lgaCode,
    zoneCode: undefined,
    zoneLabel: zoningLabel,
  }), [project.name, siteContext?.formattedAddress, siteContext?.lgaCode, siteContext?.lgaName, zoningLabel]);

  const siteScopedArtefacts = useMemo(() =>
    artefacts.map((artefact) => {
      const scope = quickSiteCheckScope(artefact.quickSiteCheck) ?? detailedPlanningPackScope(artefact.detailedPlanningPack) ?? preSeeScope(artefact.preSeeMemo) ?? reviewRequestScope(artefact.reviewRequest);
      if (!scope) return artefact;
      const isCurrentSite = isArtefactCurrentForSite(currentSiteScope, scope);
      return {
        ...artefact,
        isCurrentSite,
        staleReason: isCurrentSite ? undefined : "Saved for a different site; rerun for the current site before relying on readiness.",
      };
    }),
  [artefacts, currentSiteScope]);

  const latestDetailedPlanningPackArtefact = useMemo(() => selectCurrentSiteDetailedPlanningPackArtefact(siteScopedArtefacts), [siteScopedArtefacts]);
  const latestDetailedPlanningPack = useMemo(() => normaliseDetailedPlanningPackContent(latestDetailedPlanningPackArtefact?.detailedPlanningPack), [latestDetailedPlanningPackArtefact]);
  const hasQualityDetailedPlanningPack = latestDetailedPlanningPack?.commercialReady === true;

  const latestSeeArtefact = useMemo(() => {
    return siteScopedArtefacts.find((artefact) =>
      artefact.isCurrentSite !== false && normalisePreSeeMemoContent(artefact.preSeeMemo),
    );
  }, [siteScopedArtefacts]);
  const latestSeeContent = useMemo(
    () => normalisePreSeeMemoContent(latestSeeArtefact?.preSeeMemo),
    [latestSeeArtefact],
  );
  const latestQuickSiteCheckArtefact = useMemo(() => {
    return siteScopedArtefacts.find((artefact) =>
      artefact.isCurrentSite !== false && normaliseMemoLabel(artefact.title).includes("quick site check"),
    );
  }, [siteScopedArtefacts]);
  const staleSiteArtefactCount = useMemo(() =>
    siteScopedArtefacts.filter((artefact) => artefact.isCurrentSite === false).length,
  [siteScopedArtefacts]);
  const latestReviewRequestArtefact = useMemo(() => {
    return siteScopedArtefacts.find((artefact) =>
      artefact.isCurrentSite !== false && normaliseReviewRequestContent(artefact.reviewRequest),
    );
  }, [siteScopedArtefacts]);
  const latestReviewRequestContent = useMemo(
    () => normaliseReviewRequestContent(latestReviewRequestArtefact?.reviewRequest),
    [latestReviewRequestArtefact],
  );
  const hasQualityQuickSiteCheck = hasCitedQuickSiteCheckEvidence(normaliseQuickSiteCheckReport(latestQuickSiteCheckArtefact?.quickSiteCheck));
  const hasQualitySee = hasQualitySeeEvidence(latestSeeContent);
  const hasPendingInitialSiteConfirmation = Boolean(initialInlineAddress && !siteContext);
  const hasSiteContext = Boolean(siteContext) || hasPendingInitialSiteConfirmation;
  const commercialNextAction = useMemo(
    () =>
      buildCommercialNextAction({
        hasSiteContext,
        lgaName: hasPendingInitialSiteConfirmation
          ? "Byron/Kempsey launch address confirming"
          : siteContext?.lgaName ?? sessionSignals.lga,
        lgaCode: hasPendingInitialSiteConfirmation
          ? "BYRON_KEMPSEY_CONFIRMING"
          : siteContext?.lgaCode ?? sessionSignals.lga,
        zoneLabel: zoningLabel,
        coverageMaturity: lgaCoverageMaturity,
        hasQuickSiteCheck: Boolean(latestQuickSiteCheckArtefact),
        hasSee: Boolean(latestSeeContent),
        hasDetailedPlanningPack: Boolean(latestDetailedPlanningPack),
        hasQualityDetailedPlanningPack,
        hasQualityQuickSiteCheck,
        hasQualitySee,
        isPendingInitialSiteConfirmation: hasPendingInitialSiteConfirmation,
      }),
    [
      hasSiteContext,
      hasQualityQuickSiteCheck,
      hasPendingInitialSiteConfirmation,
      hasQualitySee,
      latestQuickSiteCheckArtefact,
      latestSeeContent,
      latestDetailedPlanningPack,
      hasQualityDetailedPlanningPack,
      lgaCoverageMaturity,
      sessionSignals.lga,
      siteContext?.lgaCode,
      siteContext?.lgaName,
      zoningLabel,
    ],
  );

  const handleRequestExpertReview = useCallback(async () => {
    if (!isAuthenticated) {
      showToast("Sign in, then request expert review", "error");
      openAuthModal();
      return;
    }

    setIsRequestingReview(true);
    try {
      const response = await fetch("/api/artefacts/request-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId: projectKey }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        artefactId?: string;
        content?: ReviewRequestContent;
        error?: string;
      };

      if (!response.ok || !data.artefactId || !data.content) {
        throw new Error(data.error ?? "Unable to create expert review request");
      }

      addArtefact(projectKey, {
        id: data.artefactId,
        title: `Expert review request${data.content.site.address ? ` — ${data.content.site.address}` : ""}`,
        owner: "You",
        updatedAt: "Just now",
        type: "review_request",
        noteType: "Expert review request",
        metadata: `${data.content.includedArtefacts.length} artefacts · ${data.content.citedSources.length} cited sources · ${data.content.confidenceGaps.length} review gaps`,
        reviewRequest: data.content,
      });
      showToast("Expert review package saved as an artefact");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create expert review request";
      showToast(message, "error");
    } finally {
      setIsRequestingReview(false);
    }
  }, [addArtefact, isAuthenticated, openAuthModal, projectKey, showToast]);

  const handleCommercialPrimaryAction = useCallback(() => {
    if (commercialNextAction.primaryAction === "set_site") {
      siteSearchInputRef.current?.focus();
      showToast("Enter and confirm a Byron or Kempsey address to continue");
      return;
    }

    if (commercialNextAction.primaryAction === "run_quick_site_check") {
      setIsQuickSiteCheckOpen(true);
      return;
    }

    if (commercialNextAction.primaryAction === "generate_detailed_pack") {
      void generateDetailedPlanningPack();
      return;
    }

    if (commercialNextAction.primaryAction === "generate_see") {
      handleGeneratePreSeeMemo();
      return;
    }

    showToast("Use the SEE panel Copy or Download button, or request expert review");
  }, [commercialNextAction.primaryAction, generateDetailedPlanningPack, handleGeneratePreSeeMemo, showToast]);
  const activeStaleArtefact = staleArtefactTypes[0];
  const activeNotification = notifications[0];
  const outputStatusKind =
    lgaCoverageMaturity === "QUEUED" || lgaCoverageMaturity === "PROCESSING"
      ? "lga"
      : !staleArtefactsDismissed && activeStaleArtefact
        ? "stale"
        : activeNotification
          ? "notification"
          : null;
  const isRegeneratingStaleOutput = activeStaleArtefact
    ? regenerationState[activeStaleArtefact.id] === "loading"
    : false;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-1 flex-col gap-4 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#eff6ff,transparent_30rem)] px-4 pb-5 pt-3 text-slate-900 transition-colors sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100 xl:max-h-screen xl:overflow-hidden">
      <div className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-2 rounded-[1.5rem] border border-white/80 bg-white/85 px-3.5 py-2.5 shadow-sm shadow-slate-200/70 backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-900/85 dark:text-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-inherit">
            <Logo className="h-6 w-auto" />
            <span className="sr-only">Home</span>
          </Link>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:text-white"
            >
              ← My Projects
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
            aria-label="Toggle light and dark mode"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {isDarkMode ? "Light mode" : "Dark mode"}
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:border-slate-500">
            <Sparkles className="h-4 w-4" />
            Get help
          </button>
          {isAuthenticated ? (
            <SignOutButton className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:border-slate-500">
              <LogOut className="h-4 w-4" />
              Logout
            </SignOutButton>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/80 bg-slate-950 p-5 text-white shadow-2xl shadow-blue-950/10 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              Project workspace
            </p>
            <ProjectTitleEditor
              projectId={project.id}
              initialTitle={project.name}
            />
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              Your command centre for site context, source material, chat
              decisions and approval-ready outputs.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50">
            <Notebook className="h-4 w-4" />
            Share workspace
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-white/80 bg-white/90 px-3.5 py-2.5 shadow-sm shadow-slate-200/70 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <MapPin className="h-4 w-4 text-slate-500" />
          <span>{siteContext?.formattedAddress ?? (hasPendingInitialSiteConfirmation ? "Confirming site…" : "No site set")}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <Layers3 className="h-3.5 w-3.5" />
          {zoningLabel ? (
            <span>Zoning: {zoningLabel}</span>
          ) : (
            <span>{hasPendingInitialSiteConfirmation ? "Zoning: Confirming…" : "Zoning: Not available"}</span>
          )}
        </div>
        {siteContext?.councilMap?.url ? (
          <a
            href={siteContext.councilMap.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
          >
            <Link2 className="h-3.5 w-3.5" />
            Open council web map
          </a>
        ) : null}
        {siteContext ? (
          <button
            type="button"
            onClick={() => {
              if (dcpLink?.url) {
                window.open(dcpLink.url, "_blank", "noopener,noreferrer");
              }
            }}
            disabled={!isDcpLinkAvailable || isLoadingDcpLink}
            title={
              !isDcpLinkAvailable && !isLoadingDcpLink
                ? "No DCP link available yet"
                : undefined
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition",
              "hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400",
              "dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:disabled:border-slate-800 dark:disabled:text-slate-500",
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            {isLoadingDcpLink ? "Loading DCP" : "Open DCP"}
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="grid flex-1 min-h-0 items-stretch gap-4 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <section className="flex flex-col rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-sm shadow-slate-200/70 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900 md:h-full md:min-h-0">
            <div className="shrink-0 space-y-4">
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Sources
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Project evidence and references
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Usage
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    {uploadUsage.limit === 0
                      ? "Sign up to upload"
                      : `${uploadUsage.used} of ${uploadUsage.limit} documents used`}
                  </p>
                </div>
              </header>
              {limitMessage ? (
                <p className="text-xs font-semibold text-rose-600">
                  {limitMessage}
                </p>
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
                    onChange={(event) =>
                      setSourceFilter(
                        event.target.value as WorkspaceSourceType | "all",
                      )
                    }
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
                <p className="text-[11px] text-slate-500">
                  Prioritising {activeSourceFilterLabel.toLowerCase()} uploads.
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
              <ul className="space-y-3">
                {displayedSources.map((source) => {
                  const Icon = sourceIcons[source.type] ?? FileText;
                  return (
                    <li
                      key={source.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 transition-colors dark:border-slate-800 dark:bg-slate-800/70"
                    >
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
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {source.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-300">
                              {source.detail}
                              {source.fileExtension ? (
                                <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600 transition-colors dark:border-slate-700 dark:text-slate-200">
                                  {source.fileExtension}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {source.uploadedAt} · {source.sizeLabel}
                            </p>
                          </div>
                          {source.status ? (
                            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-200/10 dark:text-slate-200">
                              {source.status}
                            </span>
                          ) : null}
                        </a>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="mt-1 rounded-xl bg-white p-2 text-slate-600 transition-colors dark:bg-slate-800 dark:text-slate-200">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {source.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-300">
                              {source.detail}
                              {source.fileExtension ? (
                                <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600 transition-colors dark:border-slate-700 dark:text-slate-200">
                                  {source.fileExtension}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {source.uploadedAt} · {source.sizeLabel}
                            </p>
                          </div>
                          {source.status ? (
                            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-200/10 dark:text-slate-200">
                              {source.status}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900 md:h-full md:min-h-0">
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Chat
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Ask planning questions, confirm the site, and save useful
                  answers back to this project.
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
            <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
              {siteSelection ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-slate-700 transition-colors dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {siteSelection.source === "chat"
                          ? "Confirm the site for this question"
                          : "Search for a new NSW site"}
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
                                    onMouseEnter={() =>
                                      setHighlightedSuggestionIndex(index)
                                    }
                                    className={cn(
                                      "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition",
                                      index === highlightedSuggestionIndex
                                        ? "bg-slate-900/5 dark:bg-slate-700/60"
                                        : "hover:bg-slate-900/5 dark:hover:bg-slate-800/60",
                                    )}
                                  >
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                      {candidate.formattedAddress}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-300">
                                      {candidate.lgaName
                                        ? `${candidate.lgaName} LGA`
                                        : "LGA pending"}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={handleSiteSearch}
                          disabled={
                            isSiteSearchPending || siteSearchAvailable !== "ok"
                          }
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
                          NSW property search isn’t configured in this
                          environment, but you can still set the site manually.
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
                              checked={
                                siteSelectionCandidateId === candidate.id
                              }
                              onChange={() => {
                                setSiteSelectionCandidateId(candidate.id);
                                setSelectedSuggestion(candidate);
                                setSiteSelectionError(null);
                              }}
                            />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {candidate.formattedAddress}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-300">
                                {candidate.lgaName
                                  ? `${candidate.lgaName} LGA`
                                  : "LGA pending"}
                              </p>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : siteSelection.source === "chat" ? (
                    <p className="mt-3 text-xs text-slate-500">
                      I couldn’t confidently match that address. Pick the right
                      site or try searching again.
                    </p>
                  ) : null}
                  {siteSelectionError ? (
                    <p className="mt-2 text-xs font-semibold text-rose-600">
                      {siteSelectionError}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSiteCandidateConfirm()}
                      disabled={
                        (!siteSelectionCandidateId && !selectedSuggestion) ||
                        isConfirmingSite
                      }
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
              {!siteContext ? (
                <SetSiteInput
                  onSubmit={handleInlineSiteSubmit}
                  initialValue={initialInlineAddress}
                />
              ) : null}
              <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                {messages.length > 0 ? (
                  <div className="mb-2 shrink-0">
                    <label htmlFor="chat-search" className="sr-only">
                      Search messages
                    </label>
                    <input
                      id="chat-search"
                      type="search"
                      placeholder="Search messages..."
                      value={chatSearch}
                      onChange={(event) => setChatSearch(event.target.value)}
                      className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    {chatSearch.trim() !== "" ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {filteredMessages.length} of {messages.length} messages
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div
                  ref={chatScrollRef}
                  className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto pb-48 pr-2"
                  aria-live="polite"
                >
                  {messages.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Start with a planning question.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Use one of these prompts or ask in your own words.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {workspaceQuickPrompts.map((quickPrompt) => (
                          <button
                            key={quickPrompt}
                            type="button"
                            onClick={() => {
                              setInput(quickPrompt);
                              chatInputRef.current?.focus();
                            }}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            {quickPrompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    filteredMessages.map((message) => (
                      <article
                        key={message.id}
                        className={cn(
                          "max-w-[85%] rounded-3xl border px-4 py-3 text-sm leading-relaxed",
                          message.role === "assistant"
                            ? "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
                            : "ml-auto border-blue-200 bg-blue-600/10 text-slate-900 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-white",
                        )}
                      >
                        <p>
                          {highlightText(message.content, chatSearch).map(
                            (segment, segmentIndex) =>
                              segment.match ? (
                                <mark
                                  key={`${message.id}-${segmentIndex}`}
                                  className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-700"
                                >
                                  {segment.text}
                                </mark>
                              ) : (
                                <span key={`${message.id}-${segmentIndex}`}>
                                  {segment.text}
                                </span>
                              ),
                          )}
                        </p>
                        {message.role === "assistant" &&
                        message.sourceAttribution ? (
                          <SourceConfidenceBadge
                            sourceAttribution={message.sourceAttribution}
                            lgaCode={siteContext?.lgaCode ?? sessionSignals.lga}
                          />
                        ) : null}
                        {message.role === "assistant" ? (
                          <ChatConfidenceBadge
                            score={message.confidenceScore}
                          />
                        ) : null}
                        {message.role === "assistant" &&
                        (message.lepSourceRefs?.length ?? 0) > 0 ? (
                          <div className="mt-2 border-t border-slate-200/70 pt-2 dark:border-slate-700/70">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenLepSourcesByMessageId((previous) => ({
                                  ...previous,
                                  [message.id]: !previous[message.id],
                                }))
                              }
                              className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              aria-expanded={
                                openLepSourcesByMessageId[message.id] === true
                              }
                            >
                              <span aria-hidden="true">
                                {openLepSourcesByMessageId[message.id]
                                  ? "⌄"
                                  : "›"}
                              </span>
                              Sources ({message.lepSourceRefs?.length ?? 0})
                            </button>
                            {openLepSourcesByMessageId[message.id] ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(message.lepSourceRefs ?? []).map((ref) => (
                                  <span
                                    key={`${message.id}-${ref}`}
                                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                  >
                                    {ref}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {message.role === "assistant" &&
                        message.id === messages[messages.length - 1]?.id
                          ? (() => {
                              const suggestionChips = generateSuggestions(
                                message.content,
                              );

                              return suggestionChips.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {suggestionChips.map((chip) => (
                                    <button
                                      key={chip}
                                      type="button"
                                      onClick={() => setInput(chip)}
                                      className="max-w-full truncate whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                                      title={chip}
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>
                              ) : null;
                            })()
                          : null}
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                          {message.createdAt
                            ? getRelativeTime(new Date(message.createdAt), now)
                            : message.timestamp}
                        </p>
                        {message.role === "assistant" ? (
                          <MessageReactionBar
                            messageId={message.id}
                            reactions={
                              messageReactions[message.id] ??
                              message.reactions ??
                              {}
                            }
                            onToggle={toggleReaction}
                          />
                        ) : null}
                      </article>
                    ))
                  )}
                  {isThinking ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />{" "}
                      Drafting response…
                    </div>
                  ) : null}
                  <div ref={chatEndRef} />
                </div>
                <form
                  onSubmit={handleSubmit}
                  className="absolute bottom-0 left-0 right-0 rounded-[1.25rem] border border-slate-200 bg-white/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-sm backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900"
                >
                  <label htmlFor="chat-input" className="sr-only">
                    Ask the workspace
                  </label>
                  <textarea
                    id="chat-input"
                    ref={chatInputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    placeholder="Ask what to check next, draft a pathway, or summarise the site risks…"
                    className="w-full resize-none overflow-y-auto border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Saved answers become project artefacts.
                      </p>
                      {messages.length > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={handleNewThread}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Plus className="h-3 w-3" />
                            New thread
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyTranscript}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            {isCopied ? "Copied!" : "Copy transcript"}
                          </button>
                        </>
                      ) : null}
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
                    >
                      Send
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section className="flex flex-col md:h-full md:min-h-0">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900">
              <header className="shrink-0 px-5 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Outputs
                </p>
                {outputStatusKind ? (
                  <div
                    className="mt-3 flex items-center gap-2 border-b border-slate-100 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"
                    role="status"
                  >
                    {outputStatusKind === "lga" ? (
                      <>
                        <span
                          className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          Preparing local planning data…
                        </span>
                      </>
                    ) : outputStatusKind === "stale" ? (
                      <>
                        <span
                          className="h-2 w-2 rounded-full bg-amber-400"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          Site data updated — regenerate outputs?
                        </span>
                        <button
                          type="button"
                          onClick={() => void regenerateStaleOutputs()}
                          disabled={isRegeneratingStaleOutput}
                          className="text-xs font-semibold text-amber-700 transition hover:text-amber-900 disabled:cursor-wait disabled:opacity-60 dark:text-amber-300 dark:hover:text-amber-200"
                        >
                          {isRegeneratingStaleOutput
                            ? "Regenerating…"
                            : "Regenerate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaleArtefactsDismissed(true)}
                          className="rounded-full p-0.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                          aria-label="Dismiss stale outputs prompt"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : activeNotification ? (
                      <>
                        <span
                          className="h-2 w-2 rounded-full bg-emerald-400"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {activeNotification.title}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void dismissNotification(activeNotification.id)
                          }
                          disabled={
                            dismissingNotificationId === activeNotification.id
                          }
                          className="rounded-full p-0.5 text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-slate-200"
                          aria-label="Dismiss notification"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5">
                <section className="border-b border-slate-100 py-5 dark:border-slate-800">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-200">
                      Byron/Kempsey commercial path
                    </p>
                    <h2 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                      {commercialNextAction.heading}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {commercialNextAction.description}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {commercialNextAction.items.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-white/70 bg-white/70 p-2.5 text-xs dark:border-slate-700/70 dark:bg-slate-900/50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                readinessStatusClasses[item.status],
                              )}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-1 leading-4 text-slate-500 dark:text-slate-400">
                            {item.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCommercialPrimaryAction}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                      >
                        {commercialNextAction.primaryLabel}
                        <Sparkles className="h-3 w-3" />
                      </button>
                      {commercialNextAction.secondaryLabel ? (
                        <button
                          type="button"
                          onClick={() => void handleRequestExpertReview()}
                          disabled={isRequestingReview}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                        >
                          {isRequestingReview ? "Packaging review…" : commercialNextAction.secondaryLabel}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </section>
                <OutputSection
                  title="Quick Site Check"
                  action={
                    hasSiteContext ? (
                      <button
                        type="button"
                        onClick={() => setIsQuickSiteCheckOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                      >
                        {latestQuickSiteCheckArtefact
                          ? "Run again"
                          : "Run site check"}
                        <RefreshCcw className="h-3 w-3" />
                      </button>
                    ) : null
                  }
                >
                  {!hasSiteContext ? (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">
                      Set a site address to run a check.
                    </p>
                  ) : latestQuickSiteCheckArtefact ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-800/60">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {latestQuickSiteCheckArtefact.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {latestQuickSiteCheckArtefact.metadata ||
                          "Saved zoning and LEP snapshot."}
                      </p>
                      {latestQuickSiteCheckArtefact.quickSiteCheck?.lepEvidenceSummary ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900/40">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            LEP evidence quality: {latestQuickSiteCheckArtefact.quickSiteCheck.lepEvidenceSummary.label}
                          </p>
                          <p className="mt-0.5 text-slate-500 dark:text-slate-300">
                            {latestQuickSiteCheckArtefact.quickSiteCheck.lepEvidenceSummary.sourceRef}
                          </p>
                          <p className="mt-1 leading-4 text-slate-500 dark:text-slate-400">
                            {latestQuickSiteCheckArtefact.quickSiteCheck.lepEvidenceSummary.detail}
                          </p>
                        </div>
                      ) : null}
                      <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Last run {latestQuickSiteCheckArtefact.updatedAt}
                      </p>
                      {staleSiteArtefactCount > 0 ? (
                        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          {staleSiteArtefactCount} saved output{staleSiteArtefactCount === 1 ? " is" : "s are"} from a different site and kept as history only. Rerun outputs for the current site before export or review.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {staleSiteArtefactCount > 0 ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          {staleSiteArtefactCount} saved output{staleSiteArtefactCount === 1 ? " is" : "s are"} from a different site and kept as history only. Rerun Quick Site Check for the current site.
                        </p>
                      ) : null}
                      <p className="text-sm italic text-slate-400 dark:text-slate-500">
                        Run a quick zoning and LEP snapshot for this site.
                      </p>
                    </div>
                  )}
                </OutputSection>

                <OutputSection
                  title="Detailed Planning Pack"
                  action={
                    hasSiteContext ? (
                      <button
                        type="button"
                        onClick={() => void generateDetailedPlanningPack()}
                        disabled={isGeneratingDetailedPack || !hasQualityQuickSiteCheck || !proposalBrief.trim()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                      >
                        {isGeneratingDetailedPack ? "Generating…" : latestDetailedPlanningPack ? "Regenerate pack" : "Generate pack"}
                      </button>
                    ) : null
                  }
                >
                  {!hasSiteContext ? (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">Set a site address before generating a proposal-scoped pack.</p>
                  ) : !hasQualityQuickSiteCheck ? (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">Save a quality-valid Quick Site Check first.</p>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="proposal-brief">
                        Proposed works brief
                      </label>
                      <textarea
                        id="proposal-brief"
                        value={proposalBrief}
                        onChange={(event) => setProposalBrief(event.target.value)}
                        rows={3}
                        placeholder="e.g. Alterations to an existing commercial premises with shopfront updates and minor internal fitout."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      {latestDetailedPlanningPack ? (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-800/60">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{latestDetailedPlanningPackArtefact?.title}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{latestDetailedPlanningPackArtefact?.metadata}</p>
                          <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{latestDetailedPlanningPack.nextAction}</p>
                          <div className="mt-3 grid gap-2">
                            {latestDetailedPlanningPack.topicMatrix.map((topic) => (
                              <div key={topic.topicId} className="rounded-xl border border-white/70 bg-white/70 p-2 text-xs dark:border-slate-700 dark:bg-slate-900/50">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">{topic.topicLabel}</span>
                                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", readinessStatusClasses[topic.status === "Cited" ? "Confirmed" : topic.status])}>{topic.status}</span>
                                </div>
                                <p className="mt-1 text-slate-500 dark:text-slate-400">{topic.summary}</p>
                                {topic.sourceRefs.length ? <p className="mt-1 text-slate-400">Sources: {topic.sourceRefs.join(", ")}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm italic text-slate-400 dark:text-slate-500">Generate a persisted proposal-aware DCP evidence pack before SEE/referral.</p>
                      )}
                    </div>
                  )}
                </OutputSection>

                <OutputSection
                  title="Statement of Env. Effects"
                  action={
                    hasSiteContext ? (
                      <button
                        type="button"
                        onClick={handleGeneratePreSeeMemo}
                        disabled={isGeneratingSee}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                      >
                        {isGeneratingSee
                          ? "Generating…"
                          : latestSeeContent
                            ? "Regenerate"
                            : "Generate SEE"}
                      </button>
                    ) : null
                  }
                >
                  {!hasSiteContext ? (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">
                      Set a site address to generate a SEE.
                    </p>
                  ) : latestSeeContent ? (
                    <SeeDocumentPanel
                      content={latestSeeContent}
                      generatedAt={latestSeeContent.generatedAt}
                      onRegenerate={handleGeneratePreSeeMemo}
                      isRegenerating={isGeneratingSee}
                    />
                  ) : (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">
                      Generate a structured SEE grounded in current planning
                      controls.
                    </p>
                  )}
                </OutputSection>

                <OutputSection title="Expert Review Request">
                  {latestReviewRequestArtefact && latestReviewRequestContent ? (
                    <ReviewRequestCard
                      artefact={latestReviewRequestArtefact}
                      content={latestReviewRequestContent}
                    />
                  ) : (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">
                      Package a saved Quick Site Check and SEE draft from the
                      Byron/Kempsey commercial path to revisit citations,
                      confidence gaps, missing inputs, assumptions, and planner
                      review scope here.
                    </p>
                  )}
                </OutputSection>

                <OutputSection title="Feasibility">
                  {!hasSiteContext ? (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">
                      Set a site address to assess feasibility.
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/50">
                      <FeasibilityPanel
                        projectId={projectKey}
                        address={
                          siteContext?.formattedAddress ??
                          initialInlineAddress ??
                          project.location ??
                          project.name
                        }
                        siteContext={{
                          lga:
                            siteContext?.lgaCode ??
                            sessionSignals?.lga ??
                            undefined,
                          zone: siteContext?.zone ?? zoningLabel ?? undefined,
                        }}
                        existingContent={latestFeasibilityContent}
                      />
                    </div>
                  )}
                </OutputSection>
              </div>

              <div className="shrink-0 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setIsMapsToolsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <Globe2 className="h-3 w-3" />
                  Maps & external tools
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <QuickSiteCheckModal
        open={isQuickSiteCheckOpen}
        onClose={() => setIsQuickSiteCheckOpen(false)}
        projectId={projectKey}
        onInsertToChat={appendToolMessage}
        onArtefactSaved={handleQuickSiteCheckArtefactSaved}
        onToast={showToast}
      />

      <MapsToolsModal
        open={isMapsToolsModalOpen}
        onClose={() => setIsMapsToolsModalOpen(false)}
        siteContext={siteContext}
      />

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
          <span className="mt-2 text-xs text-slate-400">
            PDF, Word, Excel/CSV, TXT/MD, JPEG/PNG, ZIP
          </span>
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
              <li
                key={file.name}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                  {uploadStatuses[file.name]?.message ? (
                    <p className="text-xs font-medium text-rose-600">
                      {uploadStatuses[file.name]?.message}
                    </p>
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
        {uploadError ? (
          <p className="mt-2 text-xs font-semibold text-rose-600">
            {uploadError}
          </p>
        ) : null}
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
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

async function extractContextSnippet(file: File) {
  const readableExtensions = ["txt", "md", "geojson", "csv"]; // sample supported types
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    file.type.startsWith("text/") ||
    (extension && readableExtensions.includes(extension))
  ) {
    const text = await file.text();
    return text.slice(0, 500);
  }
  return `${file.name} uploaded ${new Date().toLocaleDateString()}`;
}

function stripHtml(value: string) {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeReply(reply: string) {
  const clean = stripHtml(reply);
  if (!clean) return "";
  return `${clean.slice(0, 200)}${clean.length > 200 ? "…" : ""}`;
}
