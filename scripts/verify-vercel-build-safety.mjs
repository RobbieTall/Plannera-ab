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
  "next build",
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
    sha256: "aea2b29c227617ce0bbc0e3d90cb7f92bfdc5534710a7729cd881e60255bb1fc",
  },
  {
    command: "npm run smoke:whole-lga",
    packageScript: "smoke:whole-lga",
    wrapper: "tsx scripts/whole-lga-matrix-smoke.ts",
    file: "scripts/whole-lga-matrix-smoke.ts",
    sha256: "08123ea4cbdc4e97f41866c3947c536555b7685c5e21a60aa33c11ae2272a416",
  },
  {
    command: "npm run accept:item74h-controlled-address-preview",
    packageScript: "accept:item74h-controlled-address-preview",
    wrapper: "tsx scripts/item74h-controlled-address-preflight.ts",
    file: "scripts/item74h-controlled-address-preflight.ts",
    sha256: "a20cd1faa502d70fbb0df42540fc02f480d21505a0e579ad87f19562f6862f70",
  },
  {
    command: "npm run accept:item74h-working-see-preview",
    packageScript: "accept:item74h-working-see-preview",
    wrapper: "tsx scripts/item74h-working-see-preview-acceptance.ts",
    file: "scripts/item74h-working-see-preview-acceptance.ts",
    sha256: "cd59a54c713a9804c9a7e71a839196ce05186c2539f0c6ceeeec9905ba928d00",
  },
]);

const FORBIDDEN_ENTRY_PATTERNS = Object.freeze([
  [/@vercel\/(?:blob|sandbox)/, "cloud resource SDK"],
  [/\$(?:executeRaw|executeRawUnsafe)\s*[<(]/, "raw database mutation API"],
  [/\bprisma(?:\.\w+)+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/, "Prisma mutation API"],
  [/\b(?:INSERT\s+INTO|UPDATE\s+[^;\n]+\s+SET|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX)|ALTER\s+TABLE|DROP\s+(?:TABLE|INDEX)|TRUNCATE\s+TABLE)\b/i, "mutating SQL"],
  [/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|unlink|unlinkSync|rm|rmSync)\s*\(/, "filesystem mutation API"],
]);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
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
  for (const command of actualSteps.slice(1, -1)) {
    if (!contractedCommands.has(command)) {
      throw new Error(`uncontracted vercel-build command: ${command}`);
    }
  }

  for (const entry of BUILD_ENTRY_CONTRACTS) {
    if (entry.packageScript && packageJson.scripts?.[entry.packageScript] !== entry.wrapper) {
      throw new Error(`wrapper changed for ${entry.packageScript}`);
    }
    const source = sourceByPath[entry.file];
    if (typeof source !== "string") {
      throw new Error(`missing contracted entry source: ${entry.file}`);
    }
    if (sha256(source) !== entry.sha256) {
      throw new Error(`reviewed entry fingerprint changed: ${entry.file}`);
    }
    for (const [pattern, label] of FORBIDDEN_ENTRY_PATTERNS) {
      if (pattern.test(source)) {
        throw new Error(`${entry.file} contains forbidden ${label}`);
      }
    }
  }

  return {
    commands: actualSteps.length,
    contractedEntries: BUILD_ENTRY_CONTRACTS.length,
  };
}

export function verifyRepositoryBuildContract(rootDirectory = process.cwd()) {
  const packageJson = JSON.parse(readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
  const sourceByPath = Object.fromEntries(
    BUILD_ENTRY_CONTRACTS.map((entry) => [
      entry.file,
      readFileSync(path.join(rootDirectory, entry.file), "utf8"),
    ]),
  );
  return verifyBuildContract({ packageJson, sourceByPath });
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const result = verifyRepositoryBuildContract();
  console.log(
    `Vercel build safety contract passed (${result.commands} commands, ${result.contractedEntries} reviewed entries).`,
  );
}
