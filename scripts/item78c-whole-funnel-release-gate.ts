import { readFileSync } from "node:fs";

import {
  ITEM78C_SEE_COMPILER_VERSION,
  holdItem78cWholeFunnelSummary,
  summarizeItem78cWholeFunnelAcceptance,
  type Item78cConsultantReferralEvidence,
  type Item78cCouncil,
  type Item78cSeeCompilerEvidence,
} from "../src/lib/item78c-whole-funnel-acceptance";
import type { Item78aDurableCommercialBridgeSummary } from "../src/lib/item78a-durable-commercial-bridge";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJson = (name: string): unknown => {
  const path = process.env[name];
  if (!path) throw new Error("missing");
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
};

const readBridge = (name: string): Item78aDurableCommercialBridgeSummary => {
  const value = readJson(name);
  if (
    !isRecord(value) ||
    value.runnerVersion !== "item78a-durable-commercial-bridge.v1" ||
    typeof value.passed !== "boolean" ||
    !isRecord(value.checks) ||
    typeof value.failedCheck !== "string" && value.failedCheck !== null ||
    value.productionCheckoutEnabled !== false ||
    value.productionMutationPerformed !== false ||
    value.syntheticOnly !== true ||
    value.containsSensitiveValues !== false
  ) {
    throw new Error("invalid");
  }
  return value as Item78aDurableCommercialBridgeSummary;
};

const readCompiler = (): Item78cSeeCompilerEvidence => {
  const value = readJson("ITEM78C_SEE_COMPILER_SUMMARY");
  if (
    !isRecord(value) ||
    value.runnerVersion !== ITEM78C_SEE_COMPILER_VERSION ||
    !isRecord(value.checks) ||
    Object.values(value.checks).some((check) => typeof check !== "boolean")
  ) {
    throw new Error("invalid");
  }
  return value as Item78cSeeCompilerEvidence;
};

const readReferral = (): Item78cConsultantReferralEvidence => {
  const value = readJson("ITEM78C_CONSULTANT_REFERRAL_SUMMARY");
  if (
    !isRecord(value) ||
    value.runnerVersion !== "consultant_referral_acceptance.v1" ||
    typeof value.passed !== "boolean" ||
    !(typeof value.reason === "string" || value.reason === null) ||
    !isRecord(value.checks) ||
    !Array.isArray(value.statuses) ||
    value.statuses.some((status) => typeof status !== "string") ||
    value.containsSensitiveValues !== false
  ) {
    throw new Error("invalid");
  }
  return value as Item78cConsultantReferralEvidence;
};

const readConsultantCouncil = (): Item78cCouncil => {
  const value = process.env.ITEM78C_CONSULTANT_COUNCIL;
  if (value !== "BYRON" && value !== "KEMPSEY") throw new Error("invalid");
  return value;
};

function main() {
  try {
    const consultantCouncil = readConsultantCouncil();
    const compiler = readCompiler();
    const byron = readBridge("ITEM78C_BYRON_BRIDGE_SUMMARY");
    const kempsey = readBridge("ITEM78C_KEMPSEY_BRIDGE_SUMMARY");
    const referral = readReferral();
    const facts = {
      journeys: [
        {
          council: "BYRON" as const,
          role:
            consultantCouncil === "BYRON"
              ? ("CONSULTANT_REFERRAL" as const)
              : ("DIRECT_SEE" as const),
          protectedPreviewFixture: true,
          persistedProject: true,
          authoritativeLineage: {
            quickSiteCheck: true,
            detailedPlanningPack: true,
            workingSee: true,
          },
          commercialBridge: byron,
          seeCompiler: compiler,
        },
        {
          council: "KEMPSEY" as const,
          role:
            consultantCouncil === "KEMPSEY"
              ? ("CONSULTANT_REFERRAL" as const)
              : ("DIRECT_SEE" as const),
          protectedPreviewFixture: true,
          persistedProject: true,
          authoritativeLineage: {
            quickSiteCheck: true,
            detailedPlanningPack: true,
            workingSee: true,
          },
          commercialBridge: kempsey,
          seeCompiler: compiler,
        },
      ],
      consultantReferral: referral,
      safety: {
        productionCheckoutDisabled: true,
        productionMutationPerformed: false as const,
        containsSensitiveValues: false as const,
      },
    };
    const summary = summarizeItem78cWholeFunnelAcceptance(facts);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (!summary.passed) process.exitCode = 1;
  } catch {
    process.stdout.write(
      `${JSON.stringify(holdItem78cWholeFunnelSummary("evidence_files"))}\n`,
    );
    process.exitCode = 1;
  }
}

main();
