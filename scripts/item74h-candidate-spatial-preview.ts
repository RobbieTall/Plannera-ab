import {
  Item74hCandidateSpatialError,
  buildItem74hCandidateParcelQueryUrl,
  buildItem74hCandidateZoneQueryUrl,
  parseItem74hCandidateParcel,
  parseItem74hCandidateZones,
} from "../src/lib/item74h-candidate-spatial-evidence";

const EXACT_PREVIEW_BRANCH = "agent/item74h-candidate-evidence-20260901";

const enabled = (value: string | undefined) =>
  ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());

const skipReason = () => {
  if (!enabled(process.env.ITEM74H_CANDIDATE_DA_ACCEPTANCE_ENABLED)) {
    return "candidate acceptance is disabled";
  }
  if (process.env.VERCEL_ENV !== "preview") {
    return "environment is not Preview";
  }
  if (process.env.VERCEL_GIT_COMMIT_REF !== EXACT_PREVIEW_BRANCH) {
    return "branch is not the exact protected candidate branch";
  }
  if (enabled(process.env.PLANNING_PACK_CHECKOUT_ENABLED)) {
    throw new Error("Refusing candidate acceptance while checkout is enabled.");
  }
  return null;
};

const fetchJson = async (url: URL) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Official NSW spatial service returned HTTP ${response.status}.`);
    }
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
};

const errorCode = (error: unknown) =>
  error instanceof Item74hCandidateSpatialError
    ? error.code
    : "UNCLASSIFIED";

const main = async () => {
  const reason = skipReason();
  if (reason) {
    console.log(
      JSON.stringify({
        gate: "ITEM74H_CANDIDATE_SPATIAL_PREFLIGHT",
        status: "SKIPPED",
        reason,
        productionMutation: false,
        checkoutEnabled: false,
      }),
    );
    return;
  }

  const observedAt = new Date();
  const parcelPayload = await fetchJson(buildItem74hCandidateParcelQueryUrl());
  const parcel = parseItem74hCandidateParcel(
    parcelPayload as Parameters<typeof parseItem74hCandidateParcel>[0],
    observedAt,
  );

  const zonePayload = await fetchJson(
    buildItem74hCandidateZoneQueryUrl(parcel.geometry),
  );
  const zoning = parseItem74hCandidateZones(
    zonePayload as Parameters<typeof parseItem74hCandidateZones>[0],
    observedAt,
  );

  console.log(
    JSON.stringify({
      gate: "ITEM74H_CANDIDATE_SPATIAL_PREFLIGHT",
      status: "PASS",
      observedAt: observedAt.toISOString(),
      parcel: parcel.facts,
      zoning,
      customerDecision: "MORE_EVIDENCE_REQUIRED",
      evidenceNeeded:
        "A georeferenced survey/site plan locating the proposed shed against the official C2/R2 zoning polygons.",
      geometryLogged: false,
      databaseMutation: false,
      blobMutation: false,
      productionMutation: false,
      checkoutEnabled: false,
    }),
  );
};

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      gate: "ITEM74H_CANDIDATE_SPATIAL_PREFLIGHT",
      status: "FAIL",
      code: errorCode(error),
      message:
        error instanceof Error
          ? error.message
          : "Candidate spatial preflight failed.",
      geometryLogged: false,
      productionMutation: false,
      checkoutEnabled: false,
    }),
  );
  process.exitCode = 1;
});
