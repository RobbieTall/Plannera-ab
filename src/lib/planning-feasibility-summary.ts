import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type { DetailedPlanningPackContent, FeasibilityContent } from "@/types/workspace";

type ArtefactRef = {
  id: string;
  capturedAt?: Date | null;
};

const normalizeProposal = (brief?: string | null) =>
  (brief ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const citedQuickSiteControls = (report: QuickSiteCheckReport) => [
  report.controls.heightOfBuilding,
  report.controls.floorSpaceRatio,
  report.controls.minimumLotSize,
].filter((control) => control?.present && control.lepSource && control.clauseRef && control.value);

export const buildPlanningFeasibilitySummary = ({
  projectId,
  packArtefact,
  pack,
  quickSiteCheckArtefact,
  quickSiteCheck,
  generatedAt = new Date().toISOString(),
}: {
  projectId: string;
  packArtefact: ArtefactRef;
  pack: DetailedPlanningPackContent;
  quickSiteCheckArtefact: ArtefactRef;
  quickSiteCheck: QuickSiteCheckReport;
  generatedAt?: string;
}): FeasibilityContent => {
  const proposalMatchesIntent = normalizeProposal(quickSiteCheck.developmentIntent?.description) === normalizeProposal(pack.proposalBrief);
  const intent = proposalMatchesIntent ? quickSiteCheck.developmentIntent : null;
  const isCitedProhibition = intent?.status === "Cited" && intent.pathway === "prohibited";
  const unresolvedTopics = pack.topicMatrix.filter((topic) => topic.status !== "Cited");
  const controls = citedQuickSiteControls(quickSiteCheck);

  const items: FeasibilityContent["items"] = [
    intent?.status === "Cited"
      ? {
          label: "LEP land-use pathway",
          verdict: isCitedProhibition ? "blocked" : "caution",
          detail: intent.detail,
          confidence: "cited",
          source: intent.sourceRef ?? quickSiteCheck.lepEvidenceSummary?.sourceRef ?? undefined,
        }
      : {
          label: "LEP land-use pathway",
          verdict: "unresolved",
          detail: proposalMatchesIntent
            ? quickSiteCheck.developmentIntent?.detail ?? "The saved Quick Site Check did not establish a cited statutory land-use pathway."
            : "The active DCP proposal brief is not the same exact statutory land-use term assessed in the saved Quick Site Check. Confirm permissibility before relying on this summary.",
          confidence: "unavailable",
        },
  ];

  if (controls.length) {
    items.push({
      label: "LEP development standards",
      verdict: "caution",
      detail: controls.map((control) => `${control.label}: ${control.value}`).join("; "),
      confidence: "cited",
      source: Array.from(new Set(controls.map((control) => [control.source, control.clauseRef].filter(Boolean).join(" / ")).filter(Boolean))).join("; "),
    });
  } else {
    items.push({
      label: "LEP development standards",
      verdict: "unresolved",
      detail: "No cited height, floor-space-ratio or minimum-lot-size control was carried by the saved Quick Site Check.",
      confidence: "unavailable",
    });
  }

  items.push(...pack.topicMatrix.map((topic) => ({
    label: `DCP: ${topic.topicLabel}`,
    verdict: topic.status === "Cited" ? "caution" as const : "unresolved" as const,
    detail: topic.summary,
    confidence: topic.status === "Cited" ? "cited" as const : "unavailable" as const,
    source: topic.sourceRefs.length ? topic.sourceRefs.join("; ") : undefined,
  })));

  const overallVerdict: FeasibilityContent["overallVerdict"] = isCitedProhibition
    ? "blocked"
    : unresolvedTopics.length || !intent || intent.status !== "Cited" || !controls.length
      ? "unresolved"
      : "caution";
  const summary = isCitedProhibition
    ? "The exact saved LEP land-use term is prohibited in the confirmed zone. Do not advance the proposal without changing the use or obtaining professional advice on a different lawful pathway."
    : overallVerdict === "unresolved"
      ? "The proposal has useful cited planning evidence, but one or more land-use, LEP or DCP matters remain unresolved. Treat this as a hold point for targeted professional review."
      : "The saved LEP and DCP evidence identifies a planning pathway and applicable controls. Proceed to SEE preparation or consultant review with caution; this is not development consent or professional advice.";

  return {
    summaryType: "planning_feasibility_summary",
    projectId,
    developmentType: pack.proposalBrief,
    proposalBrief: pack.proposalBrief,
    overallVerdict,
    summary,
    items,
    generatedAt,
    sourceDetailedPlanningPack: {
      artefactId: packArtefact.id,
      generatedAt: pack.generatedAt ?? packArtefact.capturedAt?.toISOString?.() ?? null,
      commercialReady: pack.commercialReady,
      sourceQuickSiteCheckArtefactId: quickSiteCheckArtefact.id,
    },
  };
};
