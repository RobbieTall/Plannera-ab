import { createHash } from "crypto";
import { parse, type HTMLElement, type Node } from "node-html-parser";

import type { InstrumentConfig, InstrumentFetchResult, ParsedClause } from "./types";

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

const blockLikeTags = new Set([
  "p",
  "div",
  "section",
  "block",
  "tier",
  "list",
  "ul",
  "ol",
  "li",
  "pre",
  "row",
  "entry",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
]);

type ParsedTableRow = { cells: string[]; isHeader: boolean };

const renderTableToMarkdown = (table: HTMLElement): string => {
  const rows = table.querySelectorAll("row, tr");
  if (!rows.length) {
    return normaliseWhitespace(table.text || "");
  }

  const parsedRows: ParsedTableRow[] = [];

  rows.forEach((row) => {
    const element = row as HTMLElement;
    const cells = element.querySelectorAll("entry, th, td");
    if (!cells.length) {
      return;
    }

    const cellTexts = cells
      .map((cell) => normaliseWhitespace((cell as HTMLElement).text || ""))
      .filter(Boolean);
    if (!cellTexts.length) {
      return;
    }

    const parentTag = ((element.parentNode as HTMLElement | null)?.tagName || "").toLowerCase();
    const isHeader = parentTag === "thead" || cells.every((cell) => (cell as HTMLElement).tagName?.toLowerCase() === "th");

    parsedRows.push({ cells: cellTexts, isHeader });
  });

  if (!parsedRows.length) {
    return normaliseWhitespace(table.text || "");
  }

  const headerIndex = parsedRows.findIndex((row) => row.isHeader);
  const headerRow = parsedRows[headerIndex >= 0 ? headerIndex : 0];
  const bodyRows = parsedRows.filter((_, index) => index !== (headerIndex >= 0 ? headerIndex : 0));

  const lines: string[] = ["Table:"];
  if (headerRow.cells.length) {
    lines.push(headerRow.cells.join(" | "));
    lines.push(headerRow.cells.map(() => "---").join(" | "));
  }

  bodyRows.forEach((row) => {
    lines.push(row.cells.join(" | "));
  });

  return lines.join("\n").trim();
};

const serialiseNodeToText = (node: Node): string => {
  const element = node as HTMLElement;
  if (element?.tagName) {
    const tag = element.tagName.toLowerCase();
    if (tag === "table") {
      return renderTableToMarkdown(element);
    }

    const childTexts = element.childNodes.map((child) => serialiseNodeToText(child)).filter(Boolean);
    if (!childTexts.length) {
      return "";
    }

    const separator = blockLikeTags.has(tag) ? "\n" : " ";
    const joined = childTexts.join(separator).trim();

    if (!joined) {
      return "";
    }

    if (tag === "li") {
      return `- ${joined}`;
    }

    return joined;
  }

  return normaliseWhitespace((node as HTMLElement).text || (node as { rawText?: string }).rawText || "");
};

const serialiseNodesToText = (nodes: Node[]): string => {
  const lines = nodes
    .map((node) => serialiseNodeToText(node))
    .filter(Boolean)
    .join("\n")
    .split("\n")
    .map((line) => normaliseWhitespace(line))
    .filter(Boolean);

  return lines.join("\n");
};

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
  const textNodes: Node[] = [];
  let pointer = heading.nextElementSibling;
  while (pointer) {
    if (isHeadingElement(pointer as HTMLElement)) {
      break;
    }
    fragments.push(pointer.toString());
    textNodes.push(pointer as unknown as Node);
    pointer = pointer.nextElementSibling;
  }

  return {
    html: fragments.join("\n").trim(),
    text: serialiseNodesToText(textNodes),
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

const XML_HEADING_TAGS = ["heading", "title", "name", "hd"];
const XML_CLAUSE_TAGS = [
  "clause",
  "section",
  "provision",
  "prov",
  "item",
  "zoningtable",
  "zoning-table",
  "cl",
  "sect",
  "rule",
];
const XML_TIER_TYPES = new Set(["chapter", "part", "division", "subdivision", "schedule", "annexure", "attachment"]);
const XML_CLAUSE_TYPES = new Set(["clause", "section", "provision", "prov", "zoningtable", "zoning-table", "item"]);
const XML_TIER_TAGS = new Set(["chapter", "part", "division", "subdivision", "schedule", "annexure", "attachment"]);

const detectDocumentFormat = (content: string, declared?: InstrumentFetchResult["format"]) => {
  if (declared) {
    return declared;
  }
  return /<html|<!DOCTYPE html/i.test(content) ? "html" : "xml";
};

const extractAttribute = (element: HTMLElement, names: string[]) => {
  for (const name of names) {
    const value = element.getAttribute(name);
    if (value) {
      return normaliseWhitespace(value);
    }
  }
  return null;
};

const extractHeadingFromXmlNode = (element: HTMLElement) => {
  const attributeHeading = extractAttribute(element, ["heading", "title", "name", "label"]);
  if (attributeHeading) {
    return attributeHeading;
  }

  const headingChild = element.querySelector(XML_HEADING_TAGS.join(","));
  if (headingChild) {
    return normaliseWhitespace(headingChild.text);
  }

  return null;
};

const fallbackHeadingFromContent = (element: HTMLElement) => {
  const text = normaliseWhitespace(element.text || "");
  if (!text) return null;
  const tokens = text.split(/\s+/).slice(0, 12).join(" ");
  return tokens.length ? tokens : null;
};

const buildXmlClauseHeading = (element: HTMLElement): ClauseHeading | null => {
  const headingText = extractHeadingFromXmlNode(element);
  const clauseNumber =
    extractAttribute(element, ["clausenumber", "number", "num", "provisionnumber", "id"]) ??
    extractHeadingFromXmlNode(element);

  const fallbackHeading = headingText || fallbackHeadingFromContent(element);

  if (!fallbackHeading && !clauseNumber) {
    return null;
  }

  const clauseTitle = normaliseWhitespace([clauseNumber, fallbackHeading].filter(Boolean).join(" "));
  const clauseLabel = clauseNumber ? `Clause ${clauseNumber}` : clauseTitle || "Clause";
  return {
    clauseNumber: clauseNumber ?? null,
    clauseTitle: clauseTitle || fallbackHeading || clauseLabel,
    clauseLabel,
  };
};

const stripHeadingFromBody = (element: HTMLElement) => {
  const nodes = element.childNodes as Node[];
  const filtered = nodes.filter((node) => {
    const tag = ((node as HTMLElement).tagName || "").toLowerCase();
    if (!tag) {
      return true;
    }
    if (tag === "head") {
      return false;
    }
    return !XML_HEADING_TAGS.includes(tag);
  });
  const html = filtered.map((node) => node.toString()).join("").trim();
  const text = serialiseNodesToText(filtered);
  return { html, text };
};

const buildXmlHierarchyPath = (tiers: string[], clauseLabel: string) => [...tiers, clauseLabel];

const extractNumberFromLevel = (element: HTMLElement) => {
  const head = element.querySelector("head");
  const numberFromNo = head?.querySelector("no")?.text;
  const attributeNumber = extractAttribute(element, ["clausenumber", "number", "num", "provisionnumber"]);
  return normaliseWhitespace(numberFromNo || attributeNumber || "");
};

const extractHeadingFromLevel = (element: HTMLElement) => {
  const head = element.querySelector("head");
  const heading = head?.querySelector(XML_HEADING_TAGS.join(","))?.text;
  return normaliseWhitespace(heading || "");
};

const buildTierLabel = (element: HTMLElement, type: string) => {
  const heading = extractHeadingFromLevel(element) || extractHeadingFromXmlNode(element);
  if (!heading) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  const number = extractNumberFromLevel(element);
  if (number) {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} ${number} ${heading}`.trim();
  }
  return `${type.charAt(0).toUpperCase() + type.slice(1)} ${heading}`.trim();
};

const buildClauseHeadingFromLevel = (element: HTMLElement): ClauseHeading | null => {
  const clauseNumber = extractNumberFromLevel(element) || extractAttribute(element, ["id"]);
  const headingText = extractHeadingFromLevel(element) || extractAttribute(element, ["heading", "title"]);
  if (!clauseNumber && !headingText) {
    return null;
  }

  const clauseTitle = normaliseWhitespace([clauseNumber, headingText].filter(Boolean).join(" "));
  const clauseLabel = clauseNumber ? `Clause ${clauseNumber}` : clauseTitle || "Clause";

  return {
    clauseNumber: clauseNumber || null,
    clauseTitle: clauseTitle || clauseLabel,
    clauseLabel,
  };
};

const traverseXml = (
  config: InstrumentConfig,
  element: HTMLElement,
  tiers: string[],
  clauses: ParsedClause[],
) => {
  const supportsAttributes = typeof (element as HTMLElement).getAttribute === "function";
  const tagName = (element.tagName || "").toLowerCase();
  const type = supportsAttributes ? (element.getAttribute("type") || "").toLowerCase() : "";

  if (!supportsAttributes) {
    element.childNodes.forEach((child) => traverseXml(config, child as HTMLElement, tiers, clauses));
    return;
  }

  const tierType = XML_TIER_TAGS.has(tagName) ? tagName : type;

  if (tagName === "level") {
    if (XML_CLAUSE_TYPES.has(type)) {
      const clauseHeading = buildClauseHeadingFromLevel(element) ?? buildXmlClauseHeading(element);
      if (!clauseHeading) {
        return;
      }

      const { html: bodyHtml, text: bodyText } = stripHeadingFromBody(element);
      const clause: ParsedClause = {
        clauseKey: buildClauseKey(config, clauseHeading),
        title: clauseHeading.clauseTitle,
        bodyHtml,
        bodyText,
        hierarchyPath: buildXmlHierarchyPath(tiers, clauseHeading.clauseLabel),
        contentHash: computeHash(bodyText),
      };
      clauses.push(clause);
      return;
    }

    if (XML_TIER_TYPES.has(type)) {
      const tierLabel = buildTierLabel(element, type);
      const nextTiers = [...tiers, tierLabel];
      element.childNodes.forEach((child) => traverseXml(config, child as HTMLElement, nextTiers, clauses));
      return;
    }
  }

  if (XML_TIER_TAGS.has(tagName)) {
    const tierLabel = buildTierLabel(element, tierType || tagName);
    const nextTiers = [...tiers, tierLabel];
    element.childNodes.forEach((child) => traverseXml(config, child as HTMLElement, nextTiers, clauses));
    return;
  }

  if (XML_CLAUSE_TAGS.includes(tagName)) {
    const clauseHeading = buildXmlClauseHeading(element);
    if (!clauseHeading) {
      return;
    }

    const { html: bodyHtml, text: bodyText } = stripHeadingFromBody(element);
    clauses.push({
      clauseKey: buildClauseKey(config, clauseHeading),
      title: clauseHeading.clauseTitle,
      bodyHtml,
      bodyText,
      hierarchyPath: buildXmlHierarchyPath(tiers, clauseHeading.clauseLabel),
      contentHash: computeHash(bodyText),
    });
    return;
  }

  element.childNodes.forEach((child) => traverseXml(config, child as HTMLElement, tiers, clauses));
};

const parseXmlDocument = (config: InstrumentConfig, xml: string): ParsedClause[] => {
  const normalizedXml = xml.replace(/<pre\b[^>]*>/gi, "<div>").replace(/<\/pre>/gi, "</div>");

  const root = parse(normalizedXml, {
    lowerCaseTagName: false,
    blockTextElements: { script: false, style: false, pre: false },
  });
  const clauses: ParsedClause[] = [];

  traverseXml(config, root as unknown as HTMLElement, [], clauses);

  return clauses;
};

const parseHtmlDocument = (config: InstrumentConfig, html: string): ParsedClause[] => {
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

export const parseInstrumentDocument = (
  config: InstrumentConfig,
  document: string,
  format?: InstrumentFetchResult["format"],
): ParsedClause[] => {
  const detectedFormat = detectDocumentFormat(document, format);
  const parsedClauses =
    detectedFormat === "html" ? parseHtmlDocument(config, document) : parseXmlDocument(config, document);

  if (parsedClauses.length === 0) {
    console.warn(`[legislation] Parsed zero clauses for ${config.slug}`);
  }

  return parsedClauses;
};
