type VercelPreviewOidcEnvironment = {
  GITHUB_REF_NAME?: string;
  GITHUB_SHA?: string;
  PLANNING_PACK_CHECKOUT_ENABLED?: string;
  SUBMISSION_SEE_CHECKOUT_ENABLED?: string;
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
  VERCEL_PROJECT_ID?: string;
  VERCEL_TEAM_ID?: string;
  VERCEL_TOKEN?: string;
};

type VercelEnvPullResponse = {
  env?: Record<string, unknown>;
  buildEnv?: Record<string, unknown>;
};

type FetchLike = (
  input: string,
  init: {
    headers: Record<string, string>;
    method: "GET";
  },
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}>;

const readValue = (value: string | undefined) => value?.trim() || undefined;

const requireId = (
  name: string,
  value: string | undefined,
  pattern: RegExp,
): string => {
  const candidate = readValue(value);
  if (!candidate || !pattern.test(candidate)) {
    throw new Error(`Preview OIDC ${name} is invalid`);
  }
  return candidate;
};

const isSafeBranch = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9._/-]{0,243}$/.test(value) &&
  !value.includes("..") &&
  !value.endsWith("/") &&
  !["main", "master", "production"].includes(value.toLowerCase());

const isOidcToken = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);

export const classifyVercelPreviewOidcFailure = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "";
  const rejectedStatus = message.match(
    /^Preview OIDC request was rejected \(status ([1-5][0-9]{2})\)$/,
  );
  if (rejectedStatus) return `REQUEST_REJECTED_${rejectedStatus[1]}`;
  if (message === "Preview OIDC request failed before a response") {
    return "REQUEST_TRANSPORT_FAILED";
  }
  if (message === "Preview OIDC response was not valid JSON") {
    return "RESPONSE_JSON_INVALID";
  }
  if (message === "Vercel did not issue a valid Preview OIDC credential") {
    return "OIDC_CREDENTIAL_MISSING_OR_INVALID";
  }
  if (message.includes("branch evidence is invalid")) {
    return "BRANCH_EVIDENCE_INVALID";
  }
  if (message.includes("commit evidence is invalid")) {
    return "COMMIT_EVIDENCE_INVALID";
  }
  if (message.includes("checkout to remain disabled")) {
    return "CHECKOUT_GUARD_FAILED";
  }
  if (message.includes("restricted to the Preview environment")) {
    return "PREVIEW_GUARD_FAILED";
  }
  if (message.includes("project identifier is invalid")) {
    return "PROJECT_ID_INVALID";
  }
  if (message.includes("team identifier is invalid")) {
    return "TEAM_ID_INVALID";
  }
  if (message.includes("access credential is unavailable")) {
    return "ACCESS_CREDENTIAL_UNAVAILABLE";
  }
  if (message.includes("acceptance child was interrupted")) {
    return "ACCEPTANCE_CHILD_INTERRUPTED";
  }
  return "UNKNOWN_SAFE_FAILURE";
};

export const resolveVercelPreviewOidcRequest = (
  environment: VercelPreviewOidcEnvironment,
) => {
  if (readValue(environment.VERCEL_ENV) !== "preview") {
    throw new Error("Preview OIDC is restricted to the Preview environment");
  }
  if (
    readValue(environment.PLANNING_PACK_CHECKOUT_ENABLED) === "true" ||
    readValue(environment.SUBMISSION_SEE_CHECKOUT_ENABLED) === "true"
  ) {
    throw new Error("Preview OIDC requires paid checkout to remain disabled");
  }

  const branch = readValue(environment.VERCEL_GIT_COMMIT_REF);
  const githubBranch = readValue(environment.GITHUB_REF_NAME);
  if (!branch || !isSafeBranch(branch) || branch !== githubBranch) {
    throw new Error("Preview OIDC branch evidence is invalid");
  }

  const commit = readValue(environment.VERCEL_GIT_COMMIT_SHA);
  const githubCommit = readValue(environment.GITHUB_SHA);
  if (!commit || !/^[a-f0-9]{40}$/.test(commit) || commit !== githubCommit) {
    throw new Error("Preview OIDC commit evidence is invalid");
  }

  const projectId = requireId(
    "project identifier",
    environment.VERCEL_PROJECT_ID,
    /^prj_[A-Za-z0-9]{10,}$/,
  );
  const teamId = requireId(
    "team identifier",
    environment.VERCEL_TEAM_ID,
    /^team_[A-Za-z0-9]{10,}$/,
  );
  const accessToken = readValue(environment.VERCEL_TOKEN);
  if (!accessToken) {
    throw new Error("Preview OIDC access credential is unavailable");
  }

  const url = new URL(
    `https://api.vercel.com/v3/env/pull/${encodeURIComponent(projectId)}/preview/${encodeURIComponent(branch)}`,
  );
  url.searchParams.set("source", "vercel-cli:env:pull");
  url.searchParams.set("teamId", teamId);

  return {
    accessToken,
    commit,
    url: url.toString(),
  };
};

export const fetchVercelPreviewOidcToken = async (
  environment: VercelPreviewOidcEnvironment,
  fetchImpl: FetchLike = fetch,
): Promise<string> => {
  const request = resolveVercelPreviewOidcRequest(environment);

  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(request.url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${request.accessToken}`,
        "cache-control": "no-store",
      },
    });
  } catch {
    throw new Error("Preview OIDC request failed before a response");
  }

  if (!response.ok) {
    throw new Error(`Preview OIDC request was rejected (status ${response.status})`);
  }

  let payload: VercelEnvPullResponse;
  try {
    payload = (await response.json()) as VercelEnvPullResponse;
  } catch {
    throw new Error("Preview OIDC response was not valid JSON");
  }

  const oidcToken =
    payload.env?.VERCEL_OIDC_TOKEN ?? payload.buildEnv?.VERCEL_OIDC_TOKEN;
  if (!isOidcToken(oidcToken)) {
    throw new Error("Vercel did not issue a valid Preview OIDC credential");
  }

  return oidcToken;
};
