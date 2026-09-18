import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { resolveItem74hSandboxAuth } from "./item74h-sandbox-auth";

describe("Item 74H Sandbox authentication", () => {
  it("prefers an available Vercel OIDC token", () => {
    expect(
      resolveItem74hSandboxAuth({
        VERCEL_OIDC_TOKEN: "synthetic-oidc",
        VERCEL_TOKEN: "",
        VERCEL_TEAM_ID: "",
        VERCEL_PROJECT_ID: "",
      }),
    ).toEqual({});
  });

  it("returns a complete external-CI access-token tuple", () => {
    expect(
      resolveItem74hSandboxAuth({
        VERCEL_OIDC_TOKEN: "",
        VERCEL_TOKEN: " synthetic-access-token ",
        VERCEL_TEAM_ID: " team_example123 ",
        VERCEL_PROJECT_ID: " prj_example456 ",
      }),
    ).toEqual({
      token: "synthetic-access-token",
      teamId: "team_example123",
      projectId: "prj_example456",
    });
  });

  it("fails closed for missing, partial or malformed access credentials", () => {
    expect(() =>
      resolveItem74hSandboxAuth({
        VERCEL_OIDC_TOKEN: "",
        VERCEL_TOKEN: "",
        VERCEL_TEAM_ID: "",
        VERCEL_PROJECT_ID: "",
      }),
    ).toThrow(/authentication is missing/);
    expect(() =>
      resolveItem74hSandboxAuth({
        VERCEL_OIDC_TOKEN: "",
        VERCEL_TOKEN: "synthetic-access-token",
        VERCEL_TEAM_ID: "team_example123",
        VERCEL_PROJECT_ID: "",
      }),
    ).toThrow(/configuration is incomplete/);
    expect(() =>
      resolveItem74hSandboxAuth({
        VERCEL_OIDC_TOKEN: "",
        VERCEL_TOKEN: "synthetic-access-token",
        VERCEL_TEAM_ID: "production",
        VERCEL_PROJECT_ID: "prj_example456",
      }),
    ).toThrow(/team identifier is invalid/);
  });

  it("requires external-CI Sandbox credentials in protected workflows", async () => {
    for (const { workflowPath, expectedCredentialSteps, expectedCredentialJobs } of [
      {
        workflowPath:
          ".github/workflows/item74h-stateful-preview-acceptance.yml",
        expectedCredentialSteps: 4,
        expectedCredentialJobs: 1,
      },
      {
        workflowPath:
          ".github/workflows/item78c-byron-kempsey-acceptance.yml",
        expectedCredentialSteps: 4,
        expectedCredentialJobs: 2,
      },
    ]) {
      const workflow = await readFile(workflowPath, "utf8");
      const stepBlocks = workflow.split(/\n(?=      - name: )/);
      const jobBlocks = workflow
        .slice(workflow.indexOf("\njobs:\n") + "\njobs:\n".length)
        .split(/\n(?=  [A-Za-z0-9_-]+:\n)/);
      const credentialSteps = stepBlocks.filter((block) =>
        block.includes("ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN"),
      );
      const credentialJobs = jobBlocks.filter((block) =>
        block.includes("ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN"),
      );
      const authorizeJob = jobBlocks.find((block) =>
        block.startsWith("  authorize:\n"),
      );

      expect(workflow).not.toMatch(/ITEM74H_PREVIEW_VERCEL_OIDC_TOKEN/);
      expect(authorizeJob).toBeDefined();
      expect(authorizeJob).not.toMatch(/secrets\.|ITEM74H_PREVIEW_VERCEL_/);
      expect(credentialSteps).toHaveLength(expectedCredentialSteps);
      expect(credentialJobs).toHaveLength(expectedCredentialJobs);
      expect(
        workflow.match(/ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN/g),
      ).toHaveLength(expectedCredentialSteps);

      for (const block of credentialJobs) {
        expect(block).toMatch(/needs: authorize/);
        expect(block.indexOf("needs: authorize")).toBeLessThan(
          block.indexOf("steps:"),
        );
        expect(block).toMatch(/environment:/);
      }

      for (const block of credentialSteps) {
        expect(block).toMatch(
          /VERCEL_TOKEN: \$\{\{ secrets\.ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN \}\}/,
        );
        expect(block).toMatch(
          /VERCEL_TEAM_ID: \$\{\{ vars\.ITEM74H_PREVIEW_VERCEL_TEAM_ID \}\}/,
        );
        expect(block).toMatch(
          /VERCEL_PROJECT_ID: \$\{\{ vars\.ITEM74H_PREVIEW_VERCEL_PROJECT_ID \}\}/,
        );
        expect(block).toMatch(
          /run: (?:npm run(?: --silent)? accept:item74h-(?:private-blob-preview|clamav-preview)|node \.\/node_modules\/tsx\/dist\/cli\.mjs scripts\/run-item74h-private-blob-with-preview-oidc\.ts)/,
        );
        expect(block).not.toMatch(/DATABASE_URL|STRIPE_TEST_SECRET_KEY/);
      }
    }
  });

  it("publishes only allowlisted commercial-bridge evidence", async () => {
    const workflow = await readFile(
      ".github/workflows/item78c-byron-kempsey-acceptance.yml",
      "utf8",
    );
    for (const council of ["byron", "kempsey"]) {
      const rawPath = `item78c-${council}-bridge-raw.json`;
      const safePath = `item78c-${council}-bridge.json`;
      const commandBlock = [
        "          set +e",
        `          npm run --silent accept:item78a-durable-commercial-bridge > ${rawPath}`,
        "          bridge_status=$?",
        "          set -e",
        `          node ./scripts/item78c-sanitize-bridge-summary.mjs ${rawPath} ${safePath}`,
        `          echo "summary=$(cat ${safePath})" >> "$GITHUB_OUTPUT"`,
        `          cat ${safePath}`,
        '          exit "$bridge_status"',
      ].join("\n");

      expect(workflow).toContain(commandBlock);
      expect(workflow.split(rawPath)).toHaveLength(3);
      expect(workflow).toContain(
        `node ./scripts/item78c-sanitize-bridge-summary.mjs ${rawPath} ${safePath}`,
      );
      expect(workflow).toContain(
        `echo "summary=$(cat ${safePath})" >> "$GITHUB_OUTPUT"`,
      );
      expect(workflow).not.toContain(`cat ${rawPath}`);
      expect(workflow).not.toMatch(
        new RegExp(`(?:echo|printf).*${rawPath}.*GITHUB_OUTPUT`),
      );
    }
    expect(
      workflow.match(/node \.\/scripts\/item78c-sanitize-bridge-summary\.mjs/g),
    ).toHaveLength(2);
  });
});
