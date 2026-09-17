type SandboxAccessTokenAuth = {
  token: string;
  teamId: string;
  projectId: string;
};

export type Item74hSandboxAuth = SandboxAccessTokenAuth | Record<string, never>;

type SandboxAuthEnvironment = Readonly<Record<string, string | undefined>>;

const clean = (value: string | undefined) => value?.trim() || undefined;

export const resolveItem74hSandboxAuth = (
  env: SandboxAuthEnvironment = process.env,
): Item74hSandboxAuth => {
  if (clean(env.VERCEL_OIDC_TOKEN)) {
    return {};
  }

  const token = clean(env.VERCEL_TOKEN);
  const teamId = clean(env.VERCEL_TEAM_ID);
  const projectId = clean(env.VERCEL_PROJECT_ID);
  const configuredCount = [token, teamId, projectId].filter(Boolean).length;

  if (configuredCount === 0) {
    throw new Error("Vercel Sandbox authentication is missing");
  }
  if (configuredCount !== 3) {
    throw new Error("Vercel Sandbox access-token configuration is incomplete");
  }
  if (!/^team_[A-Za-z0-9]+$/.test(teamId!)) {
    throw new Error("Vercel Sandbox team identifier is invalid");
  }
  if (!/^prj_[A-Za-z0-9]+$/.test(projectId!)) {
    throw new Error("Vercel Sandbox project identifier is invalid");
  }

  return { token: token!, teamId: teamId!, projectId: projectId! };
};
