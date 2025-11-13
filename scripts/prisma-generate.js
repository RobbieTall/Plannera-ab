#!/usr/bin/env node
const { existsSync, statSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const clientEntry = join(process.cwd(), "node_modules", ".prisma", "client", "default.js");
const schemaPath = join(process.cwd(), "prisma", "schema.prisma");

const needsGenerate = (() => {
  if (!existsSync(clientEntry)) {
    console.log(`[build] Prisma client not found at ${clientEntry}.`);
    return true;
  }

  if (!existsSync(schemaPath)) {
    return false;
  }

  try {
    const clientStat = statSync(clientEntry);
    const schemaStat = statSync(schemaPath);

    if (schemaStat.mtimeMs > clientStat.mtimeMs) {
      console.log(
        `[build] Prisma schema is newer than generated client (${new Date(schemaStat.mtimeMs).toISOString()} > ${new Date(clientStat.mtimeMs).toISOString()}).`,
      );
      return true;
    }
  } catch (error) {
    console.warn("[build] Unable to compare Prisma schema/client timestamps, regenerating.", error);
    return true;
  }

  return false;
})();

if (!needsGenerate) {
  console.log(`[build] Prisma client already generated and up to date at ${clientEntry}. Skipping prisma generate.`);
  process.exit(0);
}

console.log("[build] Prisma client not found. Running `prisma generate`...");

const env = {
  ...process.env,
  PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING:
    process.env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING ?? "1",
};

if (env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING === "1") {
  console.log(
    "[build] PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 to allow offline Prisma engine install.",
  );
}

const result = spawnSync("npx", ["prisma", "generate"], {
  env,
  encoding: "utf-8",
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  console.warn(
    `[build] prisma generate failed with status ${result.status ?? "unknown"}. Continuing with fallback client.`,
  );
}

process.exit(0);
