import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync("src/app/projects/(authenticated)/page.tsx", "utf8");
const layoutSource = readFileSync("src/components/layouts/authenticated-app-layout.tsx", "utf8");

describe("canonical projects operational UX", () => {
  it("uses a compact planning-focused projects path", () => {
    expect(pageSource).toContain("New site check");
    expect(pageSource).toContain("Projects in this browser");
    expect(pageSource).toContain("Workspaces");
    expect(layoutSource).toContain("Projects in this browser");
  });

  it("removes the previous decorative projects hero and guest greeting claims", () => {
    expect(pageSource).not.toContain("Pick up the next planning decision");
    expect(pageSource).not.toContain("Sites set");
    expect(pageSource).not.toContain("Zoned");
    expect(pageSource).not.toContain("rounded-[1.75rem]");
    expect(pageSource).not.toContain("rounded-2xl");
    expect(pageSource).not.toContain("tracking-[");
    expect(layoutSource).not.toContain("Welcome back Guest");
    expect(layoutSource).not.toContain("invite your team");
  });
});
