import assert from "node:assert/strict";
import test from "node:test";

import {
  ConsultantReturnedReportBindingError,
  createConsultantReturnedReportBinding,
  markConsultantReturnedReportBoundForEvidencePackage,
} from "../src/lib/consultant-returned-report-binding";

const receivedAt = new Date("2026-09-24T01:00:00.000Z");

const referral = {
  id: "referral_123456",
  projectId: "project_123456",
  scopeKey: "scope_123456",
  packageDigest: "a".repeat(64),
  packageSnapshot: {
    reviewRequest: {
      disciplinePackages: [
        { disciplineId: "traffic_transport" },
        { disciplineId: "town_planning" },
      ],
    },
  },
  status: "CONSULTANT_ACKNOWLEDGED" as const,
  events: [
    { toStatus: "SUBMITTED" as const },
    { toStatus: "ACKNOWLEDGED" as const },
    { toStatus: "ASSIGNED" as const },
    { toStatus: "CONSULTANT_ACKNOWLEDGED" as const },
  ],
};

const input = {
  referralId: referral.id,
  evidenceRef: "ev_1234567890abcdef",
  disciplineId: "traffic_transport",
  contentHash: "b".repeat(64),
  receivedAt,
};

const makeDeps = () => {
  const bindings: Array<any> = [];
  const client = {
    consultantReferral: {
      findFirst: async ({ where }: any) => where.id === referral.id ? structuredClone(referral) : null,
    },
    consultantReturnedReportBinding: {
      findFirst: async ({ where }: any) =>
        bindings.find((row) => row.evidenceRef === where.evidenceRef) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: `binding_${bindings.length + 1}`,
          ...data,
          evidencePackageBoundAt: null,
        };
        bindings.push(row);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const row = bindings.find((candidate) =>
          candidate.referralId === where.referralId &&
          candidate.evidenceRef === where.evidenceRef &&
          candidate.projectId === where.projectId &&
          candidate.disciplineId === where.disciplineId &&
          candidate.contentHash === where.contentHash &&
          candidate.evidencePackageBoundAt === null
        );
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  };
  return { deps: { prisma: client } as any, bindings, client };
};

test("persists only privacy-minimal exact-scope returned-report binding metadata", async () => {
  const { deps, bindings } = makeDeps();

  const result = await createConsultantReturnedReportBinding(input, deps);

  assert.equal(result.created, true);
  assert.equal(result.binding.referralId, referral.id);
  assert.equal(result.binding.projectId, referral.projectId);
  assert.equal(result.binding.disciplineId, "traffic_transport");
  assert.equal(result.binding.referralScopeKey, referral.scopeKey);
  assert.equal(result.binding.packageDigest, referral.packageDigest);
  assert.equal(bindings.length, 1);
  assert.equal("contactName" in bindings[0], false);
  assert.equal("contactEmail" in bindings[0], false);
  assert.equal("fileName" in bindings[0], false);
  assert.equal("reportText" in bindings[0], false);
});

test("is idempotent for the exact same opaque evidence binding", async () => {
  const { deps, bindings } = makeDeps();

  const first = await createConsultantReturnedReportBinding(input, deps);
  const replay = await createConsultantReturnedReportBinding(input, deps);

  assert.equal(first.binding.id, replay.binding.id);
  assert.equal(replay.created, false);
  assert.equal(bindings.length, 1);
});

test("rejects a returned report before referral delivery history exists", async () => {
  const { deps, client, bindings } = makeDeps();
  client.consultantReferral.findFirst = async () => ({
    ...structuredClone(referral),
    status: "ACKNOWLEDGED",
    events: [{ toStatus: "SUBMITTED" }, { toStatus: "ACKNOWLEDGED" }],
  }) as any;

  await assert.rejects(
    createConsultantReturnedReportBinding(input, deps),
    (error) => {
      assert.ok(error instanceof ConsultantReturnedReportBindingError);
      assert.equal(error.status, 409);
      assert.match(error.message, /has not been delivered/);
      return true;
    },
  );
  assert.equal(bindings.length, 0);
});

test("rejects disciplines not requested by the immutable referral package", async () => {
  const { deps, bindings } = makeDeps();

  await assert.rejects(
    createConsultantReturnedReportBinding(
      { ...input, disciplineId: "ecology" },
      deps,
    ),
    /discipline was not requested/,
  );
  assert.equal(bindings.length, 0);
});

test("rejects closed referrals and cross-scope evidence-reference reuse", async () => {
  const closed = makeDeps();
  closed.client.consultantReferral.findFirst = async () => ({
    ...structuredClone(referral),
    status: "CLOSED",
  }) as any;
  await assert.rejects(
    createConsultantReturnedReportBinding(input, closed.deps),
    /closed to returned reports/,
  );

  const conflict = makeDeps();
  conflict.bindings.push({
    id: "binding_existing",
    referralId: "referral_other",
    projectId: "project_other",
    evidenceRef: input.evidenceRef,
    disciplineId: input.disciplineId,
    contentHash: input.contentHash,
    referralScopeKey: "scope_other",
    packageDigest: "c".repeat(64),
    receivedAt,
    evidencePackageBoundAt: null,
  });
  await assert.rejects(
    createConsultantReturnedReportBinding(input, conflict.deps),
    /different referral scope/,
  );
});

test("marks the exact report bound to the evidence package idempotently", async () => {
  const { deps, bindings } = makeDeps();
  const created = await createConsultantReturnedReportBinding(input, deps);
  const boundAt = new Date("2026-09-24T01:30:00.000Z");

  await markConsultantReturnedReportBoundForEvidencePackage({
    referralId: created.binding.referralId,
    evidenceRef: created.binding.evidenceRef,
    projectId: created.binding.projectId,
    disciplineId: created.binding.disciplineId,
    contentHash: created.binding.contentHash,
    boundAt,
  }, deps);
  await markConsultantReturnedReportBoundForEvidencePackage({
    referralId: created.binding.referralId,
    evidenceRef: created.binding.evidenceRef,
    projectId: created.binding.projectId,
    disciplineId: created.binding.disciplineId,
    contentHash: created.binding.contentHash,
    boundAt,
  }, deps);

  assert.equal(bindings[0].evidencePackageBoundAt.toISOString(), boundAt.toISOString());
});
