import { createHash, randomUUID } from "node:crypto";

import type { Project } from "@prisma/client";

import {
  type ProposalAttestationEvaluation,
  type ProposalAttestationInput,
} from "@/lib/pathway-proposal-attestation";
import { prisma } from "@/lib/prisma";
import { createProjectForRequester } from "@/lib/projects";

const TARGET_BRANCH = "agent/item74h-pathway-check";
const TARGET_NEON_ENDPOINT_PREFIX = "ep-misty-dream-a7l6wcp8";
const RECORD_VERSION = "pathway-proposal-attestation.v1";
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export type ProposalAttestationPersistence =
  | "PERSISTED_PROTECTED_PREVIEW"
  | "NOT_PERSISTED_OUTSIDE_PROTECTED_PREVIEW";

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value ?? null;
};

const stableJson = (value: unknown) => JSON.stringify(stable(value));

const checkoutEnabled = (
  env: Record<string, string | undefined>,
  variable: string,
) =>
  ENABLED_VALUES.has(env[variable]?.trim().toLowerCase() ?? "");

export function isProtectedProposalAttestationPreview(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (
    env.VERCEL !== "1" ||
    env.VERCEL_ENV !== "preview" ||
    env.VERCEL_GIT_COMMIT_REF !== TARGET_BRANCH
  ) {
    return false;
  }

  if (
    checkoutEnabled(env, "PLANNING_PACK_CHECKOUT_ENABLED") ||
    checkoutEnabled(env, "SUBMISSION_SEE_CHECKOUT_ENABLED")
  ) {
    throw new Error(
      "Proposal attestation persistence refused while checkout is enabled.",
    );
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "Proposal attestation persistence refused without DATABASE_URL.",
    );
  }

  let host: string;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error(
      "Proposal attestation persistence refused for an invalid DATABASE_URL.",
    );
  }

  if (
    !host.startsWith(TARGET_NEON_ENDPOINT_PREFIX) ||
    !host.endsWith(".neon.tech")
  ) {
    throw new Error(
      "Proposal attestation persistence refused outside the approved Preview database.",
    );
  }

  return true;
}

export async function createProjectWithProposalAttestationForRequester({
  sessionId,
  userId,
  title,
  input,
  evaluation,
}: {
  sessionId: string;
  userId?: string | null;
  title: string;
  input: ProposalAttestationInput;
  evaluation: ProposalAttestationEvaluation;
}): Promise<{
  project: Project;
  persistence: ProposalAttestationPersistence;
}> {
  if (!isProtectedProposalAttestationPreview()) {
    return {
      project: await createProjectForRequester(sessionId, userId, title),
      persistence: "NOT_PERSISTED_OUTSIDE_PROTECTED_PREVIEW",
    };
  }

  if (
    evaluation.trust !== "USER_ATTESTED" ||
    evaluation.decision !== "MORE_EVIDENCE_REQUIRED" ||
    evaluation.paidArtefactsEligible !== false
  ) {
    throw new Error(
      "Proposal attestation persistence refused an unsafe evaluation.",
    );
  }

  const resolvedTitle = title.trim() || "Untitled project";
  const inputJson = stableJson(input);
  const evaluationJson = stableJson(evaluation);
  const inputHash = createHash("sha256").update(inputJson).digest("hex");

  const project = await prisma.$transaction(async (transaction) => {
    const createdProject = await transaction.project.create({
      data: {
        title: resolvedTitle,
        name: resolvedTitle,
        sessionId: userId ? null : sessionId,
        property: {
          create: {
            name: resolvedTitle,
            address: null,
          },
        },
        ...(userId ? { owner: { connect: { id: userId } } } : {}),
      },
    });

    await transaction.$executeRaw`
      INSERT INTO "PathwayProposalAttestation" (
        "id",
        "projectId",
        "environment",
        "version",
        "inputHash",
        "input",
        "evaluation",
        "trust",
        "decision",
        "paidArtefactsEligible",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${createdProject.id},
        'PREVIEW',
        ${RECORD_VERSION},
        ${inputHash},
        CAST(${inputJson} AS JSONB),
        CAST(${evaluationJson} AS JSONB),
        'USER_ATTESTED',
        'MORE_EVIDENCE_REQUIRED',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("projectId") DO UPDATE SET
        "version" = EXCLUDED."version",
        "inputHash" = EXCLUDED."inputHash",
        "input" = EXCLUDED."input",
        "evaluation" = EXCLUDED."evaluation",
        "trust" = EXCLUDED."trust",
        "decision" = EXCLUDED."decision",
        "paidArtefactsEligible" = false,
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    return createdProject;
  });

  return {
    project,
    persistence: "PERSISTED_PROTECTED_PREVIEW",
  };
}
