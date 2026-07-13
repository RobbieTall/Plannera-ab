import type { ReviewRequestContent } from "@/types/workspace";

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
  return trimmed;
};

const uniqueClean = (values: unknown[] = []): string[] => {
  return Array.from(new Set(values.map(clean).filter((value): value is string => Boolean(value))));
};

const pushField = (lines: string[], label: string, value: unknown) => {
  const text = clean(value);
  if (text) lines.push(`${label}: ${text}`);
};

const pushList = (lines: string[], heading: string, items: unknown[]) => {
  const values = uniqueClean(items);
  if (!values.length) return;
  lines.push(heading);
  lines.push("-".repeat(heading.length));
  values.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
};

export function formatReviewRequestHandoff(content: ReviewRequestContent): string {
  const lines: string[] = [];
  lines.push("EXPERT REVIEW REQUEST");
  lines.push("=".repeat(60));
  pushField(lines, "Project/site address", content.site?.address);
  pushField(lines, "LGA", content.site?.lga);
  pushField(lines, "Zone", content.site?.zoneLabel);
  pushField(lines, "Generated/requested", content.generatedAt);

  const summary = clean(content.packageSummary);
  if (summary) {
    lines.push("");
    lines.push("Package summary");
    lines.push("---------------");
    lines.push(summary);
  }

  const artefacts = (content.includedArtefacts ?? [])
    .map((artefact) => {
      const parts = [clean(artefact.title), clean(artefact.type), clean(artefact.generatedAt)].filter(Boolean);
      return parts.join(" · ");
    })
    .filter(Boolean);
  pushList(lines, "Included/source artefacts", artefacts);

  const citationLabels = (content.citedSources ?? [])
    .map((source) => {
      const ref = clean(source.ref);
      const type = clean(source.type);
      if (!ref) return null;
      return type ? `${ref} (${type})` : ref;
    })
    .filter((value): value is string => Boolean(value));
  if (citationLabels.length) {
    lines.push("Source citations");
    lines.push("----------------");
    lines.push(`Citation count: ${citationLabels.length}`);
    citationLabels.forEach((label) => lines.push(`- ${label}`));
    lines.push("");
  }

  pushList(lines, "Confidence gaps", content.confidenceGaps ?? []);
  pushList(lines, "Missing inputs", content.missingInputs ?? []);
  pushList(lines, "Assumptions", content.assumptions ?? []);
  pushList(lines, "Recommended planner review scope", content.recommendedReviewScope ?? []);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export function reviewRequestFilename(content: ReviewRequestContent): string {
  const base = clean(content.site?.address) ?? clean(content.projectId) ?? "project";
  const slug = base.replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "project";
  return `review-request-${slug}.txt`;
}
