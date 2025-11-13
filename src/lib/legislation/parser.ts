import { createHash } from "crypto";
import fs from "fs/promises";
import { parse } from "node-html-parser";
import { fileURLToPath } from "url";

import type { InstrumentConfig, ParsedClause } from "./types";

const isHeading = (nodeName: string) => /^h[1-6]$/i.test(nodeName);

const normaliseClauseText = (text: string) => text.replace(/\s+/g, " ").trim();

const buildClauseKey = (config: InstrumentConfig, headingText: string) => {
  const normalised = normaliseClauseText(headingText)
    .replace(/[^\w\d]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const prefix = config.clausePrefix ?? config.slug.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
  return `${prefix}_${normalised}`;
};

const computeHash = (value: string) =>
  createHash("sha256")
    .update(value)
    .digest("hex");

const buildClauseBody = (heading: ReturnType<typeof parse>) => {
  const fragments: string[] = [heading.toString()];
  const textFragments: string[] = [heading.text];

  let pointer = heading.nextElementSibling;
  while (pointer && !isHeading(pointer.tagName)) {
    fragments.push(pointer.toString());
    textFragments.push(pointer.text);
    pointer = pointer.nextElementSibling;
  }

  return {
    html: fragments.join("\n"),
    text: normaliseClauseText(textFragments.join(" ")),
  };
};

const extractHierarchy = (headingText: string): string[] => {
  const components = headingText.split(/-|–|\u2014/).map((part) => normaliseClauseText(part));
  return components.filter(Boolean);
};

export const fetchInstrumentDocument = async (sourceUrl: string) => {
  if (sourceUrl.startsWith("file://")) {
    const filePath = fileURLToPath(sourceUrl);
    return fs.readFile(filePath, "utf-8");
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch instrument from ${sourceUrl}: ${response.status} ${response.statusText}`);
  }

  return response.text();
};

export const parseInstrumentDocument = (config: InstrumentConfig, document: string): ParsedClause[] => {
  const root = parse(document);
  const headings = root.querySelectorAll("h2, h3, h4");
  const clauses: ParsedClause[] = [];

  headings.forEach((heading) => {
    const headingText = normaliseClauseText(heading.text);
    if (!headingText) {
      return;
    }

    const clauseKey = buildClauseKey(config, headingText);
    const { html, text } = buildClauseBody(heading);
    const clause: ParsedClause = {
      clauseKey,
      title: headingText,
      bodyHtml: html,
      bodyText: text,
      hierarchyPath: extractHierarchy(headingText),
      contentHash: computeHash(text),
    };
    clauses.push(clause);
  });

  return clauses;
};
