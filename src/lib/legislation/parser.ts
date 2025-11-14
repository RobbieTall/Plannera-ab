import { createHash } from "crypto";
import { parse, type HTMLElement } from "node-html-parser";

import type { InstrumentConfig, ParsedClause } from "./types";

const headingTagNames = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const headingClassPattern = /(heading|title|chapter|part|division|schedule)/i;
const partPattern = /^part\s+(.+)$/i;
const divisionPattern = /^division\s+(.+)$/i;
const subdivisionPattern = /^subdivision\s+(.+)$/i;
const schedulePattern = /^schedule\s+(.+)$/i;
const chapterPattern = /^chapter\s+(.+)$/i;
const clausePattern = /^(clause|section)\s+([0-9A-Za-z.\-]+)(.*)$/i;
const bareNumberPattern = /^((?:\d+[A-Za-z]?)(?:\.\d+[A-Za-z]?)*)(.*)$/;

const normaliseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const computeHash = (value: string) => createHash("sha256").update(value).digest("hex");

const isHeadingElement = (element: HTMLElement) => {
  if (headingTagNames.has(element.tagName)) {
    return true;
  }
  const role = element.getAttribute("role");
  if (role && role.toLowerCase() === "heading") {
    return true;
  }
  const className = element.getAttribute("class");
  return Boolean(className && headingClassPattern.test(className));
};

const extractClauseBody = (heading: HTMLElement) => {
  const fragments: string[] = [];
  const textFragments: string[] = [];
  let pointer = heading.nextElementSibling;
  while (pointer) {
    if (isHeadingElement(pointer as HTMLElement)) {
      break;
    }
    fragments.push(pointer.toString());
    textFragments.push(pointer.text);
    pointer = pointer.nextElementSibling;
  }

  return {
    html: fragments.join("\n").trim(),
    text: normaliseWhitespace(textFragments.join(" ")),
  };
};

interface HeadingContext {
  chapter: string | null;
  part: string | null;
  division: string | null;
  subdivision: string | null;
  schedule: string | null;
}

const initialContext: HeadingContext = {
  chapter: null,
  part: null,
  division: null,
  subdivision: null,
  schedule: null,
};

interface ClauseHeading {
  clauseNumber: string | null;
  clauseTitle: string;
  clauseLabel: string;
}

const parseClauseHeading = (text: string): ClauseHeading | null => {
  const clauseMatch = text.match(clausePattern);
  if (clauseMatch) {
    const clauseNumber = clauseMatch[2];
    const remainder = normaliseWhitespace(clauseMatch[3] ?? "");
    const clauseTitle = normaliseWhitespace([clauseNumber, remainder].filter(Boolean).join(" "));
    const clauseLabel = `${clauseMatch[1].replace(/^\w/, (c) => c.toUpperCase())} ${clauseNumber}`;
    return { clauseNumber, clauseTitle, clauseLabel };
  }

  const bareMatch = text.match(bareNumberPattern);
  if (bareMatch) {
    const clauseNumber = bareMatch[1];
    const remainder = normaliseWhitespace(bareMatch[2] ?? "");
    const clauseTitle = normaliseWhitespace([clauseNumber, remainder].filter(Boolean).join(" "));
    const clauseLabel = `Clause ${clauseNumber}`;
    return { clauseNumber, clauseTitle, clauseLabel };
  }

  return null;
};

const buildClauseKey = (config: InstrumentConfig, clauseHeading: ClauseHeading) => {
  const prefix = config.clausePrefix ?? config.slug.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
  const identifierSource = clauseHeading.clauseNumber ?? clauseHeading.clauseTitle;
  const identifier = identifierSource.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${prefix}_${identifier}`.toUpperCase();
};

const buildHierarchyPath = (context: HeadingContext, clauseLabel: string) => {
  const segments: string[] = [];
  if (context.schedule) {
    segments.push(context.schedule);
  } else {
    if (context.chapter) {
      segments.push(context.chapter);
    }
    if (context.part) {
      segments.push(context.part);
    }
    if (context.division) {
      segments.push(context.division);
    }
    if (context.subdivision) {
      segments.push(context.subdivision);
    }
  }
  segments.push(clauseLabel);
  return segments;
};

const updateContextForHeading = (context: HeadingContext, text: string) => {
  if (schedulePattern.test(text)) {
    context.schedule = text;
    context.chapter = null;
    context.part = null;
    context.division = null;
    context.subdivision = null;
    return true;
  }
  if (chapterPattern.test(text)) {
    context.chapter = text;
    context.part = null;
    context.division = null;
    context.subdivision = null;
    context.schedule = null;
    return true;
  }
  if (partPattern.test(text)) {
    context.part = text;
    context.division = null;
    context.subdivision = null;
    context.schedule = null;
    return true;
  }
  if (divisionPattern.test(text)) {
    context.division = text;
    context.subdivision = null;
    context.schedule = null;
    return true;
  }
  if (subdivisionPattern.test(text)) {
    context.subdivision = text;
    context.schedule = null;
    return true;
  }
  return false;
};

const findContentRoot = (html: string) => {
  const document = parse(html);
  const selectors = [
    "main#content",
    "main#viewLegislation",
    "#viewLegislation",
    "#legislation",
    "article.legislation-body",
    "article",
    "body",
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node) {
      return node as HTMLElement;
    }
  }

  return document as unknown as HTMLElement;
};

export const parseInstrumentDocument = (config: InstrumentConfig, html: string): ParsedClause[] => {
  const contentRoot = findContentRoot(html);
  const headingNodes = contentRoot.querySelectorAll("h1, h2, h3, h4, h5, h6, div, p, section");
  const context: HeadingContext = { ...initialContext };
  const clauses: ParsedClause[] = [];

  headingNodes.forEach((node) => {
    const element = node as HTMLElement;
    if (!isHeadingElement(element)) {
      return;
    }

    const headingText = normaliseWhitespace(element.text);
    if (!headingText) {
      return;
    }

    if (updateContextForHeading(context, headingText)) {
      return;
    }

    const clauseHeading = parseClauseHeading(headingText);
    if (!clauseHeading) {
      return;
    }

    const { html: bodyHtml, text: bodyText } = extractClauseBody(element);
    const clause: ParsedClause = {
      clauseKey: buildClauseKey(config, clauseHeading),
      title: clauseHeading.clauseTitle,
      bodyHtml,
      bodyText,
      hierarchyPath: buildHierarchyPath(context, clauseHeading.clauseLabel),
      contentHash: computeHash(bodyText),
    };
    clauses.push(clause);
  });

  return clauses;
};
