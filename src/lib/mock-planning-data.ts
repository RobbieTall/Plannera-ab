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
  datasetNotice: string;
  isFallback: boolean;
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
  datasetNotice?: string;
  isFallback?: boolean;
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
    datasetNotice: "Based on our mock Waverley dataset – not yet wired to live legislation.",
  },
  {
    matchLocations: ["Ballina"],
    council: "Ballina Shire Council",
    state: "NSW",
    requirements: [
      "Demonstrate dual occupancy permissibility within the R2/R3 zone",
      "Respect coastal erosion and flood-prone land controls",
      "Provide servicing plan showing individual driveways and on-site parking",
    ],
    documents: ["Clause 4.6 variation (if exceeding height)", "Flood impact statement", "Detailed site analysis"],
    timelineWeeks: [18, 26],
    budgetRange: "$1.6m - $2.8m",
    hurdles: [
      "Height and floor-space ratio caps close to the coastline",
      "Infrastructure contributions triggered by additional dwellings",
    ],
    datasetNotice: "Pulled from the mock Ballina profile while we verify the official scheme.",
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
    datasetNotice: "Mock Brisbane dataset (illustrative, not authoritative).",
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
    datasetNotice: "Mock Melbourne dataset until the statutory references land.",
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
  datasetNotice: "Generic mock planning read until we onboard that council's live data.",
  isFallback: true,
};

export function generatePlanningInsights(
  params: ProjectParameters,
  options?: { nswData?: NswPlanningSnapshot | null }
): PlanningSummary {
  const profile =
    councilProfiles.find((p) => p.matchLocations.some((loc) => loc.toLowerCase() === params.location.toLowerCase())) ??
    fallbackProfile;
  const datasetNotice = profile.datasetNotice
    ? `${profile.datasetNotice}`
    : `Mock dataset for ${profile.council} – treat this as indicative only.`;

  return {
    ...params,
    council: profile.council,
    state: profile.state,
    requirements: profile.requirements,
    documents: profile.documents,
    timelineWeeks: profile.timelineWeeks,
    budgetRange: profile.budgetRange,
    hurdles: profile.hurdles,
    datasetNotice,
    isFallback: Boolean(profile.isFallback),
    nswData: options?.nswData ?? undefined,
  };
}
