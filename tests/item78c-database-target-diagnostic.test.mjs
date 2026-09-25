import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { databaseTargetDiagnostic } from "../src/lib/item78c-database-target-diagnostic.ts";

const now = Date.parse("2026-09-25T12:00:00Z");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const byron = hash("ep-synthetic-byron");
const kempsey = hash("ep-synthetic-kempsey");
const path = "/api/internal/item78c-database-target";
const address = "https://synthetic.invalid" + path;
const env = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "accept/item-78c-byron-kempsey-20260914",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-synthetic-byron.ap-southeast-2.aws.neon.tech/synthetic",
};
const request = (query = new URLSearchParams({ byron, kempsey }).toString()) =>
  new Request(address + "?" + query);
const inspect = async (configuration = env, req = request(), at = now) => {
  const response = databaseTargetDiagnostic(req, configuration, at);
  const text = await response.text();
  return { response, text, body: response.status === 404 ? null : JSON.parse(text) };
};

for (const [name, target, url] of [
  ["Byron", "BYRON", env.DATABASE_URL],
  ["Kempsey", "KEMPSEY", env.DATABASE_URL.replace("ep-synthetic-byron", "ep-synthetic-kempsey")],
  ["pooled Byron", "BYRON", env.DATABASE_URL.replace("ep-synthetic-byron.", "ep-synthetic-byron-pooler.")],
  ["other endpoint", "NEITHER", env.DATABASE_URL.replace("ep-synthetic-byron", "ep-synthetic-other")],
]) {
  test(name + " returns only a fixed classification", async () => {
    const { response, body, text } = await inspect({ ...env, DATABASE_URL: url });
    assert.equal(response.status, 200);
    assert.deepEqual(body, { version: "item78c_database_target.v1", target });
    for (const sensitive of [url, "synthetic", byron, kempsey]) assert.ok(!text.includes(sensitive));
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("set-cookie"), null);
  });
}

for (const overrides of [
  { VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { VERCEL_ENV: undefined },
  { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_GIT_COMMIT_REF: undefined },
  { VERCEL_GIT_COMMIT_REF: env.VERCEL_GIT_COMMIT_REF + "-other" },
]) {
  test("wrong scope fails before reading database configuration: " + JSON.stringify(overrides), async () => {
    const configuration = { ...env, ...overrides };
    Object.defineProperty(configuration, "DATABASE_URL", { get() { throw new Error("MUST NOT READ"); } });
    const { response } = await inspect(configuration);
    assert.equal(response.status, 404);
  });
}
for (const at of [Date.parse("2026-09-28T00:00:00Z"), Date.parse("2026-09-24T23:59:59Z"), NaN, Infinity]) {
  test("out-of-window clock fails closed: " + at, async () => {
    const configuration = { ...env };
    Object.defineProperty(configuration, "DATABASE_URL", { get() { throw new Error("MUST NOT READ"); } });
    assert.equal((await inspect(configuration, request(), at)).response.status, 404);
  });
}
for (const query of [
  "", "byron=" + byron, "byron=x&kempsey=" + kempsey,
  "byron=" + byron + "&kempsey=" + byron,
  "byron=" + byron + "&kempsey=" + kempsey + "&byron=" + byron,
  "byron=" + byron + "&kempsey=" + kempsey + "&extra=1",
  "byron=%24%28touch%20bad%29&kempsey=" + kempsey,
]) {
  test("invalid or malicious input is rejected before configuration access: " + query.slice(0,24), async () => {
    const configuration = { ...env };
    Object.defineProperty(configuration, "DATABASE_URL", { get() { throw new Error("MUST NOT READ"); } });
    const { response, body } = await inspect(configuration, request(query));
    assert.equal(response.status, 400);
    assert.equal(body.target, "UNAVAILABLE");
  });
}
for (const connection of [
  undefined, "", "not a URL", " " + env.DATABASE_URL,
  env.DATABASE_URL + " ", env.DATABASE_URL + "#fragment",
  env.DATABASE_URL.replace("postgresql:", "https:"),
  env.DATABASE_URL.replace(".neon.tech", ".neon.tech.attacker.invalid"),
  "postgresql://synthetic:synthetic@localhost/synthetic",
]) {
  test("invalid or non-Neon configuration is not classified: " + String(connection).slice(0,20), async () => {
    const { response, body } = await inspect({ ...env, DATABASE_URL: connection });
    assert.equal(response.status, 503);
    assert.equal(body.target, "UNAVAILABLE");
  });
}
test("wrong method or path is rejected", async () => {
  for (const req of [
    new Request(request().url, { method: "POST" }),
    new Request(request().url.replace(path, "/unrelated")),
  ]) assert.equal((await inspect(env, req)).response.status, 400);
});
test("configuration exceptions never expose details", async () => {
  const configuration = { ...env };
  Object.defineProperty(configuration, "DATABASE_URL", { get() { throw new Error("DO_NOT_EXPOSE"); } });
  const { response, text } = await inspect(configuration);
  assert.equal(response.status, 503);
  assert.ok(!text.includes("DO_NOT_EXPOSE"));
});
test("helper has only a crypto import; route is dynamic; middleware bypass precedes session creation", () => {
  const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
  const helper = read("src/lib/item78c-database-target-diagnostic.ts");
  assert.deepEqual([...helper.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1]), ["node:crypto"]);
  assert.doesNotMatch(helper, /\b(?:fetch|console|prisma|eval)\s*[.(]/);
  const route = read("src/app/api/internal/item78c-database-target/route.ts");
  assert.match(route, /dynamic = "force-dynamic"/);
  assert.match(route, /return databaseTargetDiagnostic\(request, process\.env\)/);
  const middleware = read("src/middleware.ts");
  const start = middleware.indexOf("export async function middleware");
  const bypass = middleware.indexOf('pathname === "/api/internal/item78c-database-target"', start);
  assert.ok(bypass > start);
  assert.ok(bypass < middleware.indexOf("const existingCookie", start));
  assert.match(middleware.slice(bypass, middleware.indexOf("const existingCookie",start)), /return NextResponse\.next\(\)/);
});
