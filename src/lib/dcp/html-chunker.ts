import { parse, type HTMLElement, type Node } from "node-html-parser";

type HeadingBlock = { type: "heading"; level: number; text: string };
type TextBlock = { type: "text"; text: string };
type Block = HeadingBlock | TextBlock;

type Section = { headingPath: string[]; paragraphs: string[] };

type Chunk = {
  heading: string;
  content: string;
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

const headingTextFromNode = (node: HTMLElement) => normalize(node.textContent ?? "");

const textFromNode = (node: HTMLElement) => {
  const text = normalize(node.textContent ?? "");
  if (!text) return text;
  if (node.tagName.toLowerCase() === "li") {
    return `• ${text}`;
  }
  return text;
};

const collectBlocks = (root: HTMLElement): Block[] => {
  const blocks: Block[] = [];

  const traverse = (node: Node) => {
    if (node.nodeType !== 1) return; // Element nodes only
    const element = node as HTMLElement;
    const tag = element.tagName?.toLowerCase?.();

    if (!tag) return;

    if (headingLevels[tag]) {
      const text = headingTextFromNode(element);
      if (text) {
        blocks.push({ type: "heading", level: headingLevels[tag], text });
      }
      return;
    }

    if (["p", "li", "div", "section", "article"].includes(tag)) {
      if (["p", "li"].includes(tag)) {
        const text = textFromNode(element);
        if (text) blocks.push({ type: "text", text });
      }
      element.childNodes.forEach(traverse);
      return;
    }

    if (["ul", "ol"].includes(tag)) {
      element.childNodes.forEach(traverse);
      return;
    }

    if (element.childNodes?.length) {
      element.childNodes.forEach(traverse);
    }
  };

  root.childNodes.forEach(traverse);
  return blocks;
};

const buildSections = (blocks: Block[], documentTitle: string) => {
  const sections: Section[] = [];
  const headingStack: { level: number; text: string }[] = [];

  const startSection = () => {
    const headingPath = headingStack.length ? headingStack.map((item) => item.text) : [documentTitle];
    sections.push({ headingPath, paragraphs: [] });
  };

  blocks.forEach((block) => {
    if (block.type === "heading") {
      while (headingStack.length && headingStack[headingStack.length - 1].level >= block.level) {
        headingStack.pop();
      }
      headingStack.push({ level: block.level, text: block.text });
      startSection();
      return;
    }

    if (!sections.length) {
      startSection();
    }

    const currentSection = sections[sections.length - 1];
    currentSection.paragraphs.push(block.text);
  });

  return sections.filter((section) => section.paragraphs.length > 0);
};

const chunkSection = (section: Section, maxWords = 850) => {
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let wordCount = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push({ heading: section.headingPath.join(" > "), content: current.join("\n\n") });
    current = [];
    wordCount = 0;
  };

  section.paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (wordCount && wordCount + words.length > maxWords) {
      flush();
    }

    current.push(paragraph);
    wordCount += words.length;
  });

  flush();

  return chunks.map((chunk, index) => {
    if (chunks.length === 1) return chunk;
    return { ...chunk, heading: `${chunk.heading} (Part ${index + 1})` };
  });
};

export const parseCouncilDcpHtml = (html: string, documentTitle: string) => {
  const root = parse(html);
  const body = (root.querySelector("body") as HTMLElement) || root;

  const blocks = collectBlocks(body);
  const sections = buildSections(blocks, documentTitle);
  const chunks = sections.flatMap((section) => chunkSection(section));

  const plainText = blocks
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  return { chunks, plainText };
};

