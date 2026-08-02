import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type {
  ConsultantNeed,
  ConsultantNeedEvidence,
  DetailedPlanningPackContent,
  DisciplineReferralPackage,
} from "@/types/workspace";

type Topic = DetailedPlanningPackContent["dcpEvidence"][number];

const uniqueEvidence = (items: ConsultantNeedEvidence[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.ref}:${item.excerpt ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const uniqueText = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const topicFor = (pack: DetailedPlanningPackContent, topicId: string): Topic | null =>
  pack.dcpEvidence.find((topic) => topic.topicId === topicId) ?? null;

const topicEvidence = (topic: Topic | null): ConsultantNeedEvidence[] => {
  if (!topic) return [];
  if (topic.citations.length) {
    return topic.citations.map((citation) => ({
      type: "DCP" as const,
      ref: citation.ref,
      excerpt: citation.excerpt,
    }));
  }
  return [{
    type: "PACK_GAP",
    ref: `${topic.topicLabel}: ${topic.status}`,
    excerpt: topic.reason,
  }];
};

const citedControlEvidence = (report: QuickSiteCheckReport): ConsultantNeedEvidence[] =>
  [
    report.controls.heightOfBuilding,
    report.controls.floorSpaceRatio,
    report.controls.minimumLotSize,
  ]
    .filter((control) => control.confidence === "Cited" && control.clauseRef)
    .map((control) => ({
      type: "LEP" as const,
      ref: [control.source, control.clauseRef].filter(Boolean).join(" "),
      excerpt: control.interpretation,
    }));

const notIdentified = (
  disciplineId: ConsultantNeed["disciplineId"],
  disciplineLabel: string,
  reason: string,
): ConsultantNeed => ({
  disciplineId,
  disciplineLabel,
  status: "Not identified from current evidence",
  reason,
  evidence: [],
  questions: [],
});

export const buildConsultantNeedsMatrix = ({
  quickSiteCheck,
  detailedPlanningPack,
}: {
  quickSiteCheck: QuickSiteCheckReport;
  detailedPlanningPack: DetailedPlanningPackContent;
}): ConsultantNeed[] => {
  const parking = topicFor(detailedPlanningPack, "parking_access");
  const builtForm = topicFor(detailedPlanningPack, "built_form_active_frontage");
  const setbacks = topicFor(detailedPlanningPack, "setbacks");
  const landscaping = topicFor(detailedPlanningPack, "landscaping_open_space");
  const hasPackGaps = detailedPlanningPack.unresolvedTopics.length > 0 ||
    detailedPlanningPack.topicMatrix.some((topic) => topic.status !== "Cited");
  const pathway = quickSiteCheck.developmentIntent?.pathway ?? "unresolved";
  const plannerStatus: ConsultantNeed["status"] =
    pathway === "prohibited" || pathway === "unresolved" || hasPackGaps
      ? "Required"
      : pathway === "permitted_with_consent"
        ? "Conditional"
        : "Recommended";
  const plannerReason = pathway === "prohibited"
    ? "The cited land-use pathway is prohibited. A planning professional must verify the definition, pathway and redesign options before the proposal progresses."
    : pathway === "unresolved"
      ? "The exact land-use pathway remains unresolved. A planning professional must verify the statutory definition and permissibility before the proposal progresses."
    : hasPackGaps
      ? "The exact Planning Controls Pack contains unresolved or unavailable controls that require professional verification before SEE completion."
      : pathway === "permitted_with_consent"
        ? "The cited pathway requires consent. A planner should confirm the approval pathway and evidence required for the application."
        : "No unresolved planning-control trigger was identified, but professional review is recommended before relying on the pack for lodgement.";
  const plannerEvidence = uniqueEvidence([
    ...(quickSiteCheck.developmentIntent?.sourceRef
      ? [{
          type: "LEP" as const,
          ref: quickSiteCheck.developmentIntent.sourceRef,
          excerpt: quickSiteCheck.developmentIntent.detail,
        }]
      : quickSiteCheck.lepEvidenceSummary?.sourceRef
        ? [{
            type: "LEP" as const,
            ref: quickSiteCheck.lepEvidenceSummary.sourceRef,
            excerpt: quickSiteCheck.lepEvidenceSummary.detail,
          }]
        : []),
    ...detailedPlanningPack.topicMatrix
      .filter((topic) => topic.status !== "Cited")
      .map((topic) => ({
        type: "PACK_GAP" as const,
        ref: `${topic.topicLabel}: ${topic.status}`,
        excerpt: topic.summary,
      })),
  ]);
  const surveyingEvidence = uniqueEvidence([
    ...citedControlEvidence(quickSiteCheck),
    ...topicEvidence(setbacks),
  ]);

  const matrix: ConsultantNeed[] = [
    {
      disciplineId: "town_planning",
      disciplineLabel: "Town planning",
      status: plannerStatus,
      reason: plannerReason,
      evidence: plannerEvidence,
      questions: uniqueText([
        "Confirm the statutory land-use definition, permissibility pathway and consent authority.",
        "Verify that the saved LEP and DCP controls remain current and apply to the exact proposal.",
        ...detailedPlanningPack.consultantReviewQuestions,
      ]),
    },
    parking
      ? {
          disciplineId: "traffic_transport",
          disciplineLabel: "Traffic and transport",
          status: "Conditional",
          reason: parking.status === "Cited"
            ? "Parking or access controls apply to the proposal. Confirm whether a traffic, parking, loading or access assessment is needed for the final design."
            : "Parking and access evidence is unresolved. A traffic or access specialist may be needed after a planner confirms the applicable control and assessment threshold.",
          evidence: topicEvidence(parking),
          questions: [
            "Confirm parking, access, loading and swept-path requirements for the proposed use.",
            "Advise whether a traffic impact or parking assessment is required for lodgement.",
          ],
        }
      : notIdentified("traffic_transport", "Traffic and transport", "The current evidence chain did not contain a parking or access topic. This does not establish that traffic advice is unnecessary."),
    builtForm || setbacks
      ? {
          disciplineId: "architecture_urban_design",
          disciplineLabel: "Architecture and urban design",
          status: "Conditional",
          reason: [builtForm, setbacks].some((topic) => topic?.status !== "Cited")
            ? "Built-form or setback evidence is unresolved. Design advice may be required once the applicable controls are verified."
            : "Cited built-form, active-frontage or setback controls should be tested against the developing design.",
          evidence: uniqueEvidence([...topicEvidence(builtForm), ...topicEvidence(setbacks)]),
          questions: [
            "Test the proposal against cited setbacks, built-form and active-frontage requirements.",
            "Identify design changes needed before the SEE and supporting plans are finalised.",
          ],
        }
      : notIdentified("architecture_urban_design", "Architecture and urban design", "The current evidence chain did not identify a built-form or setback trigger. This does not establish that design services are unnecessary."),
    landscaping
      ? {
          disciplineId: "landscape_architecture",
          disciplineLabel: "Landscape architecture",
          status: "Conditional",
          reason: landscaping.status === "Cited"
            ? "Cited landscaping or open-space controls should be incorporated into the design and application material."
            : "Landscaping or open-space evidence is unresolved. Specialist input may be needed once the applicable control is confirmed.",
          evidence: topicEvidence(landscaping),
          questions: [
            "Confirm the applicable landscaping, deep-soil, canopy and open-space response.",
            "Advise whether a landscape plan is required for lodgement.",
          ],
        }
      : notIdentified("landscape_architecture", "Landscape architecture", "The current evidence chain did not identify a landscaping or open-space trigger. This does not establish that landscape advice is unnecessary."),
    surveyingEvidence.length
      ? {
          disciplineId: "registered_surveying",
          disciplineLabel: "Registered surveying",
          status: setbacks && setbacks.status !== "Cited" ? "Conditional" : "Recommended",
          reason: setbacks && setbacks.status !== "Cited"
            ? "Setback evidence is unresolved and should be tested against an accurate site survey once the applicable control is confirmed."
            : "Cited mapped or dimensional controls should be tested against an accurate site survey before design or lodgement reliance.",
          evidence: surveyingEvidence,
          questions: [
            "Confirm boundaries, levels, existing improvements and dimensions needed to test the cited controls.",
            "Advise which survey deliverable is appropriate for design and lodgement.",
          ],
        }
      : notIdentified("registered_surveying", "Registered surveying", "The current evidence chain did not contain a cited mapped or dimensional control. This does not establish that a survey is unnecessary."),
    notIdentified("bushfire", "Bushfire", "Bushfire mapping and referral triggers are not assessed by the current Quick Site Check and Planning Controls Pack evidence chain."),
    notIdentified("flood_hydraulic", "Flood and hydraulic engineering", "Flood mapping, flood levels and drainage referral triggers are not assessed by the current evidence chain."),
    notIdentified("ecology", "Ecology", "Biodiversity mapping, threatened-species impacts and ecological referral triggers are not assessed by the current evidence chain."),
    notIdentified("heritage", "Heritage", "Heritage listings, conservation-area impacts and archaeological triggers are not assessed by the current evidence chain."),
    notIdentified("contamination_geotechnical", "Contamination and geotechnical", "Contamination, acid sulfate soil and geotechnical investigation triggers are not assessed by the current evidence chain."),
  ];

  return matrix;
};

const scopes: Record<ConsultantNeed["disciplineId"], string[]> = {
  town_planning: [
    "Review the exact saved Quick Site Check and Planning Controls Pack evidence.",
    "Confirm permissibility, approval pathway, applicable controls and unresolved evidence.",
    "Identify the planning inputs required before SEE finalisation or lodgement.",
  ],
  traffic_transport: [
    "Review the cited or unresolved parking, vehicle access, loading and servicing controls.",
    "Confirm assessment thresholds and provide the appropriate traffic or parking deliverable if required.",
  ],
  architecture_urban_design: [
    "Review the proposal against cited or unresolved setbacks, built form and active-frontage controls.",
    "Document design changes and plans required to resolve identified issues.",
  ],
  landscape_architecture: [
    "Review cited or unresolved landscaping and open-space controls.",
    "Confirm whether a landscape plan or quantified planting response is required.",
  ],
  registered_surveying: [
    "Confirm boundaries, levels, dimensions and existing improvements needed to test cited controls.",
    "Provide or specify the survey deliverable required for design and lodgement.",
  ],
  bushfire: [],
  flood_hydraulic: [],
  ecology: [],
  heritage: [],
  contamination_geotechnical: [],
};

export const buildDisciplineReferralPackages = ({
  proposalBrief,
  consultantNeeds,
}: {
  proposalBrief: string;
  consultantNeeds: ConsultantNeed[];
}): DisciplineReferralPackage[] => consultantNeeds
  .filter((need): need is ConsultantNeed & { status: "Required" | "Conditional" | "Recommended" } =>
    need.status !== "Not identified from current evidence")
  .map((need) => ({
    disciplineId: need.disciplineId,
    disciplineLabel: need.disciplineLabel,
    needStatus: need.status,
    brief: `${proposalBrief} ${need.reason}`.trim(),
    requestedScope: scopes[need.disciplineId],
    questions: need.questions,
    evidence: need.evidence,
    limitations: [
      "This brief is derived only from the exact saved Quick Site Check and Planning Controls Pack; it is not a professional instruction or assurance that the listed scope is complete.",
      "The consultant must verify instrument currency, site applicability, assumptions and any missing source material before reliance.",
      ...(need.evidence.some((item) => item.type === "PACK_GAP")
        ? ["PACK_GAP references identify unresolved evidence and are not statutory citations."]
        : []),
    ],
  }));
