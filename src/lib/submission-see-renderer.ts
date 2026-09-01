import { createHash } from "node:crypto";

import {
  assessSubmissionSee,
  type SubmissionSeeCandidate,
  type SubmissionSeeIssueCode,
  type SubmissionSeeOutput,
} from "./submission-see-acceptance";

export type SubmissionSeeRenderedOutputs = {
  docx: Buffer;
  pdf: Buffer;
  outputs: [SubmissionSeeOutput, SubmissionSeeOutput];
};

export type WorkingSeeOutstandingEvidence = {
  id: string;
  topic: string;
  status: "MORE_EVIDENCE_REQUIRED";
  recommendedEvidence: string;
  effect: string;
};

export type WorkingSeeRenderContext = {
  documentReadiness: {
    state: "WORKING_SEE";
    evidenceStatus: "CONFIRMED" | "MORE_EVIDENCE_REQUIRED";
    submissionReady: false;
    customerMessage: string;
  };
  outstandingEvidence: WorkingSeeOutstandingEvidence[];
  sourceDetailedPlanningPackArtefactId: string;
  predecessorDetailedPlanningPackArtefactId: string | null;
};

type RenderPresentation = {
  documentTitle: string;
  pdfTitleLines: string[];
  footerLabel: string;
  filePrefix: string;
  workingContext: WorkingSeeRenderContext | null;
};

const FINAL_PRESENTATION: RenderPresentation = {
  documentTitle: "Statement of Environmental Effects",
  pdfTitleLines: ["STATEMENT OF", "ENVIRONMENTAL EFFECTS"],
  footerLabel: "Statement of Environmental Effects",
  filePrefix: "statement-of-environmental-effects",
  workingContext: null,
};

const workingPresentation = (
  context: WorkingSeeRenderContext,
): RenderPresentation => ({
  documentTitle: "Working Statement of Environmental Effects",
  pdfTitleLines: ["WORKING", "STATEMENT OF", "ENVIRONMENTAL EFFECTS"],
  footerLabel: "WORKING SEE - NOT SUBMISSION READY",
  filePrefix: "working-statement-of-environmental-effects",
  workingContext: context,
});

type ZipEntry = {
  name: string;
  data: Buffer;
};

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

const hashBuffer = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

const safeFilePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "confirmed-site";

const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (value: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp);
  const year = Math.max(1980, Math.min(2107, date.getUTCFullYear()));
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getUTCMonth() + 1) << 5) |
    date.getUTCDate();
  const dosTime =
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    Math.floor(date.getUTCSeconds() / 2);
  return { dosDate, dosTime };
};

const createStoredZip = (entries: ZipEntry[], timestamp: string) => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const { dosDate, dosTime } = dosDateTime(timestamp);
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const checksum = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
};

const wordParagraph = (
  text: string,
  style = "Normal",
  options: { pageBreakBefore?: boolean; keepNext?: boolean } = {},
) => {
  const properties = [
    `<w:pStyle w:val="${style}"/>`,
    options.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
    options.keepNext ? "<w:keepNext/>" : "",
  ].join("");
  return `<w:p><w:pPr>${properties}</w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(
    text,
  )}</w:t></w:r></w:p>`;
};

const wordToc = (
  candidate: SubmissionSeeCandidate,
  presentation: RenderPresentation,
) =>
  [
    wordParagraph("Contents", "Heading1", {
      pageBreakBefore: true,
      keepNext: true,
    }),
    ...candidate.sections.map((section) =>
      wordParagraph(
        titleCase(section.title || section.id),
        "TocEntry",
      ),
    ),
    ...(presentation.workingContext
      ? [
          wordParagraph("Document Status", "TocEntry"),
          ...(presentation.workingContext.outstandingEvidence.length > 0
            ? [wordParagraph("Outstanding Evidence", "TocEntry")]
            : []),
        ]
      : []),
    wordParagraph("Source Register", "TocEntry"),
    ...(candidate.limitations.length > 0
      ? [wordParagraph("Limitations", "TocEntry")]
      : []),
  ].join("");

const renderDocx = (
  candidate: SubmissionSeeCandidate,
  presentation: RenderPresentation,
) => {
  const sourceById = new Map(candidate.sources.map((source) => [source.id, source]));
  const generated = new Date(candidate.generatedAt).toISOString();
  const body: string[] = [
    wordParagraph(presentation.documentTitle, "Title"),
    wordParagraph(candidate.site.label, "Subtitle"),
    wordParagraph(
      `${titleCase(candidate.site.lgaCode)} | Zone ${candidate.site.zoneCode}`,
      "Subtitle",
    ),
    wordParagraph(`Project: ${candidate.projectId}`, "Metadata"),
    wordParagraph(`Generated: ${generated}`, "Metadata"),
    wordParagraph(
      `Operator checklist: ${candidate.operatorReview.checklistVersion ?? "Not recorded"}`,
      "Metadata",
    ),
    ...(presentation.workingContext
      ? [
          wordParagraph("WORKING SEE - NOT SUBMISSION READY", "Subtitle"),
          wordParagraph(
            `Evidence status: ${presentation.workingContext.documentReadiness.evidenceStatus}`,
            "Metadata",
          ),
        ]
      : []),
    wordToc(candidate, presentation),
  ];

  const working = presentation.workingContext;
  if (working) {
    body.push(
      wordParagraph("Document Status", "Heading1", {
        keepNext: true,
      }),
      wordParagraph(working.documentReadiness.customerMessage, "Normal"),
      wordParagraph(
        `Source DPP: ${working.sourceDetailedPlanningPackArtefactId}`,
        "Metadata",
      ),
      ...(working.predecessorDetailedPlanningPackArtefactId
        ? [
            wordParagraph(
              `Strengthens DPP: ${working.predecessorDetailedPlanningPackArtefactId}`,
              "Metadata",
            ),
          ]
        : []),
    );
    if (working.outstandingEvidence.length > 0) {
      body.push(
        wordParagraph("Outstanding Evidence", "Heading1", { keepNext: true }),
      );
      for (const item of working.outstandingEvidence) {
        body.push(
          wordParagraph(
            `${item.topic} | Required: ${item.recommendedEvidence} | Effect: ${item.effect}`,
            "Normal",
          ),
        );
      }
    }
  }

  candidate.sections.forEach((section, index) => {
    body.push(
      wordParagraph(
        titleCase(section.title || section.id),
        "Heading1",
        { pageBreakBefore: index > 0, keepNext: true },
      ),
    );
    body.push(wordParagraph(section.narrative, "Normal"));
    const citations = section.sourceIds
      .map((sourceId) => {
        const source = sourceById.get(sourceId);
        return source ? `${source.id}: ${source.title}` : sourceId;
      })
      .join("; ");
    body.push(wordParagraph(`Sources: ${citations}`, "Citation"));
  });

  body.push(
    wordParagraph("Source Register", "Heading1", {
      pageBreakBefore: true,
      keepNext: true,
    }),
  );
  for (const source of candidate.sources) {
    const provenance =
      source.officialUrl ??
      (source.contentHash ? `SHA-256 ${source.contentHash}` : "No provenance recorded");
    body.push(
      wordParagraph(
        `${source.id} | ${source.type} | ${source.title} | ${provenance} | checked ${source.retrievedAt}`,
        "SourceRegister",
      ),
    );
  }

  if (candidate.limitations.length > 0) {
    body.push(wordParagraph("Limitations", "Heading1", { keepNext: true }));
    for (const limitation of candidate.limitations) {
      body.push(wordParagraph(`• ${limitation}`, "Normal"));
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${body.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>
      <w:footerReference w:type="default" r:id="rId1"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:color w:val="24313A"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Subtitle"/><w:pPr><w:spacing w:before="2400" w:after="240"/><w:jc w:val="left"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="0B5860"/><w:sz w:val="54"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="180"/></w:pPr><w:rPr><w:color w:val="4D6670"/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Metadata"><w:name w:val="Metadata"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:color w:val="65767D"/><w:sz w:val="18"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="180"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="0B5860"/><w:sz w:val="34"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Citation"><w:name w:val="Citation"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/><w:spacing w:before="80" w:after="240"/></w:pPr><w:rPr><w:i/><w:color w:val="536A73"/><w:sz w:val="18"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TocEntry"><w:name w:val="Contents Entry"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/><w:spacing w:after="80"/></w:pPr><w:rPr><w:color w:val="425A63"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="SourceRegister"><w:name w:val="Source Register"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="140"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="425A63"/></w:rPr></w:style>
</w:styles>`;

  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="718087"/><w:sz w:val="16"/></w:rPr><w:t>Plannera | ${xmlEscape(presentation.footerLabel)} | </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>
</w:ftr>`;

  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`, "utf8"),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`, "utf8"),
    },
    { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") },
    { name: "word/styles.xml", data: Buffer.from(stylesXml, "utf8") },
    { name: "word/footer1.xml", data: Buffer.from(footerXml, "utf8") },
    {
      name: "word/_rels/document.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`, "utf8"),
    },
    {
      name: "docProps/core.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(presentation.documentTitle)}</dc:title>
  <dc:creator>Plannera</dc:creator>
  <cp:lastModifiedBy>Plannera</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${generated}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${generated}</dcterms:modified>
</cp:coreProperties>`, "utf8"),
    },
    {
      name: "docProps/app.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Plannera</Application>
  <AppVersion>1.0</AppVersion>
</Properties>`, "utf8"),
    },
  ];

  return createStoredZip(entries, candidate.generatedAt);
};

type PdfLine = {
  text: string;
  font: "regular" | "bold";
  size: number;
  x: number;
  y: number;
  color: [number, number, number];
};

const pdfSafe = (value: string) =>
  value
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapText = (value: string, maxCharacters: number) => {
  const words = clean(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > maxCharacters) {
      if (current) lines.push(current);
      for (let index = 0; index < word.length; index += maxCharacters) {
        lines.push(word.slice(index, index + maxCharacters));
      }
      current = "";
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
};

type PdfTextOptions = {
  font?: PdfLine["font"];
  size?: number;
  color?: PdfLine["color"];
  before?: number;
  after?: number;
  indent?: number;
};

const layoutPdf = (
  candidate: SubmissionSeeCandidate,
  presentation: RenderPresentation,
) => {
  const pages: PdfLine[][] = [[]];
  let pageIndex = 0;
  let y = 790;
  const margin = 54;

  const newPage = () => {
    pages.push([]);
    pageIndex += 1;
    y = 790;
  };

  const textLayout = (text: string, options: PdfTextOptions = {}) => {
    const size = options.size ?? 10.5;
    const maxCharacters = Math.max(
      25,
      Math.floor((487 - (options.indent ?? 0)) / (size * 0.52)),
    );
    const lines = wrapText(text, maxCharacters);
    const before = options.before ?? 0;
    const after = options.after ?? 8;
    return {
      size,
      lines,
      before,
      after,
      height: before + lines.length * size * 1.45 + after,
    };
  };

  const ensureSpace = (requiredHeight: number) => {
    const availablePageHeight = 790 - 64;
    if (requiredHeight <= availablePageHeight && y - requiredHeight < 64) {
      newPage();
    }
  };

  const addText = (
    text: string,
    options: PdfTextOptions = {},
  ) => {
    const font = options.font ?? "regular";
    const color = options.color ?? ([0.14, 0.19, 0.23] as const);
    const layout = textLayout(text, options);
    y -= layout.before;
    for (const line of layout.lines) {
      if (y < 64) newPage();
      pages[pageIndex]!.push({
        text: line,
        font,
        size: layout.size,
        x: margin + (options.indent ?? 0),
        y,
        color: [color[0], color[1], color[2]],
      });
      y -= layout.size * 1.45;
    }
    y -= layout.after;
  };

  presentation.pdfTitleLines.forEach((line, index) => {
    const isLast = index === presentation.pdfTitleLines.length - 1;
    const isWorking = presentation.workingContext !== null;
    addText(line, {
      font: "bold",
      size: isLast ? (isWorking ? 23 : 27) : 15,
      color: [0.04, 0.35, 0.38],
      before: index === 0 ? 95 : 0,
      after: isLast ? 28 : 0,
    });
  });
  addText(candidate.site.label, {
    font: "bold",
    size: 16,
    color: [0.2, 0.31, 0.34],
    after: 12,
  });
  addText(
    `${titleCase(candidate.site.lgaCode)} | Zone ${candidate.site.zoneCode}`,
    { size: 12, color: [0.31, 0.4, 0.43], after: 24 },
  );
  addText(`Project ${candidate.projectId}`, { size: 9.5, after: 4 });
  addText(`Generated ${new Date(candidate.generatedAt).toISOString()}`, {
    size: 9.5,
    after: 4,
  });
  addText(
    `Operator checklist ${candidate.operatorReview.checklistVersion ?? "Not recorded"}`,
    { size: 9.5 },
  );

  if (presentation.workingContext) {
    addText("WORKING SEE - NOT SUBMISSION READY", {
      font: "bold",
      size: 10,
      color: [0.68, 0.28, 0.08],
      before: 10,
      after: 0,
    });
  }

  newPage();
  const working = presentation.workingContext;
  if (working) {
    addText("Document Status", {
      font: "bold",
      size: 17,
      color: [0.04, 0.35, 0.38],
      after: 10,
    });
    addText(working.documentReadiness.customerMessage, { size: 10.5 });
    addText(
      `Evidence status: ${working.documentReadiness.evidenceStatus}`,
      { size: 9.5, after: 4 },
    );
    addText(
      `Source DPP: ${working.sourceDetailedPlanningPackArtefactId}`,
      { size: 9.5, after: 4 },
    );
    if (working.predecessorDetailedPlanningPackArtefactId) {
      addText(
        `Strengthens DPP: ${working.predecessorDetailedPlanningPackArtefactId}`,
        { size: 9.5, after: 10 },
      );
    }
    if (working.outstandingEvidence.length > 0) {
      addText("Outstanding Evidence", {
        font: "bold",
        size: 15,
        color: [0.04, 0.35, 0.38],
        before: 8,
        after: 8,
      });
      for (const item of working.outstandingEvidence) {
        addText(
          `${item.topic} | Required: ${item.recommendedEvidence} | Effect: ${item.effect}`,
          { size: 9.5, indent: 10, after: 6 },
        );
      }
    }
  }

  const sourceById = new Map(candidate.sources.map((source) => [source.id, source]));
  const sectionHeadingOptions: PdfTextOptions = {
    font: "bold",
    size: 17,
    color: [0.04, 0.35, 0.38],
    before: 8,
    after: 10,
  };
  const sectionNarrativeOptions: PdfTextOptions = {
    size: 10.5,
    after: 7,
  };
  const sectionCitationOptions: PdfTextOptions = {
    size: 8.5,
    color: [0.31, 0.4, 0.43],
    indent: 12,
    after: 15,
  };

  for (const section of candidate.sections) {
    const heading = titleCase(section.title || section.id);
    const citations = section.sourceIds
      .map((sourceId) => {
        const source = sourceById.get(sourceId);
        return source ? source.id + ": " + source.title : sourceId;
      })
      .join("; ");
    const citationText = "Sources: " + citations;

    ensureSpace(
      textLayout(heading, sectionHeadingOptions).height +
        textLayout(section.narrative, sectionNarrativeOptions).height +
        textLayout(citationText, sectionCitationOptions).height,
    );
    addText(heading, sectionHeadingOptions);
    addText(section.narrative, sectionNarrativeOptions);
    addText(citationText, sectionCitationOptions);
  }

  addText("Source Register", {
    font: "bold",
    size: 17,
    color: [0.04, 0.35, 0.38],
    before: 12,
    after: 10,
  });
  for (const source of candidate.sources) {
    const provenance =
      source.officialUrl ??
      (source.contentHash ? `SHA-256 ${source.contentHash}` : "No provenance recorded");
    addText(
      `${source.id} | ${source.type} | ${source.title} | ${provenance} | checked ${source.retrievedAt}`,
      { size: 8.5, after: 5 },
    );
  }

  if (candidate.limitations.length > 0) {
    addText("Limitations", {
      font: "bold",
      size: 17,
      color: [0.04, 0.35, 0.38],
      before: 12,
      after: 10,
    });
    for (const limitation of candidate.limitations) {
      addText(`- ${limitation}`, { size: 9.5, indent: 10, after: 5 });
    }
  }

  pages.forEach((page, index) => {
    page.push({
      text: `Plannera | ${presentation.footerLabel} | ${index + 1} of ${pages.length}`,
      font: "regular",
      size: 8,
      x: 54,
      y: 30,
      color: [0.42, 0.49, 0.52],
    });
  });

  return pages;
};

const renderPdf = (
  candidate: SubmissionSeeCandidate,
  presentation: RenderPresentation,
) => {
  const pages = layoutPdf(candidate, presentation);
  const objects: Buffer[] = [];
  const setObject = (id: number, content: string | Buffer) => {
    objects[id] = Buffer.isBuffer(content) ? content : Buffer.from(content, "latin1");
  };

  setObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds = pages.map((_, index) => 5 + index * 2);
  setObject(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>`,
  );
  setObject(
    3,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  setObject(
    4,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  pages.forEach((page, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    const commands = page
      .map((line) => {
        const font = line.font === "bold" ? "F2" : "F1";
        const [red, green, blue] = line.color;
        return `BT /${font} ${line.size.toFixed(2)} Tf ${red.toFixed(
          3,
        )} ${green.toFixed(3)} ${blue.toFixed(3)} rg 1 0 0 1 ${line.x.toFixed(
          2,
        )} ${line.y.toFixed(2)} Tm (${pdfSafe(line.text)}) Tj ET`;
      })
      .join("\n");
    const commandBuffer = Buffer.from(commands, "latin1");
    setObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    setObject(
      contentId,
      Buffer.concat([
        Buffer.from(`<< /Length ${commandBuffer.length} >>\nstream\n`, "latin1"),
        commandBuffer,
        Buffer.from("\nendstream", "latin1"),
      ]),
    );
  });

  const header = Buffer.from("%PDF-1.7\n%Plannera\n", "latin1");
  const chunks: Buffer[] = [header];
  const offsets: number[] = [0];
  let offset = header.length;
  for (let id = 1; id < objects.length; id += 1) {
    const content = objects[id];
    if (!content) throw new Error(`Missing PDF object ${id}`);
    const object = Buffer.concat([
      Buffer.from(`${id} 0 obj\n`, "latin1"),
      content,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    offsets[id] = offset;
    chunks.push(object);
    offset += object.length;
  }

  const xrefOffset = offset;
  const xrefLines = [
    "xref",
    `0 ${objects.length}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((value) => `${String(value).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ];
  chunks.push(Buffer.from(xrefLines.join("\n"), "latin1"));
  return Buffer.concat(chunks);
};

const placeholderOutputs = (
  candidate: SubmissionSeeCandidate,
): SubmissionSeeOutput[] => [
  {
    format: "DOCX",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileName: "preflight.docx",
    contentHash: "0".repeat(64),
    byteLength: 1,
    generatedAt: candidate.generatedAt,
  },
  {
    format: "PDF",
    mimeType: "application/pdf",
    fileName: "preflight.pdf",
    contentHash: "1".repeat(64),
    byteLength: 1,
    generatedAt: candidate.generatedAt,
  },
];

const acceptanceCodes = (candidate: SubmissionSeeCandidate) =>
  assessSubmissionSee({
    ...candidate,
    outputs: placeholderOutputs(candidate),
  });

const assertReadyForFinalRendering = (candidate: SubmissionSeeCandidate) => {
  const preflight = acceptanceCodes(candidate);
  if (!preflight.ready) {
    const codes = [...new Set(preflight.issues.map((issue) => issue.code))].join(
      ", ",
    );
    throw new Error(
      `Submission SEE is not ready for final rendering: ${codes || "unknown"}`,
    );
  }
};

const WORKING_ALLOWED_ISSUES = new Set<SubmissionSeeIssueCode>([
  "unready_dpp",
  "unready_upload_evidence",
  "declared_non_final",
  "operator_review_incomplete",
]);

const assertReadyForWorkingRendering = (
  candidate: SubmissionSeeCandidate,
  context: WorkingSeeRenderContext,
) => {
  const readiness = context.documentReadiness;
  if (
    readiness.state !== "WORKING_SEE" ||
    readiness.submissionReady !== false ||
    clean(readiness.customerMessage).length < 40 ||
    !candidate.limitations.includes(readiness.customerMessage) ||
    !candidate.limitations.some((limitation) =>
      /not (?:a )?(?:final|legal|submission)|not submission-ready/i.test(
        limitation,
      ),
    )
  ) {
    throw new Error(
      "Working SEE requires persisted non-final readiness and a visible customer qualification.",
    );
  }
  if (
    context.sourceDetailedPlanningPackArtefactId !==
      candidate.sourceDetailedPlanningPack.artefactId ||
    (context.predecessorDetailedPlanningPackArtefactId !== null &&
      context.predecessorDetailedPlanningPackArtefactId ===
        context.sourceDetailedPlanningPackArtefactId)
  ) {
    throw new Error("Working SEE DPP lineage does not match the candidate.");
  }
  if (
    context.outstandingEvidence.some(
      (item) =>
        !clean(item.id) ||
        !clean(item.topic) ||
        item.status !== "MORE_EVIDENCE_REQUIRED" ||
        !clean(item.recommendedEvidence) ||
        !clean(item.effect),
    )
  ) {
    throw new Error("Working SEE outstanding evidence schedule is incomplete.");
  }

  const preflight = acceptanceCodes(candidate);
  if (preflight.ready) {
    throw new Error(
      "Submission-ready candidates must use the final Submission SEE renderer.",
    );
  }
  const hardIssues = preflight.issues.filter(
    (issue) => !WORKING_ALLOWED_ISSUES.has(issue.code),
  );
  if (hardIssues.length > 0) {
    const codes = [...new Set(hardIssues.map((issue) => issue.code))].join(", ");
    throw new Error(
      `Working SEE contains hard acceptance blockers: ${codes || "unknown"}`,
    );
  }

  const hasEvidenceBlocker = preflight.issues.some(
    (issue) =>
      issue.code === "unready_dpp" ||
      issue.code === "unready_upload_evidence",
  );
  if (
    hasEvidenceBlocker &&
    readiness.evidenceStatus !== "MORE_EVIDENCE_REQUIRED"
  ) {
    throw new Error(
      "Working SEE evidence blockers must remain MORE_EVIDENCE_REQUIRED.",
    );
  }
  if (readiness.evidenceStatus === "MORE_EVIDENCE_REQUIRED") {
    if (context.outstandingEvidence.length === 0) {
      throw new Error(
        "Working SEE requires an outstanding evidence schedule.",
      );
    }
    const scheduledTopics = new Set(
      context.outstandingEvidence.map((item) => clean(item.topic)),
    );
    const missingTopics = candidate.sourceDetailedPlanningPack.unresolvedTopics
      .map(clean)
      .filter((topic) => topic && !scheduledTopics.has(topic));
    if (missingTopics.length > 0) {
      throw new Error(
        `Working SEE evidence schedule omits DPP topics: ${missingTopics.join(
          ", ",
        )}`,
      );
    }
  } else if (
    candidate.sourceDetailedPlanningPack.commercialReady !== true ||
    candidate.sourceDetailedPlanningPack.unresolvedTopics.length > 0 ||
    context.outstandingEvidence.length > 0
  ) {
    throw new Error(
      "Confirmed working SEE evidence must have a ready DPP and no outstanding evidence.",
    );
  }
};

const buildOutputs = (
  candidate: SubmissionSeeCandidate,
  presentation: RenderPresentation,
  docx: Buffer,
  pdf: Buffer,
): [SubmissionSeeOutput, SubmissionSeeOutput] => {
  const filePart = safeFilePart(candidate.site.confirmedSiteId);
  const generatedAt = new Date(candidate.generatedAt).toISOString();
  return [
    {
      format: "DOCX",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: `${presentation.filePrefix}-${filePart}.docx`,
      contentHash: hashBuffer(docx),
      byteLength: docx.length,
      generatedAt,
    },
    {
      format: "PDF",
      mimeType: "application/pdf",
      fileName: `${presentation.filePrefix}-${filePart}.pdf`,
      contentHash: hashBuffer(pdf),
      byteLength: pdf.length,
      generatedAt,
    },
  ];
};

export function renderSubmissionSeeOutputs(
  candidate: SubmissionSeeCandidate,
): SubmissionSeeRenderedOutputs {
  assertReadyForFinalRendering(candidate);
  const docx = renderDocx(candidate, FINAL_PRESENTATION);
  const pdf = renderPdf(candidate, FINAL_PRESENTATION);
  return {
    docx,
    pdf,
    outputs: buildOutputs(candidate, FINAL_PRESENTATION, docx, pdf),
  };
}

export function renderWorkingSeeOutputs(
  candidate: SubmissionSeeCandidate,
  context: WorkingSeeRenderContext,
): SubmissionSeeRenderedOutputs {
  assertReadyForWorkingRendering(candidate, context);
  const presentation = workingPresentation(context);
  const docx = renderDocx(candidate, presentation);
  const pdf = renderPdf(candidate, presentation);
  return {
    docx,
    pdf,
    outputs: buildOutputs(candidate, presentation, docx, pdf),
  };
}
