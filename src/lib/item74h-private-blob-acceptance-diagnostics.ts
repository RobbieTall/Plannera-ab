export const ITEM74H_PRIVATE_BLOB_ACCEPTANCE_STAGES = [
  "INITIALIZE",
  "RESOLVE_AUTH",
  "ACCEPTANCE_SEQUENCE",
  "BLOB_PUT_OR_REUSE",
  "BLOB_COUNT",
  "UNAUTHENTICATED_READ",
  "AUTHENTICATED_READ",
  "SANDBOX_HASH_CHECK",
  "BLOB_CLEANUP",
  "COMPLETE",
] as const;

export type Item74hPrivateBlobAcceptanceStage =
  (typeof ITEM74H_PRIVATE_BLOB_ACCEPTANCE_STAGES)[number];

export type Item74hPrivateBlobFailureStage =
  | Item74hPrivateBlobAcceptanceStage
  | "UNKNOWN_STAGE";

export type Item74hPrivateBlobErrorCategory =
  | "BLOB_ACCESS_DENIED"
  | "BLOB_NOT_FOUND"
  | "BLOB_STORE_NOT_FOUND"
  | "BLOB_RATE_LIMITED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

const allowedStages = new Set<string>(
  ITEM74H_PRIVATE_BLOB_ACCEPTANCE_STAGES,
);

const readString = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): string => (typeof record[key] === "string" ? record[key] : "");

export const classifyItem74hPrivateBlobError = (
  error: unknown,
): Item74hPrivateBlobErrorCategory => {
  const record =
    typeof error === "object" && error !== null
      ? (error as Readonly<Record<string, unknown>>)
      : {};
  const statusValue = record.statusCode ?? record.status;
  const status = typeof statusValue === "number" ? statusValue : undefined;
  const signature = `${readString(record, "name")}:${readString(
    record,
    "code",
  )}`.toLowerCase();

  if (status === 429 || signature.includes("ratelimit")) {
    return "BLOB_RATE_LIMITED";
  }
  if (
    (status === 404 || signature.includes("notfound")) &&
    signature.includes("store")
  ) {
    return "BLOB_STORE_NOT_FOUND";
  }
  if (
    status === 401 ||
    status === 403 ||
    signature.includes("access") ||
    signature.includes("forbidden") ||
    signature.includes("unauthorized")
  ) {
    return "BLOB_ACCESS_DENIED";
  }
  if (status === 404 || signature.includes("notfound")) {
    return "BLOB_NOT_FOUND";
  }
  if (
    signature.includes("fetcherror") ||
    signature.includes("econnreset") ||
    signature.includes("econnrefused") ||
    signature.includes("etimedout") ||
    signature.includes("enotfound") ||
    signature.includes("und_err_connect_timeout")
  ) {
    return "NETWORK_ERROR";
  }
  return "UNKNOWN";
};

export const createItem74hPrivateBlobFailureDiagnostic = (
  stage: unknown,
  error: unknown,
) => ({
  gate: "item74h-private-blob-preview" as const,
  status: "FAIL" as const,
  stage: (typeof stage === "string" && allowedStages.has(stage)
    ? stage
    : "UNKNOWN_STAGE") as Item74hPrivateBlobFailureStage,
  errorCategory: classifyItem74hPrivateBlobError(error),
  productionCheckoutEnabled: false as const,
  secretValueIncluded: false as const,
  objectReferenceIncluded: false as const,
  directUrlIncluded: false as const,
  errorDetailIncluded: false as const,
});
