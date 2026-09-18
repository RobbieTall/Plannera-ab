import { spawn } from "node:child_process";

import { fetchVercelPreviewOidcToken } from "../src/lib/vercel-preview-oidc";

const main = async () => {
  const oidcToken = await fetchVercelPreviewOidcToken({
    GITHUB_REF_NAME: process.env.GITHUB_REF_NAME,
    GITHUB_SHA: process.env.GITHUB_SHA,
    PLANNING_PACK_CHECKOUT_ENABLED:
      process.env.PLANNING_PACK_CHECKOUT_ENABLED,
    SUBMISSION_SEE_CHECKOUT_ENABLED:
      process.env.SUBMISSION_SEE_CHECKOUT_ENABLED,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  });

  // GitHub masks the short-lived credential before any child process starts.
  process.stdout.write(`::add-mask::${oidcToken}\n`);

  const childEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    VERCEL_OIDC_TOKEN: oidcToken,
  };
  delete childEnvironment.ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN;
  delete childEnvironment.VERCEL_TOKEN;

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      "npm",
      ["run", "--silent", "accept:item74h-private-blob-preview"],
      {
        env: childEnvironment,
        shell: false,
        stdio: "inherit",
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error("Preview OIDC acceptance child was interrupted"));
        return;
      }
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) process.exitCode = exitCode;
};

void main().catch(() => {
  console.error(
    JSON.stringify({
      gate: "item74h-preview-oidc-bootstrap",
      status: "FAIL",
      productionCheckoutEnabled: false,
      secretValueIncluded: false,
      errorDetailIncluded: false,
    }),
  );
  process.exitCode = 1;
});
