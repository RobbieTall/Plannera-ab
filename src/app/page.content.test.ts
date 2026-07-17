import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/page.tsx", "utf8") + readFileSync("src/lib/landing-entry.ts", "utf8");

describe("homepage commercial entry copy", () => {
  it("renders literal Quick Site Check address entry and honest pilot/DPP copy", () => {
    expect(source).toContain("Plannera Quick Site Check");
    expect(source).toContain("Site address");
    expect(source).toContain("Run free site check");
    expect(source).toContain("45 Broken Head Road, Byron Bay NSW 2481");
    expect(source).toContain("52 Belgrave St, Kempsey NSW 2440");
    expect(source).not.toContain("32 Smith St, Kempsey NSW 2440");
    expect(source).toContain("cited NSW planning checks for the Byron and Kempsey launch path");
    expect(source).toContain("proposal-specific DCP detail follows in the Detailed Planning Pack");
    expect(source).toContain("not legal or professional planning advice");
  });

  it("does not include generic or fabricated readiness claims", () => {
    expect(source).not.toContain("Generate pathway");
    expect(source).not.toContain("Mixed-use development in Australia");
    expect(source).not.toContain("Live monitoring across NSW, QLD & VIC");
    expect(source).not.toContain("Consultant directory");
    expect(source).not.toContain("Workspace preview");
    expect(source).not.toContain("Low-med");
    expect(source).not.toContain("6-10 wk");
    expect(source).not.toContain("8 items");
  });
});


describe("Item 63 documented launch scope", () => {
  it("uses the Kempsey E2 golden address and not the SP2 truth case", () => {
    const buildNext = readFileSync("docs/project-memory/build-next.md", "utf8");
    const item63 = buildNext.slice(buildNext.indexOf("## 63) Address-First"));
    expect(item63).toContain("52 Belgrave St, Kempsey NSW 2440");
    expect(item63).not.toContain("32 Smith St, Kempsey NSW 2440");
  });
});
