import type { ProjectParameters } from "../project-parser";

export type NswDatasetSlug = "property" | "water" | "trades";

export type PropertyInsight = {
  address: string;
  lot: string;
  plan: string;
  zoning: string;
  floorSpaceRatio?: string;
  heightLimit?: string;
  heritage?: string;
  overlays: string[];
  localGovernmentArea?: string;
};

export type WaterInsight = {
  name: string;
  authority: string;
  floodRisk: string;
  controls: string[];
  infrastructure: string[];
  localGovernmentArea?: string;
};

export type TradeInsight = {
  trade: string;
  licence: string;
  approvals: string[];
  serviceTimeframe?: string;
  contact?: string;
  serviceAreas?: string[];
};

export type NswPlanningSnapshot = {
  property: PropertyInsight[];
  water: WaterInsight[];
  trades: TradeInsight[];
};

export type SnapshotQuery = Partial<ProjectParameters> & {
  limitPerDataset?: number;
};
