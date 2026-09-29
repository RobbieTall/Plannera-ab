import assert from "node:assert/strict";
import test from "node:test";
import {
  loadSavedWorkingSeeGeneration,
  type WorkingSeeSourceDatabase,
} from "../src/lib/see-document-generation-source-loader";
import { WorkingSeeSourceError } from "../src/lib/see-document-generation-sources";

const scope = {
  actorId: "test-owner", projectId: "test-project",
  sourceDetailedPlanningPackArtefactId: "test-dpp", sourceMemoArtefactId: "test-memo",
};
const baseProject = {
  id: scope.projectId, userId: scope.actorId, createdById: scope.actorId,
  isDemo: false, siteContext: { id: "test-site" },
};

// These intentionally stop at the loader's first authorization boundary.
// They do NOT mock a successful source join or claim the full Prisma path works.
const deniedProjects = [
  { name: "missing project", project: null },
  { name: "substituted project", project: { ...baseProject, id: "different-project" } },
  { name: "former creator who is not current owner", project: { ...baseProject, userId: "another-owner" } },
  { name: "demo fixture", project: { ...baseProject, isDemo: true } },
  { name: "missing confirmed site", project: { ...baseProject, siteContext: null } },
];

for (const example of deniedProjects) {
  test("database loader rejects " + example.name + " before source or purchase access", async () => {
    const queries: unknown[] = [];
    const client = new Proxy({
      project: {
        findFirst: async (query: unknown) => { queries.push(query); return example.project; },
      },
    }, {
      get(target, property) {
        if (property !== "project") throw new Error("Unexpected access beyond project authorization");
        return target.project;
      },
    }) as unknown as WorkingSeeSourceDatabase;
    await assert.rejects(
      loadSavedWorkingSeeGeneration(client, scope, new Date("2026-09-29T02:00:00Z")),
      (error: unknown) => error instanceof WorkingSeeSourceError && error.code === "source_scope_mismatch",
    );
    assert.deepEqual(queries, [{
      where: {
        id: scope.projectId,
        OR: [{ userId: scope.actorId }, { createdById: scope.actorId }],
      },
      include: { siteContext: true },
    }]);
  });
}
