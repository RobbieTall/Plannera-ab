import { ProjectParameters } from "./project-parser";
import type { NswPlanningSnapshot } from "./nsw";

export type PlanningSummary = ProjectParameters & {
  council: string;
  state: string;
  requirements: string[];
  documents: string[];
  timelineWeeks: [number, number];
  budgetRange: string;
  hurdles: string[];
  nswData?: NswPlanningSnapshot | null;
};

type CouncilProfile = {
  matchLocations: string[];
  council: string;
  state: string;
  requirements: string[];
  documents: string[];
  timelineWeeks: [number, number];
  budgetRange: string;
  hurdles: string[];
};

const councilProfiles: CouncilProfile[] = [
  {
    matchLocations: ["Bondi", "Sydney"],
    council: "Waverley Council",
    state: "NSW",
    requirements: [
      "Comply with R3 Medium Density codes for coastal suburbs",
      "Provide overshadowing and privacy studies for adjoining lots",
      "Address coastal erosion and flooding overlays",
    ],
    documents: ["BASIX certificate", "Coastal risk assessment", "Design excellence statement"],
    timelineWeeks: [16, 22],
    budgetRange: "$2.1m - $3.4m",
    hurdles: [
      "Neighbourhood character concerns for increased height",
      "Parking compliance along narrow streets",
    ],
  },
  {
    matchLocations: ["Brisbane"],
    council: "Brisbane City Council",
    state: "QLD",
    requirements: [
      "Demonstrate compliance with City Plan 2014 medium density code",
      "Stormwater management strategy for sub-tropical rainfall",
      "Acoustic treatments if adjoining transport corridors",
    ],
    documents: ["CPTED statement", "Hydraulic design", "Town planning report"],
    timelineWeeks: [12, 18],
    budgetRange: "$1.4m - $2.6m",
    hurdles: [
      "Flood resilience design in overland flow paths",
      "Developer infrastructure charges for additional dwellings",
    ],
  },
  {
    matchLocations: ["Melbourne"],
    council: "City of Melbourne",
    state: "VIC",
    requirements: [
      "Respect neighbourhood residential zone setbacks",
      "ESD report meeting BESS score of 70+",
      "Construction management plan for tight suburban sites",
    ],
    documents: ["Arborist report", "ESD statement", "Neighbour consultation pack"],
    timelineWeeks: [14, 20],
    budgetRange: "$1.8m - $3.1m",
    hurdles: [
      "Tree protection overlays limiting building footprint",
      "Council urban design review for second storey work",
    ],
  },
];

const fallbackProfile: CouncilProfile = {
  matchLocations: ["Australia"],
  council: "Local Council",
  state: "Australia",
  requirements: [
    "Confirm zoning and permitted uses",
    "Engage planning consultant for preliminary advice",
    "Check infrastructure contributions",
  ],
  documents: ["Site survey", "Concept plans", "Planning report"],
  timelineWeeks: [10, 16],
  budgetRange: "$1m - $2m",
  hurdles: [
    "Heritage or neighbourhood character overlays",
    "State referral agencies needing extra information",
  ],
};

export function generatePlanningInsights(
  params: ProjectParameters,
  options?: { nswData?: NswPlanningSnapshot | null }
): PlanningSummary {
  const profile =
    councilProfiles.find((p) => p.matchLocations.some((loc) => loc.toLowerCase() === params.location.toLowerCase())) ??
    fallbackProfile;

  return {
    ...params,
    council: profile.council,
    state: profile.state,
    requirements: profile.requirements,
    documents: profile.documents,
    timelineWeeks: profile.timelineWeeks,
    budgetRange: profile.budgetRange,
    hurdles: profile.hurdles,
    nswData: options?.nswData ?? undefined,
  };
}
