import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoredDcpClause } from "@/lib/dcp/search";

vi.mock("next/headers", () => ({
  cookies: () => ({ get: vi.fn() }),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  NEXT_AUTH_SESSION_COOKIE: { name: "next-auth.session-token" },
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artefact: { create: vi.fn(), findMany: vi.fn() },
    project: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

import {
  DEV_BYPASS_USER_ID,
  buildDcpSectionPromptBlock,
  createMapSnapshotArtefact,
  loadDcpClausesForSections,
  requireSessionUser,
} from "@/lib/artefact-service";
import { getDCPContext } from "@/lib/dcp/get-dcp-context";
import { getServerSession } from "next-auth";


const originalAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED;
const getServerSessionMock = vi.mocked(getServerSession);

beforeEach(() => {
  vi.clearAllMocks();
  if (originalAuthEnabled === undefined) {
    delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = originalAuthEnabled;
  }
});

const makeClause = (
  overrides: Partial<ScoredDcpClause> = {},
): ScoredDcpClause =>
  ({
    id: "clause-1",
    lgaCode: "BYRON",
    instrumentSlug: "byron-dcp-2014",
    ref: "D1.2",
    title: "Setbacks",
    headingPath: ["Chapter D", "Residential controls", "Setbacks"],
    parentRef: null,
    depth: 3,
    bodyHtml: "",
    bodyText:
      "Front setbacks must be compatible with the streetscape and side setbacks must protect amenity.",
    topicTags: ["setbacks"],
    numericMeta: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    score: 42,
    ...overrides,
  }) as ScoredDcpClause;


describe("requireSessionUser", () => {
  it("returns a dev bypass user when auth is not explicitly enabled", async () => {
    delete process.env.NEXT_PUBLIC_AUTH_ENABLED;

    await expect(requireSessionUser()).resolves.toEqual({
      userId: "dev-bypass-user",
    });
    expect(getServerSessionMock).not.toHaveBeenCalled();
  });

  it("requires a real session when auth is explicitly enabled", async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
    getServerSessionMock.mockResolvedValueOnce(null);

    await expect(requireSessionUser()).rejects.toMatchObject({
      message: "Authentication required",
      status: 401,
    });
    expect(getServerSessionMock).toHaveBeenCalled();
  });
});


describe("dev bypass project access", () => {
  it("looks up projects by ID only for the dev bypass user", async () => {
    const project = { id: "project-db-id", publicId: "project-public-id" };
    const artefact = { id: "artefact-id" };
    const projectFindFirst = vi
      .fn()
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce({ id: project.id });
    const artefactCreate = vi.fn().mockResolvedValueOnce(artefact);
    const saveFile = vi.fn().mockResolvedValueOnce({ url: "/uploads/map.png" });
    const formData = new FormData();
    formData.set("file", new File(["image"], "map.png", { type: "image/png" }));
    formData.set("projectId", project.publicId);
    formData.set("title", "Map snapshot");
    formData.set("source", "Planning portal");

    await expect(
      createMapSnapshotArtefact({
        formData,
        projectId: project.publicId,
        userId: DEV_BYPASS_USER_ID,
        deps: {
          prisma: {
            project: { findFirst: projectFindFirst, findUnique: vi.fn() },
            artefact: { create: artefactCreate, findMany: vi.fn() },
          },
          saveFile,
        },
      }),
    ).resolves.toBe(artefact);

    expect(projectFindFirst).toHaveBeenNthCalledWith(1, {
      where: { OR: [{ publicId: project.publicId }, { id: project.publicId }] },
    });
    expect(projectFindFirst).toHaveBeenNthCalledWith(2, {
      where: { id: project.id },
      select: { id: true },
    });
    expect(artefactCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: project.id }),
      }),
    );
  });
});

describe("buildDcpSectionPromptBlock", () => {
  it("formats DCP clauses as inline DCP sources with source titles", () => {
    const block = buildDcpSectionPromptBlock([makeClause()], "Setbacks");

    expect(block).toBe(
      "## Retrieved DCP source text for Setbacks\n" +
        "DCP Source — [Setbacks]: Front setbacks must be compatible with the streetscape and side setbacks must protect amenity.",
    );
  });

  it("returns an empty string when no clauses are provided", () => {
    expect(buildDcpSectionPromptBlock([], "Parking")).toBe("");
  });
});

describe("loadDcpClausesForSections", () => {
  it("returns DCP clauses keyed by SEE section id", async () => {
    const setbacksClause = makeClause({ id: "setbacks-clause", ref: "D1.2" });
    const parkingClause = makeClause({
      id: "parking-clause",
      ref: "B4.1",
      title: "Car parking",
      topicTags: ["parking"],
    });
    const mockGetDCPContext = vi
      .fn<typeof getDCPContext>()
      .mockResolvedValueOnce([setbacksClause])
      .mockResolvedValueOnce([parkingClause]);

    const result = await loadDcpClausesForSections(mockGetDCPContext, "BYRON", [
      { id: "setbacks", label: "Setbacks", query: "setback building line" },
      { id: "parking", label: "Car Parking", query: "parking car space" },
    ]);

    expect(mockGetDCPContext).toHaveBeenCalledWith(
      "BYRON",
      "setback building line",
    );
    expect(mockGetDCPContext).toHaveBeenCalledWith(
      "BYRON",
      "parking car space",
    );
    expect(result.get("setbacks")).toEqual([setbacksClause]);
    expect(result.get("parking")).toEqual([parkingClause]);
  });

  it("returns an empty map when DCP lookup fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const mockGetDCPContext = vi
      .fn<typeof getDCPContext>()
      .mockRejectedValue(new Error("DCP unavailable"));

    const result = await loadDcpClausesForSections(mockGetDCPContext, "BYRON", [
      { id: "height", label: "Building Height", query: "height storey" },
    ]);

    expect(result.size).toBe(0);
    expect(consoleError).toHaveBeenCalledWith(
      "[artefact-service] failed to load section DCP clauses",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
