import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXPECTED_VERCEL_BUILD_STEPS = Object.freeze([
  "node ./scripts/verify-vercel-build-safety.mjs",
  "node ./scripts/prisma-generate.js",
  "npm run smoke:launch",
  "npm run smoke:whole-lga",
  "npm run accept:item74h-controlled-address-preview",
  "npm run accept:item74h-working-see-preview",
  "node ./scripts/run-next-build-without-credentials.mjs",
]);

export const BUILD_ENTRY_CONTRACTS = Object.freeze([
  {
    command: "node ./scripts/prisma-generate.js",
    file: "scripts/prisma-generate.js",
    sha256: "2a08a94d4ff7d63d5a83ea1ff43f9011b513c877a765e58423e0e4730d3bea50",
  },
  {
    command: "npm run smoke:launch",
    packageScript: "smoke:launch",
    wrapper: "tsx scripts/launch-smoke.ts",
    file: "scripts/launch-smoke.ts",
  },
  {
    command: "npm run smoke:whole-lga",
    packageScript: "smoke:whole-lga",
    wrapper: "tsx scripts/whole-lga-matrix-smoke.ts",
    file: "scripts/whole-lga-matrix-smoke.ts",
  },
  {
    command: "npm run accept:item74h-controlled-address-preview",
    packageScript: "accept:item74h-controlled-address-preview",
    wrapper: "tsx scripts/item74h-controlled-address-preflight.ts",
    file: "scripts/item74h-controlled-address-preflight.ts",
  },
  {
    command: "npm run accept:item74h-working-see-preview",
    packageScript: "accept:item74h-working-see-preview",
    wrapper: "tsx scripts/item74h-working-see-preview-acceptance.ts",
    file: "scripts/item74h-working-see-preview-acceptance.ts",
  },
  {
    command: "node ./scripts/run-next-build-without-credentials.mjs",
    file: "scripts/run-next-build-without-credentials.mjs",
    sha256: "2fc9821735e9b801df109440accca278e39701adfa568b7e422adc1f6ab984b2",
  },
]);

export const TRANSITIVE_BUILD_FILE_CONTRACTS = Object.freeze({
  "scripts/prisma-generate.js": "2a08a94d4ff7d63d5a83ea1ff43f9011b513c877a765e58423e0e4730d3bea50",
  "scripts/run-next-build-without-credentials.mjs": "2fc9821735e9b801df109440accca278e39701adfa568b7e422adc1f6ab984b2",
  "scripts/item74h-controlled-address-preflight.ts": "a20cd1faa502d70fbb0df42540fc02f480d21505a0e579ad87f19562f6862f70",
  "scripts/item74h-working-see-preview-acceptance.ts": "cd59a54c713a9804c9a7e71a839196ce05186c2539f0c6ceeeec9905ba928d00",
  "scripts/launch-smoke.ts": "aea2b29c227617ce0bbc0e3d90cb7f92bfdc5534710a7729cd881e60255bb1fc",
  "scripts/whole-lga-matrix-smoke.ts": "08123ea4cbdc4e97f41866c3947c536555b7685c5e21a60aa33c11ae2272a416",
  "src/lib/dcp/extract-numeric.ts": "8295ab3331dc827083dcf03f75a9a01e599fc5e1c359799ddd9a66b3e7551226",
  "src/lib/dcp/search.ts": "ba118accf65302b989e94a578f69e74e9bde7be53c986384ce85fbd59bb28406",
  "src/lib/dcp/topic-tags.ts": "5b18a4b0b50c225754e3ad40957637808b9e1c95ad0b2d2553a3fc86900ca047",
  "src/lib/lga-map-registry.ts": "a0fd89e597e1896f5ab2a0c2c740b7b1b904df424e2650928b329f348621a6cc",
  "src/lib/prisma.ts": "33f354abf0f5bdd54e1b5f2a265b598809954473ca83193510650acad99288cf",
  "src/lib/submission-see-acceptance.ts": "d4606785c169049bb8f7e3fc8b081acc30f3465d2550b268887a8a19cc5f4526",
  "src/lib/submission-see-renderer.ts": "39ee6faabefcf7ac584a12ce15ffddf8ca8fdfdfc4a9544af7bfa95a96bd72d0",
});

export const NEXT_CONFIG_CONTRACT = Object.freeze({
  file: "next.config.mjs",
  sha256: "c0c6fad341b66a3a83c0fca7f2521e66a142b503529799ab688d94ebc8612552",
});

const FORBIDDEN_ENTRY_PATTERNS = Object.freeze([
  [/@vercel\/(?:blob|sandbox)/, "cloud resource SDK"],
  [/\$(?:executeRaw|executeRawUnsafe)\s*[<(]/, "raw database mutation API"],
  [/\bprisma(?:\.\w+)+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/, "Prisma mutation API"],
  [/\b(?:INSERT\s+INTO|UPDATE\s+[^;\n]+\s+SET|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX)|ALTER\s+TABLE|DROP\s+(?:TABLE|INDEX)|TRUNCATE\s+TABLE)\b/i, "mutating SQL"],
  [/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|unlink|unlinkSync|rm|rmSync)\s*\(/, "filesystem mutation API"],
]);

const ROOT_BUILD_ENTRIES = Object.freeze(BUILD_ENTRY_CONTRACTS.map((entry) => entry.file));
const IMPORT_PATTERN =
  /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function localImportCandidates(importer, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return [];
  const base = specifier.startsWith("@/")
    ? path.posix.join("src", specifier.slice(2))
    : path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  return [
    base,
    base + ".ts",
    base + ".tsx",
    base + ".js",
    base + ".mjs",
    base + ".json",
    base + "/index.ts",
    base + "/index.tsx",
    base + "/index.js",
    base + "/index.mjs",
  ];
}

export function collectTransitiveBuildFiles(sourceByPath) {
  const visited = new Set();
  const pending = [...ROOT_BUILD_ENTRIES];
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    const source = sourceByPath[file];
    if (typeof source !== "string") throw new Error("missing transitive build source: " + file);
    visited.add(file);
    const runtimeSource = source.replace(
      /\b(?:import|export)\s+type\b[\s\S]*?\bfrom\s*["'][^"']+["'];?/g,
      "",
    );
    IMPORT_PATTERN.lastIndex = 0;
    let match;
    while ((match = IMPORT_PATTERN.exec(runtimeSource))) {
      const specifier = match[1] ?? match[2] ?? match[3];
      const resolved = localImportCandidates(file, specifier).find((candidate) =>
        Object.hasOwn(sourceByPath, candidate),
      );
      if (!resolved && (specifier.startsWith(".") || specifier.startsWith("@/"))) {
        throw new Error("uncontracted local import from " + file);
      }
      if (resolved && !visited.has(resolved)) pending.push(resolved);
    }
  }
  return [...visited].sort();
}

function rejectForbiddenSource(file, source) {
  for (const [pattern, label] of FORBIDDEN_ENTRY_PATTERNS) {
    if (pattern.test(source)) throw new Error(file + " contains forbidden " + label);
  }
}

export function verifyBuildContract({ packageJson, sourceByPath }) {
  const actualSteps = String(packageJson.scripts?.["vercel-build"] ?? "")
    .split("&&")
    .map((step) => step.trim())
    .filter(Boolean);
  if (JSON.stringify(actualSteps) !== JSON.stringify(EXPECTED_VERCEL_BUILD_STEPS)) {
    throw new Error("vercel-build must exactly match the reviewed permitted-command list");
  }

  const contractedCommands = new Set(BUILD_ENTRY_CONTRACTS.map((entry) => entry.command));
  for (const command of actualSteps.slice(1)) {
    if (!contractedCommands.has(command)) {
      throw new Error("uncontracted vercel-build command: " + command);
    }
  }

  for (const entry of BUILD_ENTRY_CONTRACTS) {
    if (entry.packageScript && packageJson.scripts?.[entry.packageScript] !== entry.wrapper) {
      throw new Error("wrapper changed for " + entry.packageScript);
    }
    const source = sourceByPath[entry.file];
    if (typeof source !== "string") throw new Error("missing contracted entry source: " + entry.file);
    rejectForbiddenSource(entry.file, source);
    if (entry.sha256 && sha256(source) !== entry.sha256) {
      throw new Error("reviewed entry fingerprint changed: " + entry.file);
    }
  }

  const actualClosure = collectTransitiveBuildFiles(sourceByPath);
  const expectedClosure = Object.keys(TRANSITIVE_BUILD_FILE_CONTRACTS).sort();
  if (JSON.stringify(actualClosure) !== JSON.stringify(expectedClosure)) {
    throw new Error("transitive build dependency closure changed and requires review");
  }
  for (const file of actualClosure) {
    const source = sourceByPath[file];
    rejectForbiddenSource(file, source);
    if (sha256(source) !== TRANSITIVE_BUILD_FILE_CONTRACTS[file]) {
      throw new Error("reviewed transitive fingerprint changed: " + file);
    }
  }

  const nextConfig = sourceByPath[NEXT_CONFIG_CONTRACT.file];
  if (typeof nextConfig !== "string" || sha256(nextConfig) !== NEXT_CONFIG_CONTRACT.sha256) {
    throw new Error("reviewed Next.js configuration fingerprint changed");
  }
  rejectForbiddenSource(NEXT_CONFIG_CONTRACT.file, nextConfig);

  return {
    commands: actualSteps.length,
    contractedEntries: BUILD_ENTRY_CONTRACTS.length,
    transitiveSources: actualClosure.length,
  };
}

export function verifyRepositoryBuildContract(rootDirectory = process.cwd()) {
  const packageJson = JSON.parse(readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
  const files = new Set([
    ...BUILD_ENTRY_CONTRACTS.map((entry) => entry.file),
    ...Object.keys(TRANSITIVE_BUILD_FILE_CONTRACTS),
    NEXT_CONFIG_CONTRACT.file,
  ]);
  const sourceByPath = Object.fromEntries(
    [...files].map((file) => [file, readFileSync(path.join(rootDirectory, file), "utf8")]),
  );
  return verifyBuildContract({ packageJson, sourceByPath });
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const result = verifyRepositoryBuildContract();
  console.log(
    "Vercel build safety contract passed (" +
      result.commands +
      " commands, " +
      result.contractedEntries +
      " entries, " +
      result.transitiveSources +
      " transitive sources).",
  );
}
