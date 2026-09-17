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
    for (const workflowPath of [
      ".github/workflows/item74h-stateful-preview-acceptance.yml",
      ".github/workflows/item78c-byron-kempsey-acceptance.yml",
    ]) {
      const workflow = await readFile(workflowPath, "utf8");

      expect(workflow).not.toMatch(/ITEM74H_PREVIEW_VERCEL_OIDC_TOKEN/);
      expect(workflow).toMatch(
        /VERCEL_TOKEN: \$\{\{ secrets\.ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN \}\}/,
      );
      expect(workflow).toMatch(
        /VERCEL_TEAM_ID: \$\{\{ vars\.ITEM74H_PREVIEW_VERCEL_TEAM_ID \}\}/,
      );
      expect(workflow).toMatch(
        /VERCEL_PROJECT_ID: \$\{\{ vars\.ITEM74H_PREVIEW_VERCEL_PROJECT_ID \}\}/,
      );
    }
  });

  it("publishes only allowlisted commercial-bridge evidence", async () => {
    const workflow = await readFile(
      ".github/workflows/item78c-byron-kempsey-acceptance.yml",
      "utf8",
    );
    const checkNames = [
      "protected_preview",
      "paid_source",
      "exact_scope",
      "single_pack",
      "evidence_boundaries",
      "evidence_regeneration",
      "single_use_credit",
      "cross_scope_denial",
      "working_outputs",
      "replay_safety",
      "production_disabled",
      "zero_residue",
    ];

    expect(workflow).toContain("item78c-byron-bridge-raw.json");
    expect(workflow).toContain("item78c-kempsey-bridge-raw.json");
    expect(workflow).not.toMatch(
      /summary=\$\(cat item78c-(?:byron|kempsey)-bridge-raw\.json\)/,
    );
    expect(workflow).toContain(
      'echo "summary=$(cat item78c-byron-bridge.json)" >> "$GITHUB_OUTPUT"',
    );
    expect(workflow).toContain(
      'echo "summary=$(cat item78c-kempsey-bridge.json)" >> "$GITHUB_OUTPUT"',
    );
    expect(workflow.match(/const checks=Object\.fromEntries/g)).toHaveLength(2);
    expect(workflow.match(/containsSensitiveValues:s\.containsSensitiveValues/g)).toHaveLength(
      2,
    );
    for (const checkName of checkNames) {
      expect(workflow.match(new RegExp(`'${checkName}'`, "g"))).toHaveLength(2);
    }
  });
});
