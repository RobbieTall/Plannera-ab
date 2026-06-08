import { describe, expect, it } from "vitest";

import { generateSuggestions } from "./suggestion-chips";

describe("generateSuggestions", () => {
  it("returns an empty array for short content under 100 characters", () => {
    expect(generateSuggestions("What are the risks? Too short.")).toEqual([]);
  });

  it("extracts clear questions and trims them to 80 characters", () => {
    const content =
      "The site has several planning considerations that should be checked before lodgement. " +
      "What are the exact front, side, and rear setback requirements for this proposal in the relevant DCP? " +
      "Could council require extra shadow diagrams? " +
      "The answer should remain practical.";

    const suggestions = generateSuggestions(content);

    expect(suggestions).toEqual([
      "What are the exact front, side, and rear setback requirements for this...",
      "Could council require extra shadow diagrams?",
    ]);
    expect(suggestions[0].length).toBeLessThanOrEqual(80);
  });

  it("extracts sentences that start with If as suggestions", () => {
    const content =
      "A staged pathway may help manage planning risk while the design is refined. " +
      "If the site has sensitive neighbours, prepare a targeted impact assessment early. " +
      "If the building envelope changes, re-check the relevant controls before lodgement.";

    expect(generateSuggestions(content)).toEqual([
      "If the site has sensitive neighbours, prepare a targeted impact assessment...",
      "If the building envelope changes, re-check the relevant controls before...",
    ]);
  });

  it("returns a maximum of 3 suggestions", () => {
    const content =
      "The planning pathway should be narrowed before detailed design proceeds. " +
      "What are the site constraints? How should staging work? When should council be contacted? " +
      "Where are the unresolved approval risks? Why might public notification be required?";

    expect(generateSuggestions(content)).toEqual([
      "What are the site constraints?",
      "How should staging work?",
      "When should council be contacted?",
    ]);
  });

  it("returns a relevant fallback question for setbacks keyword content", () => {
    const content =
      "The proposal should be checked against the local planning controls before concept design is fixed. " +
      "The assistant response mentions setbacks and building separation but does not include a direct follow-up question.";

    expect(generateSuggestions(content)).toEqual(["What are the setback requirements?"]);
  });

  it("returns an empty array when content has no matching patterns or keyword fallbacks", () => {
    const content =
      "The response provides a concise summary of the project status and describes the next internal step. " +
      "It avoids planning control terminology and does not include interrogative wording or prompt-like sentence starts.";

    expect(generateSuggestions(content)).toEqual([]);
  });

  it("is pure and deterministic for the same input", () => {
    const content =
      "The DCP and LEP controls should be reviewed together before advice is issued. " +
      "Should the team confirm the applicable controls with council? " +
      "What parking provisions apply?";

    expect(generateSuggestions(content)).toEqual(generateSuggestions(content));
  });
});
