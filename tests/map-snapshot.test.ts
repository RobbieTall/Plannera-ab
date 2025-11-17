import assert from "node:assert/strict";
import test from "node:test";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createMapSnapshotArtefact,
} from "@/lib/artefact-service";

class MockPrisma {
  artefacts: any[] = [];
  constructor(private projectMembers: Record<string, string[]>) {}

  project = {
    findFirst: async ({ where }: any) => {
      const members = this.projectMembers[where.id] ?? [];
      const ownerId = where.OR?.[0]?.createdById;
      const collaboratorId = where.OR?.[1]?.collaborators?.some?.userId;

      if ((ownerId && members.includes(ownerId)) || (collaboratorId && members.includes(collaboratorId))) {
        return { id: where.id };
      }

      return undefined;
    },
  };

  artefact = {
    create: async ({ data }: any) => {
      const artefact = { id: `art-${this.artefacts.length + 1}`, ...data };
      this.artefacts.push(artefact);
      return artefact;
    },
    findMany: async ({ where }: any) => this.artefacts.filter((item) => item.projectId === where.projectId),
  };
}

const mockSaveFile = async (file: File) => ({
  url: `/mock/${file.name}`,
  path: `/tmp/${file.name}`,
  mimeType: file.type,
  size: file.size,
});

test("creates a map_snapshot artefact with overlays and notes", async () => {
  const prisma = new MockPrisma({
    "proj-1": ["user-1"],
  });

  const formData = new FormData();
  formData.set("projectId", "proj-1");
  formData.set("title", "Flood overlays");
  formData.set("source", "NSW Spatial Viewer");
  formData.set("sourceUrl", "https://example.com/viewer");
  formData.append("overlays", "flood");
  formData.append("overlays", "bushfire");
  formData.set("notes", "Captured after latest council update");
  formData.set("file", new File(["image-bytes"], "snapshot.png", { type: "image/png" }));

  const artefact = await createMapSnapshotArtefact({
    formData,
    projectId: "proj-1",
    userId: "user-1",
    deps: { prisma, saveFile: mockSaveFile },
  });

  assert.equal(artefact.type, "map_snapshot");
  assert.equal(artefact.title, "Flood overlays");
  assert.deepEqual(artefact.overlays, ["flood", "bushfire"]);
  assert.equal(artefact.imageUrl, "/mock/snapshot.png");
  assert.ok(artefact.capturedAt instanceof Date);
});

test("rejects creation when project access is missing", async () => {
  const prisma = new MockPrisma({ "proj-1": ["different-user"] });
  const formData = new FormData();
  formData.set("projectId", "proj-1");
  formData.set("title", "Flood overlays");
  formData.set("source", "NSW Spatial Viewer");
  formData.set("file", new File(["image-bytes"], "snapshot.png", { type: "image/png" }));

  await assert.rejects(
    () =>
      createMapSnapshotArtefact({
        formData,
        projectId: "proj-1",
        userId: "user-1",
        deps: { prisma, saveFile: mockSaveFile },
      }),
    (error) => {
      assert.ok(error instanceof ArtefactAccessError);
      return true;
    },
  );
});

test("validates that an image file is required", async () => {
  const prisma = new MockPrisma({ "proj-1": ["user-1"] });
  const formData = new FormData();
  formData.set("projectId", "proj-1");
  formData.set("title", "Flood overlays");
  formData.set("source", "NSW Spatial Viewer");

  await assert.rejects(
    () =>
      createMapSnapshotArtefact({
        formData,
        projectId: "proj-1",
        userId: "user-1",
        deps: { prisma, saveFile: mockSaveFile },
      }),
    (error) => {
      assert.ok(error instanceof ArtefactValidationError);
      return true;
    },
  );
});
