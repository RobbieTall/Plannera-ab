import { createHash } from "node:crypto";

type DiagnosticEnvironment = Readonly<Record<string, string | undefined>>;
type Target = "BYRON" | "KEMPSEY" | "NEITHER" | "UNAVAILABLE";
const BRANCH = "accept/item-78c-byron-kempsey-20260914";
const EXPIRES_AT = Date.parse("2026-09-28T00:00:00.000Z");
const PATH = "/api/internal/item78c-database-target";
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Type": "application/json",
};

function result(target: Target, status: number) {
  return new Response(
    JSON.stringify({ version: "item78c_database_target.v1", target }),
    { status, headers: HEADERS },
  );
}

// This compares deployment configuration, not connectivity or database contents.
// It deliberately has no Prisma, session, filesystem or network dependencies.
export function databaseTargetDiagnostic(
  request: Request,
  env: DiagnosticEnvironment,
  now = Date.now(),
): Response {
  if (
    env.VERCEL_ENV !== "preview" ||
    env.VERCEL_GIT_COMMIT_REF !== BRANCH ||
    !Number.isFinite(now) ||
    now >= EXPIRES_AT ||
    now < Date.parse("2026-09-25T00:00:00.000Z")
  ) {
    return new Response("Not Found", { status: 404, headers: HEADERS });
  }
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    const byron = params.get("byron");
    const kempsey = params.get("kempsey");
    if (
      request.method !== "GET" ||
      url.pathname !== PATH ||
      [...params.keys()].length !== 2 ||
      params.getAll("byron").length !== 1 ||
      params.getAll("kempsey").length !== 1 ||
      !byron || !kempsey ||
      !/^[a-f0-9]{64}$/.test(byron) ||
      !/^[a-f0-9]{64}$/.test(kempsey) ||
      byron === kempsey
    ) {
      return result("UNAVAILABLE", 400);
    }

    const connection = env.DATABASE_URL;
    if (!connection || connection !== connection.trim()) {
      return result("UNAVAILABLE", 503);
    }
    const database = new URL(connection);
    if (
      !["postgres:", "postgresql:"].includes(database.protocol) ||
      database.hash ||
      !/^ep-[a-z0-9-]+\.(?:[a-z0-9-]+\.)+neon\.tech$/.test(database.hostname)
    ) {
      return result("UNAVAILABLE", 503);
    }
    const endpoint = database.hostname.split(".")[0].replace(/-pooler$/, "");
    const fingerprint = createHash("sha256").update(endpoint).digest("hex");
    return result(
      fingerprint === byron ? "BYRON" :
        fingerprint === kempsey ? "KEMPSEY" : "NEITHER",
      200,
    );
  } catch {
    // Never stringify a connection, exception, environment or request.
    return result("UNAVAILABLE", 503);
  }
}
