import { createHash } from "node:crypto";

import {
  hashPathwaySiteEvidenceValue,
  type PathwaySiteEvidenceObservation,
} from "./pathway-site-evidence";
import {
  TFNSW_ROAD_CATEGORISATION,
  buildTfnswSpatialCountRequest,
  parseTfnswRoadCategorisation,
  type TfnswAdminClass,
  type TfnswCountResponse,
  type TfnswVerifiedLayer,
} from "./pathway-tfnsw-road-categorisation";

export const PATHWAY_TFNSW_FRONTAGE_BINDING_VERSION =
  "byron-road-frontage-binding.v1" as const;

const SHA256 = /^[a-f0-9]{64}$/;
const BINDING_KEYS = new Set([
  "version",
  "evidenceDigest",
  "status",
  "method",
  "verifiedAt",
  "staleAt",
  "protectedFrontagePoint",
]);
const POINT_KEYS = new Set(["latitude", "longitude"]);

export type PathwayTfnswFrontageBinding = {
  version: typeof PATHWAY_TFNSW_FRONTAGE_BINDING_VERSION;
  evidenceDigest: string;
  status: "EVIDENCE_VERIFIED";
  method:
    | "SURVEYED_FRONTAGE_POINT"
    | "AUTHORITATIVE_CADASTRAL_ROAD_BOUNDARY_INTERSECTION";
  verifiedAt: string;
  staleAt: string;
  protectedFrontagePoint: {
    latitude: number;
    longitude: number;
  };
};

type TfnswSpatialRequest = ReturnType<typeof buildTfnswSpatialCountRequest>;

export type PathwayTfnswRoadEvidencePlan = {
  version: typeof PATHWAY_TFNSW_FRONTAGE_BINDING_VERSION;
  frontageEvidenceDigest: string;
  frontageVerifiedAt: string;
  frontageStaleAt: string;
  layers: TfnswVerifiedLayer[];
  privateRequests: Array<{
    layer: TfnswVerifiedLayer;
    request: TfnswSpatialRequest;
  }>;
  planDigest: string;
};

export type PathwayTfnswRoadLayerResponse = {
  layerId: number;
  adminClass: TfnswAdminClass;
  payload: TfnswCountResponse;
};

export type PathwayTfnswRoadEvidenceBridgeResult = {
  status: "EVIDENCE_VERIFIED" | "MORE_EVIDENCE_REQUIRED";
  observation: PathwaySiteEvidenceObservation | null;
  reasons: string[];
  redactedSummary: {
    frontageBound: boolean;
    matchingFeatureCount: number;
    matchedAdminClasses: TfnswAdminClass[];
    coordinatesReturned: false;
    geometryReturned: false;
    rawResponsesReturned: false;
    packEligibilityUnlocked: false;
    submissionSeeEligibilityUnlocked: false;
    productionCheckoutEnabled: false;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const assertExactKeys = (
  value: unknown,
  allowed: Set<string>,
  label: string,
): void => {
  if (!isRecord(value)) throw new Error(label + " is invalid.");
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new Error(label + " contains unsupported fields.");
  }
};

const timestamp = (value: string, label: string): number => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(label + " is invalid.");
  return parsed;
};

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const canonicalPlanValue = (
  plan: Omit<PathwayTfnswRoadEvidencePlan, "planDigest">,
): string =>
  JSON.stringify({
    version: plan.version,
    frontageEvidenceDigest: plan.frontageEvidenceDigest,
    frontageVerifiedAt: plan.frontageVerifiedAt,
    frontageStaleAt: plan.frontageStaleAt,
    layers: plan.layers,
    requests: plan.privateRequests.map(({ layer, request }) => ({
      layer,
      url: request.url,
      method: request.init.method,
      body: request.init.body,
      cache: request.init.cache,
    })),
  });

const verifiedLayers = (layers: TfnswVerifiedLayer[]): TfnswVerifiedLayer[] => {
  if (
    layers.length !== 2 ||
    new Set(layers.map((layer) => layer.id)).size !== 2 ||
    new Set(layers.map((layer) => layer.adminClass)).size !== 2 ||
    TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.some(
      (adminClass) =>
        !layers.some((layer) => layer.adminClass === adminClass),
    )
  ) {
    throw new Error("Exactly one verified State and Regional layer is required.");
  }
  return TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.map(
    (adminClass) => layers.find((layer) => layer.adminClass === adminClass)!,
  );
};

export function createPathwayTfnswRoadEvidencePlan(input: {
  serviceUrl: string;
  layers: TfnswVerifiedLayer[];
  frontageBinding: PathwayTfnswFrontageBinding;
}): PathwayTfnswRoadEvidencePlan {
  assertExactKeys(input.frontageBinding, BINDING_KEYS, "Frontage binding");
  assertExactKeys(
    input.frontageBinding.protectedFrontagePoint,
    POINT_KEYS,
    "Protected frontage point",
  );
  if (
    input.frontageBinding.version !==
      PATHWAY_TFNSW_FRONTAGE_BINDING_VERSION ||
    input.frontageBinding.status !== "EVIDENCE_VERIFIED" ||
    !SHA256.test(input.frontageBinding.evidenceDigest)
  ) {
    throw new Error("Frontage binding is not evidence-verified.");
  }

  const verifiedAt = timestamp(
    input.frontageBinding.verifiedAt,
    "Frontage verification time",
  );
  const staleAt = timestamp(
    input.frontageBinding.staleAt,
    "Frontage stale time",
  );
  if (verifiedAt >= staleAt) {
    throw new Error("Frontage binding currentness is invalid.");
  }

  const layers = verifiedLayers(input.layers);
  const privateRequests = layers.map((layer) => ({
    layer,
    request: buildTfnswSpatialCountRequest({
      serviceUrl: input.serviceUrl,
      layer,
      protectedFrontagePoint:
        input.frontageBinding.protectedFrontagePoint,
    }),
  }));
  const withoutDigest = {
    version: PATHWAY_TFNSW_FRONTAGE_BINDING_VERSION,
    frontageEvidenceDigest: input.frontageBinding.evidenceDigest,
    frontageVerifiedAt: new Date(verifiedAt).toISOString(),
    frontageStaleAt: new Date(staleAt).toISOString(),
    layers,
    privateRequests,
  };

  return {
    ...withoutDigest,
    planDigest: sha256(canonicalPlanValue(withoutDigest)),
  };
}

export function finalizePathwayTfnswRoadEvidence(input: {
  plan: PathwayTfnswRoadEvidencePlan;
  layerResponses: PathwayTfnswRoadLayerResponse[];
  sourceUpdatedOn: string;
  sourceStaleAt: string;
  checkedAt: string;
}): PathwayTfnswRoadEvidenceBridgeResult {
  if (
    input.plan.planDigest !==
    sha256(
      canonicalPlanValue({
        version: input.plan.version,
        frontageEvidenceDigest: input.plan.frontageEvidenceDigest,
        frontageVerifiedAt: input.plan.frontageVerifiedAt,
        frontageStaleAt: input.plan.frontageStaleAt,
        layers: input.plan.layers,
        privateRequests: input.plan.privateRequests,
      }),
    )
  ) {
    throw new Error("TfNSW road evidence plan digest is invalid.");
  }

  const checkedAt = timestamp(input.checkedAt, "Road evidence check time");
  const sourceStaleAt = timestamp(
    input.sourceStaleAt,
    "Road source stale time",
  );
  const frontageVerifiedAt = timestamp(
    input.plan.frontageVerifiedAt,
    "Frontage verification time",
  );
  const frontageStaleAt = timestamp(
    input.plan.frontageStaleAt,
    "Frontage stale time",
  );
  if (
    frontageVerifiedAt > checkedAt ||
    frontageStaleAt <= checkedAt ||
    sourceStaleAt <= checkedAt
  ) {
    throw new Error("TfNSW road or frontage evidence is not current.");
  }

  if (
    input.layerResponses.length !== input.plan.layers.length ||
    input.layerResponses.some(
      (response) =>
        !input.plan.layers.some(
          (layer) =>
            layer.id === response.layerId &&
            layer.adminClass === response.adminClass,
        ),
    )
  ) {
    throw new Error("TfNSW layer responses do not match the protected plan.");
  }

  const categorisation = parseTfnswRoadCategorisation({
    sourceUpdatedOn: input.sourceUpdatedOn,
    checkedAt: input.checkedAt,
    layerCounts: input.layerResponses.map((response) => ({
      adminClass: response.adminClass,
      payload: response.payload,
    })),
  });
  const redactedSummary = {
    frontageBound: true,
    matchingFeatureCount: categorisation.matchingFeatureCount,
    matchedAdminClasses: categorisation.matchedAdminClasses,
    coordinatesReturned: false as const,
    geometryReturned: false as const,
    rawResponsesReturned: false as const,
    packEligibilityUnlocked: false as const,
    submissionSeeEligibilityUnlocked: false as const,
    productionCheckoutEnabled: false as const,
  };

  if (categorisation.status !== "CLASSIFIED_ROAD_CONFIRMED") {
    return {
      status: "MORE_EVIDENCE_REQUIRED",
      observation: null,
      reasons: [
        "No positive State or Regional intersection was confirmed for the bound frontage point.",
      ],
      redactedSummary,
    };
  }

  const value = "CLASSIFIED_ROAD" as const;
  const staleAt = new Date(
    Math.min(frontageStaleAt, sourceStaleAt),
  ).toISOString();
  const sourceReference =
    "tfnsw-spatial:" +
    sha256(input.plan.planDigest + "|" + input.plan.frontageEvidenceDigest);
  const observation: PathwaySiteEvidenceObservation = {
    factKey: "ROAD_CLASSIFICATION",
    value,
    valueHash: hashPathwaySiteEvidenceValue(value),
    sourceKind: "AUTHORITATIVE_SPATIAL",
    trustLevel: "EVIDENCE_VERIFIED",
    sourceUrl: TFNSW_ROAD_CATEGORISATION.datasetPage,
    sourceReference,
    retrievedAt: new Date(checkedAt).toISOString(),
    effectiveFrom: new Date(
      timestamp(input.sourceUpdatedOn, "Road source update time"),
    ).toISOString(),
    staleAt,
  };

  return {
    status: "EVIDENCE_VERIFIED",
    observation,
    reasons: [],
    redactedSummary,
  };
}
