#!/usr/bin/env node
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const clientEntry = join(process.cwd(), "node_modules", ".prisma", "client", "default.js");

if (existsSync(clientEntry)) {
  console.log(`[build] Prisma client already generated at ${clientEntry}. Skipping prisma generate.`);
  process.exit(0);
}

console.log("[build] Prisma client not found. Running `prisma generate`...");

const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  console.error(`[build] prisma generate failed with status ${result.status ?? "unknown"}.`);
  process.exit(result.status ?? 1);
}

process.exit(0);
