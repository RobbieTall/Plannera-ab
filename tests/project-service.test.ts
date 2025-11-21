import assert from "node:assert/strict";
import test from "node:test";

import { ensureProjectExists, logExistingProjects } from "@/lib/project-service";

class MockPrisma {
  projects: any[] = [];
  properties: any[] = [];

  project = {
    findFirst: async ({ where }: any) => {
      const lookupId =
        where?.id ??
        where?.OR?.find((clause: any) => clause.publicId)?.publicId ??
        where?.OR?.find((clause: any) => clause.id)?.id;
      return this.projects.find((project) => project.publicId === lookupId || project.id === lookupId) ?? null;
    },
    create: async ({ data }: any) => {
      const record = { id: data.id ?? `proj-${this.projects.length + 1}`, ...data };
      this.projects.push(record);
      return record;
    },
    update: async ({ where, data }: any) => {
      const existing = this.projects.find((project) => project.id === where.id);
      if (!existing) throw new Error("not found");
      Object.assign(existing, data);
      return existing;
    },
    findMany: async ({ select }: any) =>
      this.projects.map((project) =>
        Object.fromEntries(Object.keys(select).map((key) => [key, (project as any)[key]])),
      ),
  };

  property = {
    create: async ({ data }: any) => {
      const record = { id: `prop-${this.properties.length + 1}`, ...data };
      this.properties.push(record);
      return record;
    },
  };
}

test("ensures a project is created with a matching publicId", async () => {
  const prisma = new MockPrisma();

  const project = await ensureProjectExists(
    {
      publicId: "proj-demo",
      name: "Demo project",
      description: "Created for tests",
      propertyName: "Demo property",
    },
    { prisma: prisma as any },
  );

  assert.equal(project.publicId, "proj-demo");
  assert.equal(project.name, "Demo project");
  assert.equal(prisma.properties[0]?.name, "Demo property");
});

test("updates existing projects to align their publicId", async () => {
  const prisma = new MockPrisma();
  prisma.projects.push({ id: "legacy-id", publicId: "old-id", name: "Legacy" });

  const project = await ensureProjectExists(
    { id: "legacy-id", publicId: "proj-new", name: "Legacy" },
    { prisma: prisma as any },
  );

  assert.equal(project.id, "legacy-id");
  assert.equal(project.publicId, "proj-new");
  assert.equal(prisma.projects[0]?.publicId, "proj-new");
});

test("logs existing projects for debugging", async () => {
  const prisma = new MockPrisma();
  prisma.projects.push({ id: "proj-1", publicId: "proj-1", name: "Existing" });

  const projects = await logExistingProjects({ prisma: prisma as any });

  assert.equal(projects.length, 1);
  assert.equal(projects[0]?.publicId, "proj-1");
});
