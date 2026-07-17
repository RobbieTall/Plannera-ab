import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createFeasibilityArtefact, parseFeasibilityModelJson } from "../src/lib/artefact-service";

describe("parseFeasibilityModelJson", () => {
  it("returns null for non-JSON model output so callers keep feasibility unresolved", () => {
    const result = parseFeasibilityModelJson("The site looks promising, proceed.", "secondary dwelling");
    assert.equal(result, null);
  });

  it("rejects schema-invalid JSON instead of promoting it to success", () => {
    const result = parseFeasibilityModelJson(
      JSON.stringify({
        developmentType: "secondary dwelling",
        overallVerdict: "proceed",
        summary: "Looks fine",
        items: [],
        generatedAt: "2026-07-13T00:00:00.000Z",
      }),
      "secondary dwelling",
    );
    assert.equal(result, null);
  });

  it("accepts valid cited feasibility JSON", () => {
    const result = parseFeasibilityModelJson(
      JSON.stringify({
        developmentType: "commercial",
        overallVerdict: "caution",
        summary: "Cited controls found.",
        items: [
          {
            label: "Permissibility",
            verdict: "caution",
            detail: "Consent required.",
            confidence: "cited",
            source: "Byron LEP 2014 cl. 2.3",
          },
        ],
        generatedAt: "2026-07-13T00:00:00.000Z",
      }),
      "commercial",
    );
    assert.equal(result?.overallVerdict, "caution");
    assert.equal(result?.items[0]?.confidence, "cited");
  });
});

describe("createFeasibilityArtefact", () => {
  it("normalises Kempsey LGA for DCP retrieval and overrides stale model timestamps", async () => {
    const staleModelTimestamp = "2024-06-13T00:00:00.000Z";
    const before = Date.now();
    let statutoryArgs: Record<string, unknown> | null = null;
    let savedPayload: unknown = null;

    const result = await createFeasibilityArtefact(
      "public-project",
      "52 Belgrave St, Kempsey NSW 2440",
      "commercial alterations",
      { lga: "Kempsey Shire", zone: "E2 – Commercial Centre" },
      undefined,
      ({
        prisma: {
          project: {
            findFirst: async () => ({ id: "db-project" }),
            findUnique: async () => ({ id: "db-project" }),
          },
          artefact: {
            findMany: async () => [],
            create: async ({ data }: { data: { payload: unknown } }) => {
              savedPayload = data.payload;
              return { id: "artefact-1" };
            },
          },
        },
        buildStatutoryContextBlock: async (args: Record<string, unknown>) => {
          statutoryArgs = args;
          return {
            dcpClauses: [
              {
                clauseNumber: "KEMPSEY DCP 2026 Part D 1.2",
                heading: "Business and Commercial Development",
                body: "Part D 1.2 applies to E2 Commercial Centre sites; numeric side setbacks are not specified in this excerpt.",
              },
            ],
            lepClauses: [
              {
                clauseKey: "4.3",
                heading: "Height of buildings",
                value: "The height of a building is not to exceed the maximum height shown on the Height of Buildings Map.",
                instrumentName: "Kempsey Local Environmental Plan 2013",
              },
            ],
            seppClauses: [],
            sourceTypes: ["cited"],
            promptBlock:
              "DCP PROVISIONS:\n- [KEMPSEY DCP 2026 Part D 1.2] Business and Commercial Development: applies to E2 Commercial Centre sites.",
          };
        },
        callModel: async (_model: string, messages: Array<{ content: unknown }>) => {
          const prompt = messages.map((message) => String(message.content)).join("\n");
          assert.match(prompt, /KEMPSEY DCP 2026 Part D 1\.2/);
          return JSON.stringify({
            developmentType: "commercial alterations",
            overallVerdict: "caution",
            summary: "DCP context was retrieved, but numeric values remain unavailable.",
            items: [
              {
                label: "DCP controls",
                verdict: "unresolved",
                detail: "Part D 1.2 was retrieved but did not specify numeric side setbacks.",
                confidence: "cited",
                source: "Kempsey DCP 2026 Part D 1.2",
              },
            ],
            generatedAt: staleModelTimestamp,
          });
        },
      } as any),
    );

    assert.equal(result.artefactId, "artefact-1");
    assert.equal(statutoryArgs?.["lgaCode"], "KEMPSEY");
    assert.equal(statutoryArgs?.["siteZone"], "E2 – Commercial Centre");
    assert.notEqual(result.content.generatedAt, staleModelTimestamp);
    assert.ok(new Date(result.content.generatedAt).getTime() >= before);
    assert.equal((savedPayload as { generatedAt?: string }).generatedAt, result.content.generatedAt);
  });
});
