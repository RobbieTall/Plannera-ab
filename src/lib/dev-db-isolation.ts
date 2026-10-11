export type IsolationEnvironment = Record<string, string | undefined>;

export type IsolationChecks = {
  urlConfigured: boolean;
  projectIdConfigured: boolean;
  endpointMatches: boolean;
  projectMatches: boolean;
  connectionAttempted: boolean;
  connectionSucceeded: boolean;
};

const EXPECTED_PROJECT = "crimson-mud-29775341";
const EXPECTED_ENDPOINT = "ep-fancy-sunset-a7zoh8wm";

function matchesIsolatedEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const endpoint = hostname.split(".")[0];
    return (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      hostname.endsWith(".neon.tech") &&
      (endpoint === EXPECTED_ENDPOINT || endpoint === EXPECTED_ENDPOINT + "-pooler")
    );
  } catch {
    return false;
  }
}

/**
 * Return bounded booleans only. A read-only probe is allowed only after the
 * configured hostname matches the new isolated Neon endpoint. Never return
 * a connection string, hostname, query result, or exception detail.
 */
export async function inspectDevDatabaseIsolation(
  env: IsolationEnvironment,
  readDatabaseName: () => Promise<string | undefined>,
): Promise<IsolationChecks> {
  const urlConfigured = Boolean(env.DATABASE_URL);
  const projectIdConfigured = Boolean(env.NEON_PROJECT_ID);
  const endpointMatches = urlConfigured && matchesIsolatedEndpoint(env.DATABASE_URL!);
  const projectMatches = env.NEON_PROJECT_ID === EXPECTED_PROJECT;

  if (!endpointMatches) {
    return {
      urlConfigured,
      projectIdConfigured,
      endpointMatches: false,
      projectMatches,
      connectionAttempted: false,
      connectionSucceeded: false,
    };
  }

  try {
    const databaseName = await readDatabaseName();
    return {
      urlConfigured,
      projectIdConfigured,
      endpointMatches: true,
      projectMatches,
      connectionAttempted: true,
      connectionSucceeded: databaseName === "neondb",
    };
  } catch {
    return {
      urlConfigured,
      projectIdConfigured,
      endpointMatches: true,
      projectMatches,
      connectionAttempted: true,
      connectionSucceeded: false,
    };
  }
}
