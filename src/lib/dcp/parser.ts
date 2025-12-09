import { parse, type HTMLElement, type Node } from "node-html-parser";

import { extractNumericMeta, type NumericMeta } from "./extract-numeric";
import { tableToMarkdown } from "./table-parser";
import { detectTopicTags } from "./topic-tags";

type HeadingStackItem = { level: number; title: string; ref: string | null };

export type ParsedDcpClause = {
  ref: string | null;
  title: string | null;
  headingPath: string[];
  parentRef: string | null;
  depth: number;
  bodyHtml: string;
  bodyText: string;
  topicTags: string[];
  numericMeta: NumericMeta;
};

export type ParseDcpOptions = {
  documentTitle: string;
};

const headingLevels: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

const deriveRefFromHeading = (heading: string) => {
  const match = heading.match(/([A-Za-z]?\d+(?:\.\d+)*[A-Za-z]?)/);
  return match?.[1] ?? null;
};

const toSegment = (element: HTMLElement): { html: string; text: string } | null => {
  const tag = element.tagName.toLowerCase();

  if (headingLevels[tag]) return null;

  if (tag === "table") {
    const markdown = tableToMarkdown(element);
    if (!markdown) return null;
    return { html: `<pre>${markdown}</pre>`, text: markdown };
  }

  if (["ul", "ol"].includes(tag)) {
    const items = element
      .querySelectorAll("li")
      .map((li) => normalize(li.textContent || ""))
      .filter(Boolean);
    if (!items.length) return null;
    return {
      html: `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`,
      text: items.map((item) => `• ${item}`).join("\n"),
    };
  }

  if (tag === "li") {
    const text = normalize(element.textContent || "");
    if (!text) return null;
    return { html: `<p>${text}</p>`, text: `• ${text}` };
  }

  if (["p", "div", "section", "article", "span"].includes(tag)) {
    const text = normalize(element.textContent || "");
    if (!text) return null;
    return { html: `<p>${text}</p>`, text };
  }

  return null;
};

const traverseNodes = (
  node: Node,
  onHeading: (el: HTMLElement, level: number) => void,
  onContent: (segment: { html: string; text: string }) => void,
) => {
  if (node.nodeType !== 1) return;
  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (headingLevels[tag]) {
    onHeading(element, headingLevels[tag]);
    return;
  }

  const segment = toSegment(element);
  if (segment) {
    onContent(segment);
    return;
  }

  element.childNodes.forEach((child) => traverseNodes(child, onHeading, onContent));
};

export const parseDcpDocument = (html: string, options: ParseDcpOptions): ParsedDcpClause[] => {
  const root = parse(html);
  const body = (root.querySelector("body") as HTMLElement) || root;

  const clauses: ParsedDcpClause[] = [];
  const headingStack: HeadingStackItem[] = [];
  let pendingSegments: { html: string; text: string }[] = [];

  const pushClause = () => {
    if (!headingStack.length) return;
    const headingPath = headingStack.map((item) => item.title);
    const text = pendingSegments.map((seg) => seg.text).join("\n\n").trim();
    const htmlContent = pendingSegments.map((seg) => seg.html).join("\n\n").trim();

    if (!text) {
      pendingSegments = [];
      return;
    }

    const current = headingStack[headingStack.length - 1];
    const parent = headingStack.length > 1 ? headingStack[headingStack.length - 2] : null;
    const topicTags = detectTopicTags(`${headingPath.join(" ")} ${text}`);
    const numericMeta = extractNumericMeta(text);

    clauses.push({
      ref: current.ref,
      title: current.title,
      headingPath,
      parentRef: parent?.ref ?? null,
      depth: current.level,
      bodyHtml: htmlContent,
      bodyText: text,
      topicTags,
      numericMeta,
    });

    pendingSegments = [];
  };

  const ensureRootHeading = () => {
    if (!headingStack.length) {
      headingStack.push({ level: 1, title: options.documentTitle, ref: null });
    }
  };

  traverseNodes(
    body,
    (element, level) => {
      pushClause();
      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      const title = normalize(element.textContent || "");
      const ref = deriveRefFromHeading(title);
      headingStack.push({ level, title, ref });
      pendingSegments = [];
    },
    (segment) => {
      ensureRootHeading();
      pendingSegments.push(segment);
    },
  );

  pushClause();

  return clauses;
};
