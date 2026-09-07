import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  BUILD_ENTRY_CONTRACTS,
  EXPECTED_VERCEL_BUILD_STEPS,
  NEXT_CONFIG_CONTRACT,
  TRANSITIVE_BUILD_FILE_CONTRACTS,
  verifyBuildContract,
  verifyRepositoryBuildContract,
} from "../scripts/verify-vercel-build-safety.mjs";
import {
  verifyCredentialFreeAuthorization,
  verifyCredentialTargets,
  verifyProtectedAuthorization,
  isCommitOnMain,
} from "../scripts/verify-preview-workflow-authorization.mjs";
import { sanitizedBuildEnvironment } from "../scripts/run-next-build-without-credentials.mjs";

function currentFixture() {
  const packageJson = {
    scripts: { "vercel-build": EXPECTED_VERCEL_BUILD_STEPS.join(" && ") },
  };
  const files = new Set([
    ...BUILD_ENTRY_CONTRACTS.map((entry) => entry.file),
    ...Object.keys(TRANSITIVE_BUILD_FILE_CONTRACTS),
    NEXT_CONFIG_CONTRACT.file,
  ]);
  const sourceByPath = Object.fromEntries(
    [...files].map((file) => [
      file,
      readFileSync(new URL("../" + file, import.meta.url), "utf8"),
    ]),
  );
  for (const entry of BUILD_ENTRY_CONTRACTS) {
    if (entry.packageScript) packageJson.scripts[entry.packageScript] = entry.wrapper;
  }
  return { packageJson, sourceByPath };
}

function request(commit = "a".repeat(40)) {
  return {
    workflow: "migration",
    confirmation: "AUTHORIZE PREVIEW MIGRATION",
    expectedCommit: commit,
    databaseTarget: "ep-safe-preview",
  };
}

function protectedEnv(commit = "a".repeat(40)) {
  return {
    GITHUB_SHA: commit,
    GITHUB_REF_NAME: "fix/build-safety",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "fix/build-safety",
    VERCEL_GIT_COMMIT_SHA: commit,
    PLANNING_PACK_CHECKOUT_ENABLED: "false",
    SUBMISSION_SEE_CHECKOUT_ENABLED: "false",
    ITEM74H_PREVIEW_MUTATION_APPROVED: "true",
    ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: commit,
    ITEM74H_AUTHORIZED_DATABASE_TARGET: "ep-safe-preview",
  };
}

test("repository build safety contract accepts the reviewed checkout and transitive closure", () => {
  const result = verifyRepositoryBuildContract();
  assert.equal(result.contractedEntries, 6);
  assert.equal(result.transitiveSources, 13);
});

test("build contract rejects an added command", () => {
  const fixture = currentFixture();
  fixture.packageJson.scripts["vercel-build"] += " && npm run migrate:item74h-preview";
  assert.throws(() => verifyBuildContract(fixture), /permitted-command list/);
});

test("build contract rejects wrapper and transitive source drift before execution", () => {
  const wrapperFixture = currentFixture();
  wrapperFixture.packageJson.scripts["smoke:launch"] = "tsx scripts/mutating-wrapper.ts";
  assert.throws(() => verifyBuildContract(wrapperFixture), /wrapper changed/);

  const sourceFixture = currentFixture();
  sourceFixture.sourceByPath["src/lib/dcp/topic-tags.ts"] += "\n// drift";
  assert.throws(() => verifyBuildContract(sourceFixture), /transitive fingerprint changed/);
});

test("credential-free authorization rejects malicious dispatch data without execution", () => {
  const commit = "a".repeat(40);
  assert.throws(
    () =>
      verifyCredentialFreeAuthorization({
        env: { GITHUB_SHA: commit, GITHUB_REF_NAME: "fix/build-safety" },
        ...request(commit),
        confirmation: "$(touch /tmp/should-never-run)",
        checkedOutCommit: commit,
        isCommitOnMain: () => false,
      }),
    /confirmation phrase/,
  );
});

test("Git ancestry evidence distinguishes main history from a feature-only commit", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "plannera-git-evidence-"));
  const git = (args) => {
    const result = spawnSync("git", args, { cwd: directory, encoding: "utf8", shell: false });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  try {
    git(["init", "-b", "main"]);
    writeFileSync(path.join(directory, "evidence.txt"), "main\n");
    git(["add", "evidence.txt"]);
    git(["-c", "user.name=Safety Test", "-c", "user.email=safety@example.invalid", "commit", "-m", "main"]);
    const mainCommit = git(["rev-parse", "HEAD"]);
    git(["switch", "-c", "feature"]);
    writeFileSync(path.join(directory, "evidence.txt"), "feature\n");
    git(["add", "evidence.txt"]);
    git(["-c", "user.name=Safety Test", "-c", "user.email=safety@example.invalid", "commit", "-m", "feature"]);
    const featureCommit = git(["rev-parse", "HEAD"]);
    git(["update-ref", "refs/remotes/origin/main", mainCommit]);

    assert.equal(isCommitOnMain(mainCommit, directory), true);
    assert.equal(isCommitOnMain(featureCommit, directory), false);
    assert.throws(
      () =>
        verifyCredentialFreeAuthorization({
          env: { GITHUB_SHA: mainCommit, GITHUB_REF_NAME: "clever-non-main-name" },
          ...request(mainCommit),
          checkedOutCommit: mainCommit,
          isCommitOnMain: (commit) => isCommitOnMain(commit, directory),
        }),
      /contained in main/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("credential-free authorization rejects malformed and mismatched request data", () => {
  const commit = "d".repeat(40);
  const base = {
    env: { GITHUB_SHA: commit, GITHUB_REF_NAME: "fix/build-safety" },
    ...request(commit),
    checkedOutCommit: commit,
    isCommitOnMain: () => false,
  };
  assert.throws(() => verifyCredentialFreeAuthorization({ ...base, expectedCommit: "not-a-sha" }), /full lowercase SHA/);
  assert.throws(() => verifyCredentialFreeAuthorization({ ...base, databaseTarget: "production" }), /Neon endpoint ID/);
  assert.throws(() => verifyCredentialFreeAuthorization({ ...base, checkedOutCommit: "e".repeat(40) }), /Checked-out Git commit/);
  assert.throws(
    () => verifyCredentialFreeAuthorization({ ...base, workflow: "stateful", suite: "unknown", confirmation: "AUTHORIZE PREVIEW STATEFUL ACCEPTANCE" }),
    /Unknown stateful acceptance suite/,
  );
  assert.throws(
    () => verifyCredentialFreeAuthorization({ ...base, workflow: "stateful", suite: "private-evidence", confirmation: "AUTHORIZE PREVIEW STATEFUL ACCEPTANCE", blobTarget: "$(unsafe)" }),
    /explicit Blob target/,
  );
});

test("protected authorization rejects commit and external target mismatches", () => {
  const commit = "f".repeat(40);
  assert.throws(
    () => verifyProtectedAuthorization({ env: { ...protectedEnv(commit), VERCEL_GIT_COMMIT_SHA: "0".repeat(40) }, ...request(commit), checkedOutCommit: commit, isCommitOnMain: () => false }),
    /Hosted commit identity/,
  );
  assert.throws(
    () => verifyProtectedAuthorization({ env: { ...protectedEnv(commit), ITEM74H_AUTHORIZED_DATABASE_TARGET: "ep-other-preview" }, ...request(commit), checkedOutCommit: commit, isCommitOnMain: () => false }),
    /not externally authorized/,
  );
  assert.throws(
    () => verifyProtectedAuthorization({ env: protectedEnv(commit), ...request(commit), checkedOutCommit: commit, isCommitOnMain: () => true }),
    /became contained in main/,
  );
});

test("failed protected authorization occurs before credential target validation", () => {
  const commit = "c".repeat(40);
  let credentialValidationReached = false;
  assert.throws(() => {
    verifyProtectedAuthorization({
      env: { ...protectedEnv(commit), ITEM74H_PREVIEW_MUTATION_APPROVED: "false" },
      ...request(commit),
      checkedOutCommit: commit,
      isCommitOnMain: () => false,
    });
    credentialValidationReached = true;
    verifyCredentialTargets({
      env: {
        DATABASE_URL: "postgresql://synthetic:synthetic@ep-safe-preview.neon.tech/neondb",
      },
      workflow: "migration",
      databaseTarget: "ep-safe-preview",
    });
  }, /authorization is absent/);
  assert.equal(credentialValidationReached, false);
});

test("credential target validation matches the authorized Neon endpoint", () => {
  assert.equal(
    verifyCredentialTargets({
      env: {
        DATABASE_URL:
          "postgresql://synthetic:synthetic@ep-safe-preview-pooler.ap-southeast-2.aws.neon.tech/neondb",
      },
      workflow: "migration",
      databaseTarget: "ep-safe-preview",
    }).databaseTarget,
    "ep-safe-preview",
  );
});

test("manual workflows keep dispatch data out of shell and credentials after prerequisite authorization", () => {
  const interpolatedRun = new RegExp("^\\s+run:.*\\$\\{\\{\\s*inputs\\.", "m");
  for (const file of [
    ".github/workflows/item74h-preview-migration.yml",
    ".github/workflows/item74h-stateful-preview-acceptance.yml",
  ]) {
    const workflow = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const sections = workflow.split(/^  execute:/m);
    const beforeExecute = sections[0];
    const execute = sections[1];
    assert.ok(execute, file + " must have a protected execute job");
    assert.doesNotMatch(beforeExecute, /secrets\.|environment:/);
    assert.match(execute, /\n    needs: authorize\n/);
    assert.doesNotMatch(workflow, interpolatedRun);
    assert.ok(
      execute.indexOf("Recheck protected authorization and current main ancestry without credentials") <
        execute.indexOf("secrets."),
    );
    for (const line of workflow.split("\n").filter((value) => value.includes("secrets."))) {
      assert.ok(/^\s{10,}/.test(line), file + " secret must be scoped to a step");
    }
  }
});

test("Next build wrapper removes mutation credentials and forces checkout gates off", () => {
  const clean = sanitizedBuildEnvironment({
    PATH: "/synthetic/bin",
    DATABASE_URL: "must-not-survive",
    STRIPE_SECRET_KEY: "must-not-survive",
    ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN: "must-not-survive",
    VERCEL_OIDC_TOKEN: "must-not-survive",
    ADMIN_SECRET: "must-not-survive",
    CRON_SECRET: "must-not-survive",
    MAGIC_LINK_SECRET: "must-not-survive",
    NEXTAUTH_SECRET: "must-not-survive",
    EMAIL_SERVER_PASSWORD: "must-not-survive",
    UNRECOGNIZED_CONFIG: "must-not-survive",
    NEXT_PUBLIC_APP_NAME: "Plannera",
    PLANNING_PACK_CHECKOUT_ENABLED: "true",
  });
  assert.equal(clean.PATH, "/synthetic/bin");
  assert.equal(clean.NEXT_PUBLIC_APP_NAME, "Plannera");
  assert.equal(clean.DATABASE_URL, undefined);
  assert.equal(clean.STRIPE_SECRET_KEY, undefined);
  assert.equal(clean.ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN, undefined);
  assert.equal(clean.VERCEL_OIDC_TOKEN, undefined);
  assert.equal(clean.ADMIN_SECRET, undefined);
  assert.equal(clean.CRON_SECRET, undefined);
  assert.equal(clean.MAGIC_LINK_SECRET, undefined);
  assert.equal(clean.NEXTAUTH_SECRET, undefined);
  assert.equal(clean.EMAIL_SERVER_PASSWORD, undefined);
  assert.equal(clean.UNRECOGNIZED_CONFIG, undefined);
  assert.equal(clean.PLANNING_PACK_CHECKOUT_ENABLED, "false");
  assert.equal(clean.SUBMISSION_SEE_CHECKOUT_ENABLED, "false");
});
