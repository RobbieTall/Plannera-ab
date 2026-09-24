import { createHash } from "node:crypto";

import {
  assessSubmissionSee,
  type SubmissionSeeCandidate,
  type SubmissionSeeIssueCode,
  type SubmissionSeeOutput,
} from "./submission-see-acceptance";
import {
  buildSubmissionSeePresentation,
  type SubmissionSeePresentationModel,
  type SubmissionSeePresentationRow,
} from "./submission-see-presentation";

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
    options.keepNext ? "<w:keepNext/>" : "",
    options.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
  ].join("");
  return `<w:p><w:pPr>${properties}</w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(
    text,
  )}</w:t></w:r></w:p>`;
};

type WordCellSpec = {
  text: string;
  width?: number;
  fill?: string;
  color?: string;
  bold?: boolean;
  fontSize?: number;
};

const wordCell = (cell: WordCellSpec) => {
  const width = cell.width
    ? `<w:tcW w:w="${cell.width}" w:type="dxa"/>`
    : "";
  const fill = cell.fill ? `<w:shd w:fill="${cell.fill}"/>` : "";
  const runProperties = [
    cell.bold ? "<w:b/>" : "",
    cell.color ? `<w:color w:val="${cell.color}"/>` : "",
    cell.fontSize ? `<w:sz w:val="${cell.fontSize}"/>` : "",
  ].join("");
  return `<w:tc><w:tcPr>${width}${fill}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="70" w:after="70" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${runProperties}</w:rPr><w:t xml:space="preserve">${xmlEscape(
    cell.text,
  )}</w:t></w:r></w:p></w:tc>`;
};

const wordTable = (rows: WordCellSpec[][], widths: number[]) => {
  const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const renderedRows = rows
    .map(
      (row) =>
        `<w:tr>${row
          .map((cell, index) =>
            wordCell({ ...cell, width: cell.width ?? widths[index] }),
          )
          .join("")}</w:tr>`,
    )
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D5DEE1"/><w:left w:val="single" w:sz="4" w:color="D5DEE1"/><w:bottom w:val="single" w:sz="4" w:color="D5DEE1"/><w:right w:val="single" w:sz="4" w:color="D5DEE1"/><w:insideH w:val="single" w:sz="3" w:color="E1E7E9"/><w:insideV w:val="single" w:sz="3" w:color="E1E7E9"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${renderedRows}</w:tbl>`;
};

const wordCallout = (title: string, text: string, fill = "F2F7F7") =>
  wordTable(
    [
      [
        {
          text: title,
          fill: "D9E8E8",
          color: "0B5860",
          bold: true,
          fontSize: 18,
        },
      ],
      [{ text, fill, color: "304047", fontSize: 19 }],
    ],
    [9360],
  );

const wordToc = (
  model: SubmissionSeePresentationModel,
  presentation: RenderPresentation,
) =>
  [
    wordParagraph("Contents", "Heading1", {
      pageBreakBefore: true,
      keepNext: true,
    }),
    ...model.contents.map((section) =>
      wordParagraph(
        `${section.number}. ${section.title}`,
        "TocEntry",
      ),
    ),
    ...(presentation.workingContext?.outstandingEvidence.length
      ? [wordParagraph("Outstanding Evidence", "TocEntry")]
      : []),
    ...(model.evidenceSchedule.length > 0
      ? [wordParagraph("Supporting Evidence Schedule", "TocEntry")]
      : []),
    wordParagraph("Source Register", "TocEntry"),
    ...(model.limitations.length > 0
      ? [wordParagraph("Limitations", "TocEntry")]
      : []),
  ].join("");

const renderDocx = (
  candidate: SubmissionSeeCandidate,
  presentation: RenderPresentation,
) => {
  const model = buildSubmissionSeePresentation({
    candidate,
    workingContext: presentation.workingContext,
  });
  const generated = new Date(candidate.generatedAt).toISOString();
  const body: string[] = [
    wordTable(
      [[
        {
          text: model.brand,
          fill: "0B5860",
          color: "FFFFFF",
          bold: true,
          fontSize: 20,
        },
      ]],
      [9360],
    ),
    wordParagraph(model.statusLabel, "CoverStatus"),
    wordParagraph(model.documentTitle, "Title"),
    wordParagraph(model.siteLabel, "CoverSite"),
    wordParagraph(model.locationLine, "Subtitle"),
    wordParagraph("PROPOSAL", "CoverLabel"),
    wordParagraph(model.proposalSummary, "CoverSummary"),
    wordParagraph(`Prepared ${model.generatedDate}`, "CoverMeta"),
    wordParagraph("Document Control", "Heading1", {
      pageBreakBefore: true,
      keepNext: true,
    }),
    wordTable(
      model.documentControl.map((row) => [
        {
          text: row.label,
          fill: "E5EEEE",
          color: "0B5860",
          bold: true,
          fontSize: 18,
        },
        { text: row.value, color: "304047", fontSize: 19 },
      ]),
      [2200, 7160],
    ),
    wordParagraph("Proposal Summary", "Heading2", { keepNext: true }),
    wordParagraph(model.proposalSummary, "Normal"),
    wordCallout("Document Status", model.statusDetail),
  ];

  const working = presentation.workingContext;
  if (working) {
    body.push(
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
  }

  body.push(wordToc(model, presentation));

  if (working?.outstandingEvidence.length) {
    body.push(
      wordParagraph("Outstanding Evidence", "Heading1", {
        pageBreakBefore: true,
        keepNext: true,
      }),
      wordCallout(
        "Why this document is still working",
        working.documentReadiness.customerMessage,
        "FFF6E8",
      ),
      wordTable(
        [
          [
            {
              text: "Matter",
              fill: "0B5860",
              color: "FFFFFF",
              bold: true,
              fontSize: 17,
            },
            {
              text: "Required evidence",
              fill: "0B5860",
              color: "FFFFFF",
              bold: true,
              fontSize: 17,
            },
            {
              text: "Effect on assessment",
              fill: "0B5860",
              color: "FFFFFF",
              bold: true,
              fontSize: 17,
            },
          ],
          ...working.outstandingEvidence.map((item) => [
            { text: item.topic, fontSize: 17 },
            { text: item.recommendedEvidence, fontSize: 17 },
            { text: item.effect, fontSize: 17 },
          ]),
        ],
        [2500, 3300, 3560],
      ),
    );
  }

  for (const section of model.sections) {
    body.push(
      wordParagraph(
        `${section.number}. ${section.title}`,
        "Heading1",
        { pageBreakBefore: true, keepNext: true },
      ),
      wordParagraph(section.narrative, "Normal"),
    );
    const evidenceText = section.sources
      .map((source) => `${source.id} - ${source.title}`)
      .join("; ");
    body.push(wordCallout("Evidence used", evidenceText));
  }

  if (model.evidenceSchedule.length > 0) {
    body.push(
      wordParagraph("Supporting Evidence Schedule", "Heading1", {
        pageBreakBefore: true,
        keepNext: true,
      }),
      wordTable(
        [
          [
            {
              text: "Document",
              fill: "0B5860",
              color: "FFFFFF",
              bold: true,
              fontSize: 17,
            },
            {
              text: "Type",
              fill: "0B5860",
              color: "FFFFFF",
              bold: true,
              fontSize: 17,
            },
            {
              text: "Review status",
              fill: "0B5860",
              color: "FFFFFF",
              bold: true,
              fontSize: 17,
            },
            {
              text: "Used in",
              fill: "0B5860",
              color: "FFFFFF",
              bold: true,
              fontSize: 17,
            },
          ],
          ...model.evidenceSchedule.map((item) => [
            { text: item.name, fontSize: 16 },
            { text: item.kind, fontSize: 16 },
            { text: item.status, fontSize: 16 },
            { text: item.usedIn || "Not assigned", fontSize: 16 },
          ]),
        ],
        [2800, 1700, 2000, 2860],
      ),
    );
  }

  body.push(
    wordParagraph("Source Register", "Heading1", {
      pageBreakBefore: true,
      keepNext: true,
    }),
    wordTable(
      [
        [
          {
            text: "Ref",
            fill: "0B5860",
            color: "FFFFFF",
            bold: true,
            fontSize: 17,
          },
          {
            text: "Type",
            fill: "0B5860",
            color: "FFFFFF",
            bold: true,
            fontSize: 17,
          },
          {
            text: "Source",
            fill: "0B5860",
            color: "FFFFFF",
            bold: true,
            fontSize: 17,
          },
          {
            text: "Provenance / checked",
            fill: "0B5860",
            color: "FFFFFF",
            bold: true,
            fontSize: 17,
          },
        ],
        ...model.sourceRegister.map((source) => [
          { text: source.id, fontSize: 15 },
          { text: source.type, fontSize: 15 },
          { text: source.title, fontSize: 15 },
          {
            text: `${source.provenance} | ${source.checkedAt}`,
            fontSize: 14,
          },
        ]),
      ],
      [1050, 1100, 2850, 4360],
    ),
  );

  if (model.limitations.length > 0) {
    body.push(
      wordParagraph("Limitations", "Heading1", {
        pageBreakBefore: true,
        keepNext: true,
      }),
      wordCallout(
        "Read with the current project evidence",
        model.limitations.map((item) => `- ${item}`).join("\n"),
        "FFF7EB",
      ),
    );
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${body.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1050" w:right="1275" w:bottom="1050" w:left="1275" w:header="520" w:footer="520" w:gutter="0"/>
      <w:headerReference w:type="default" r:id="rId1"/>
      <w:footerReference w:type="default" r:id="rId2"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/><w:color w:val="24313A"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="150" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Brand"><w:name w:val="Brand"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="620" w:after="150"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="0B5860"/><w:sz w:val="28"/><w:spacing w:val="80"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="CoverStatus"><w:name w:val="Cover Status"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="2150" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="9A5A17"/><w:sz w:val="18"/><w:spacing w:val="45"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="CoverSite"/><w:pPr><w:spacing w:after="180"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="18363B"/><w:sz w:val="52"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="CoverSite"><w:name w:val="Cover Site"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="60" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="0B5860"/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="420"/></w:pPr><w:rPr><w:color w:val="4D6670"/><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="CoverLabel"><w:name w:val="Cover Label"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="300" w:after="70"/></w:pPr><w:rPr><w:b/><w:color w:val="78888E"/><w:sz w:val="16"/><w:spacing w:val="35"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="CoverSummary"><w:name w:val="Cover Summary"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="420"/></w:pPr><w:rPr><w:color w:val="304047"/><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="CoverMeta"><w:name w:val="Cover Meta"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="1200" w:after="80"/></w:pPr><w:rPr><w:color w:val="718087"/><w:sz w:val="17"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Metadata"><w:name w:val="Metadata"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="70"/></w:pPr><w:rPr><w:color w:val="65767D"/><w:sz w:val="16"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="300" w:after="170"/><w:outlineLvl w:val="0"/><w:pBdr><w:bottom w:val="single" w:sz="10" w:space="5" w:color="0B5860"/></w:pBdr></w:pPr><w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="18363B"/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="110"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="0B5860"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TocEntry"><w:name w:val="Contents Entry"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="240"/><w:spacing w:after="95"/></w:pPr><w:rPr><w:color w:val="425A63"/><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>`;

  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="9300"/></w:tabs><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="5" w:color="D5DEE1"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="0B5860"/><w:sz w:val="16"/></w:rPr><w:t>PLANNERA</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:color w:val="718087"/><w:sz w:val="15"/></w:rPr><w:t>${xmlEscape(model.siteLabel)}</w:t></w:r></w:p>
</w:hdr>`;

  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="9300"/></w:tabs><w:pBdr><w:top w:val="single" w:sz="4" w:space="5" w:color="D5DEE1"/></w:pBdr></w:pPr><w:r><w:rPr><w:color w:val="718087"/><w:sz w:val="15"/></w:rPr><w:t>Plannera | ${xmlEscape(presentation.footerLabel)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:rPr><w:color w:val="718087"/><w:sz w:val="15"/></w:rPr><w:t>Page </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>
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
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
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
    { name: "word/header1.xml", data: Buffer.from(headerXml, "utf8") },
    { name: "word/footer1.xml", data: Buffer.from(footerXml, "utf8") },
    {
      name: "word/_rels/document.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
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

type PdfColor = [number, number, number];

type PdfTextPrimitive = {
  kind: "text";
  text: string;
  font: "regular" | "bold";
  size: number;
  x: number;
  y: number;
  color: PdfColor;
};

type PdfRectPrimitive = {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: PdfColor;
  stroke?: PdfColor;
  lineWidth?: number;
};

type PdfRulePrimitive = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: PdfColor;
  lineWidth: number;
};

type PdfPrimitive = PdfTextPrimitive | PdfRectPrimitive | PdfRulePrimitive;

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
  font?: "regular" | "bold";
  size?: number;
  color?: PdfColor;
  before?: number;
  after?: number;
  indent?: number;
  x?: number;
  width?: number;
};

const layoutPdf = (
  candidate: SubmissionSeeCandidate,
  presentation: RenderPresentation,
) => {
  const model = buildSubmissionSeePresentation({
    candidate,
    workingContext: presentation.workingContext,
  });
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 54;
  const contentWidth = 487;
  const bodyTop = 760;
  const bottomLimit = 62;
  const pages: PdfPrimitive[][] = [[]];
  let pageIndex = 0;
  let y = 790;

  const page = () => pages[pageIndex]!;

  const pushText = (
    text: string,
    x: number,
    baseline: number,
    size: number,
    font: "regular" | "bold" = "regular",
    color: PdfColor = [0.14, 0.19, 0.23],
  ) => {
    page().push({
      kind: "text",
      text,
      font,
      size,
      x,
      y: baseline,
      color,
    });
  };

  const pushRect = (
    x: number,
    bottom: number,
    width: number,
    height: number,
    options: {
      fill?: PdfColor;
      stroke?: PdfColor;
      lineWidth?: number;
    } = {},
  ) => {
    page().push({
      kind: "rect",
      x,
      y: bottom,
      width,
      height,
      fill: options.fill,
      stroke: options.stroke,
      lineWidth: options.lineWidth,
    });
  };

  const pushRule = (
    x1: number,
    baseline: number,
    x2: number,
    color: PdfColor = [0.78, 0.83, 0.84],
    lineWidth = 0.6,
  ) => {
    page().push({
      kind: "line",
      x1,
      y1: baseline,
      x2,
      y2: baseline,
      color,
      lineWidth,
    });
  };

  const newPage = () => {
    pages.push([]);
    pageIndex += 1;
    y = bodyTop;
  };

  const textLayout = (text: string, options: PdfTextOptions = {}) => {
    const size = options.size ?? 10.5;
    const width =
      options.width ?? Math.max(80, contentWidth - (options.indent ?? 0));
    const maxCharacters = Math.max(12, Math.floor(width / (size * 0.52)));
    const lines = wrapText(text, maxCharacters);
    const before = options.before ?? 0;
    const after = options.after ?? 8;
    return {
      size,
      lines,
      before,
      after,
      lineHeight: size * 1.45,
      height: before + lines.length * size * 1.45 + after,
    };
  };

  const ensureSpace = (requiredHeight: number) => {
    if (requiredHeight <= bodyTop - bottomLimit && y - requiredHeight < bottomLimit) {
      newPage();
    }
  };

  const addText = (text: string, options: PdfTextOptions = {}) => {
    const font = options.font ?? "regular";
    const color = options.color ?? ([0.14, 0.19, 0.23] as PdfColor);
    const layout = textLayout(text, options);
    y -= layout.before;
    const x = options.x ?? margin + (options.indent ?? 0);
    for (const line of layout.lines) {
      if (y < bottomLimit) newPage();
      pushText(line, x, y, layout.size, font, color);
      y -= layout.lineHeight;
    }
    y -= layout.after;
  };

  const addSectionTitle = (number: string, title: string) => {
    addText(`SECTION ${number}`, {
      font: "bold",
      size: 8.5,
      color: [0.42, 0.52, 0.55],
      after: 5,
    });
    addText(`${number}. ${title}`, {
      font: "bold",
      size: 19,
      color: [0.09, 0.21, 0.23],
      after: 8,
    });
    pushRule(margin, y + 3, margin + contentWidth, [0.04, 0.35, 0.38], 1.2);
    y -= 14;
  };

  const addKeyValueRow = (row: SubmissionSeePresentationRow) => {
    const labelWidth = 128;
    const valueWidth = contentWidth - labelWidth;
    const labelLayout = textLayout(row.label, { size: 9, width: labelWidth - 16 });
    const valueLayout = textLayout(row.value, { size: 9.5, width: valueWidth - 18 });
    const lineHeight = Math.max(labelLayout.lineHeight, valueLayout.lineHeight);
    const rowHeight =
      Math.max(labelLayout.lines.length, valueLayout.lines.length) * lineHeight + 16;
    ensureSpace(rowHeight + 3);
    const top = y;
    const bottom = top - rowHeight;
    pushRect(margin, bottom, contentWidth, rowHeight, {
      fill: [1, 1, 1],
      stroke: [0.82, 0.86, 0.87],
      lineWidth: 0.5,
    });
    pushRect(margin, bottom, labelWidth, rowHeight, {
      fill: [0.91, 0.95, 0.95],
    });
    labelLayout.lines.forEach((line, index) =>
      pushText(
        line,
        margin + 8,
        top - 13 - index * labelLayout.lineHeight,
        9,
        "bold",
        [0.04, 0.35, 0.38],
      ),
    );
    valueLayout.lines.forEach((line, index) =>
      pushText(
        line,
        margin + labelWidth + 9,
        top - 13 - index * valueLayout.lineHeight,
        9.5,
        "regular",
        [0.18, 0.25, 0.28],
      ),
    );
    y = bottom - 3;
  };

  const addCallout = (
    title: string,
    text: string,
    options: {
      fill?: PdfColor;
      accent?: PdfColor;
    } = {},
  ) => {
    const fill = options.fill ?? ([0.95, 0.97, 0.97] as PdfColor);
    const accent = options.accent ?? ([0.04, 0.35, 0.38] as PdfColor);
    const titleLayout = textLayout(title, { size: 9, width: contentWidth - 30 });
    const bodyLayout = textLayout(text, { size: 9.5, width: contentWidth - 30 });
    const boxHeight = titleLayout.height + bodyLayout.height + 12;
    ensureSpace(boxHeight + 6);
    const top = y;
    const bottom = top - boxHeight;
    pushRect(margin, bottom, contentWidth, boxHeight, {
      fill,
      stroke: [0.83, 0.87, 0.88],
      lineWidth: 0.5,
    });
    pushRect(margin, bottom, 5, boxHeight, { fill: accent });
    let localY = top - 15;
    titleLayout.lines.forEach((line) => {
      pushText(line, margin + 15, localY, 9, "bold", accent);
      localY -= titleLayout.lineHeight;
    });
    localY -= 3;
    bodyLayout.lines.forEach((line) => {
      pushText(line, margin + 15, localY, 9.5, "regular", [0.19, 0.25, 0.28]);
      localY -= bodyLayout.lineHeight;
    });
    y = bottom - 8;
  };

  const addCard = (
    heading: string,
    subheading: string,
    detail: string,
  ) => {
    const headingLayout = textLayout(heading, { size: 10.2, width: contentWidth - 24 });
    const subLayout = textLayout(subheading, { size: 8.5, width: contentWidth - 24 });
    const detailLayout = textLayout(detail, { size: 8.2, width: contentWidth - 24 });
    const height = headingLayout.height + subLayout.height + detailLayout.height + 8;
    ensureSpace(height + 6);
    const top = y;
    const bottom = top - height;
    pushRect(margin, bottom, contentWidth, height, {
      fill: [0.985, 0.99, 0.99],
      stroke: [0.85, 0.88, 0.89],
      lineWidth: 0.5,
    });
    let localY = top - 14;
    headingLayout.lines.forEach((line) => {
      pushText(line, margin + 12, localY, 10.2, "bold", [0.09, 0.21, 0.23]);
      localY -= headingLayout.lineHeight;
    });
    subLayout.lines.forEach((line) => {
      pushText(line, margin + 12, localY, 8.5, "bold", [0.04, 0.35, 0.38]);
      localY -= subLayout.lineHeight;
    });
    detailLayout.lines.forEach((line) => {
      pushText(line, margin + 12, localY, 8.2, "regular", [0.33, 0.4, 0.43]);
      localY -= detailLayout.lineHeight;
    });
    y = bottom - 7;
  };

  // Cover
  pushRect(0, pageHeight - 82, pageWidth, 82, {
    fill: [0.04, 0.35, 0.38],
  });
  pushText(model.brand, margin, pageHeight - 48, 15, "bold", [1, 1, 1]);
  y = 705;
  addText(model.statusLabel, {
    font: "bold",
    size: 9,
    color: presentation.workingContext
      ? [0.67, 0.34, 0.08]
      : [0.04, 0.35, 0.38],
    after: 9,
  });
  addText(model.documentTitle, {
    font: "bold",
    size: 29,
    color: [0.09, 0.21, 0.23],
    width: 430,
    after: 18,
  });
  addText(model.siteLabel, {
    font: "bold",
    size: 15.5,
    color: [0.04, 0.35, 0.38],
    width: 440,
    after: 6,
  });
  addText(model.locationLine, {
    size: 10.5,
    color: [0.35, 0.43, 0.46],
    after: 24,
  });
  addCallout("PROPOSAL", model.proposalSummary, {
    fill: [0.95, 0.97, 0.97],
    accent: [0.04, 0.35, 0.38],
  });
  pushText(`Prepared ${model.generatedDate}`, margin, 62, 9, "regular", [0.42, 0.49, 0.52]);
  pushText("Plannera", margin, 42, 8.5, "bold", [0.04, 0.35, 0.38]);

  // Document control
  newPage();
  addText("DOCUMENT CONTROL", {
    font: "bold",
    size: 19,
    color: [0.09, 0.21, 0.23],
    after: 7,
  });
  pushRule(margin, y + 4, margin + contentWidth, [0.04, 0.35, 0.38], 1.2);
  y -= 14;
  for (const row of model.documentControl) addKeyValueRow(row);
  y -= 8;
  addText("Proposal Summary", {
    font: "bold",
    size: 14,
    color: [0.04, 0.35, 0.38],
    after: 7,
  });
  addText(model.proposalSummary, { size: 10.2, after: 10 });
  addCallout("Document Status", model.statusDetail, {
    fill: presentation.workingContext
      ? [1, 0.97, 0.91]
      : [0.95, 0.97, 0.97],
    accent: presentation.workingContext
      ? [0.67, 0.34, 0.08]
      : [0.04, 0.35, 0.38],
  });
  if (presentation.workingContext) {
    addText(
      `Source DPP: ${presentation.workingContext.sourceDetailedPlanningPackArtefactId}`,
      { size: 8.5, color: [0.42, 0.49, 0.52], after: 3 },
    );
    if (presentation.workingContext.predecessorDetailedPlanningPackArtefactId) {
      addText(
        `Strengthens DPP: ${presentation.workingContext.predecessorDetailedPlanningPackArtefactId}`,
        { size: 8.5, color: [0.42, 0.49, 0.52], after: 3 },
      );
    }
  }

  // Contents
  newPage();
  addText("CONTENTS", {
    font: "bold",
    size: 19,
    color: [0.09, 0.21, 0.23],
    after: 7,
  });
  pushRule(margin, y + 4, margin + contentWidth, [0.04, 0.35, 0.38], 1.2);
  y -= 15;
  for (const section of model.contents) {
    ensureSpace(29);
    pushText(section.number, margin, y, 10, "bold", [0.04, 0.35, 0.38]);
    pushText(section.title, margin + 34, y, 10, "regular", [0.18, 0.25, 0.28]);
    pushRule(margin + 34, y - 8, margin + contentWidth, [0.9, 0.92, 0.93], 0.4);
    y -= 28;
  }
  if (model.outstandingEvidence.length > 0) {
    pushText("A", margin, y, 10, "bold", [0.04, 0.35, 0.38]);
    pushText("Outstanding Evidence", margin + 34, y, 10, "regular");
    y -= 28;
  }
  if (model.evidenceSchedule.length > 0) {
    pushText("B", margin, y, 10, "bold", [0.04, 0.35, 0.38]);
    pushText("Supporting Evidence Schedule", margin + 34, y, 10, "regular");
    y -= 28;
  }
  pushText("C", margin, y, 10, "bold", [0.04, 0.35, 0.38]);
  pushText("Source Register", margin + 34, y, 10, "regular");
  y -= 28;
  if (model.limitations.length > 0) {
    pushText("D", margin, y, 10, "bold", [0.04, 0.35, 0.38]);
    pushText("Limitations", margin + 34, y, 10, "regular");
  }

  if (model.outstandingEvidence.length > 0) {
    newPage();
    addSectionTitle("A", "Outstanding Evidence");
    addCallout("Working document", model.statusDetail, {
      fill: [1, 0.97, 0.91],
      accent: [0.67, 0.34, 0.08],
    });
    for (const item of model.outstandingEvidence) {
      addCard(
        item.topic,
        `Required evidence: ${item.recommendedEvidence}`,
        `Effect: ${item.effect}`,
      );
    }
  }

  for (const section of model.sections) {
    newPage();
    addSectionTitle(section.number, section.title);
    addText(section.narrative, { size: 10.4, after: 12 });
    addCallout(
      "Evidence used",
      section.sources.map((source) => `${source.id} - ${source.title}`).join("; "),
    );
  }

  if (model.evidenceSchedule.length > 0) {
    newPage();
    addSectionTitle("B", "Supporting Evidence Schedule");
    addText(
      "Reviewed project evidence used by the current Statement of Environmental Effects is listed below. Readability and indexing status remain evidence facts, not planning conclusions.",
      { size: 9.7, after: 12 },
    );
    for (const item of model.evidenceSchedule) {
      addCard(
        item.name,
        `${item.kind} | ${item.status}`,
        `Used in: ${item.usedIn || "Not assigned"}`,
      );
    }
  }

  newPage();
  addSectionTitle("C", "Source Register");
  for (const source of model.sourceRegister) {
    addCard(
      `${source.id} - ${source.title}`,
      source.type,
      `${source.provenance} | Checked ${source.checkedAt}`,
    );
  }

  if (model.limitations.length > 0) {
    newPage();
    addSectionTitle("D", "Limitations");
    for (const limitation of model.limitations) {
      addCallout("Limitation", limitation, {
        fill: [1, 0.97, 0.91],
        accent: [0.67, 0.34, 0.08],
      });
    }
  }

  // Page furniture is added after pagination is final.
  pages.forEach((primitives, index) => {
    if (index > 0) {
      primitives.push({
        kind: "line",
        x1: margin,
        y1: 800,
        x2: pageWidth - margin,
        y2: 800,
        color: [0.82, 0.86, 0.87],
        lineWidth: 0.5,
      });
      primitives.push({
        kind: "text",
        text: "PLANNERA",
        font: "bold",
        size: 8,
        x: margin,
        y: 814,
        color: [0.04, 0.35, 0.38],
      });
      primitives.push({
        kind: "text",
        text: model.siteLabel,
        font: "regular",
        size: 7.5,
        x: margin + 75,
        y: 814,
        color: [0.42, 0.49, 0.52],
      });
    }
    primitives.push({
      kind: "line",
      x1: margin,
      y1: 39,
      x2: pageWidth - margin,
      y2: 39,
      color: [0.84, 0.87, 0.88],
      lineWidth: 0.5,
    });
    primitives.push({
      kind: "text",
      text: `Plannera | ${presentation.footerLabel}`,
      font: "regular",
      size: 7.5,
      x: margin,
      y: 23,
      color: [0.42, 0.49, 0.52],
    });
    primitives.push({
      kind: "text",
      text: `${index + 1} / ${pages.length}`,
      font: "regular",
      size: 7.5,
      x: pageWidth - margin - 34,
      y: 23,
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
      .map((primitive) => {
        if (primitive.kind === "text") {
          const font = primitive.font === "bold" ? "F2" : "F1";
          const [red, green, blue] = primitive.color;
          return `BT /${font} ${primitive.size.toFixed(2)} Tf ${red.toFixed(
            3,
          )} ${green.toFixed(3)} ${blue.toFixed(3)} rg 1 0 0 1 ${primitive.x.toFixed(
            2,
          )} ${primitive.y.toFixed(2)} Tm (${pdfSafe(primitive.text)}) Tj ET`;
        }
        if (primitive.kind === "line") {
          const [red, green, blue] = primitive.color;
          return `q ${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(
            3,
          )} RG ${primitive.lineWidth.toFixed(2)} w ${primitive.x1.toFixed(
            2,
          )} ${primitive.y1.toFixed(2)} m ${primitive.x2.toFixed(
            2,
          )} ${primitive.y2.toFixed(2)} l S Q`;
        }
        const operations: string[] = ["q"];
        if (primitive.fill) {
          const [red, green, blue] = primitive.fill;
          operations.push(
            `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)} rg`,
          );
        }
        if (primitive.stroke) {
          const [red, green, blue] = primitive.stroke;
          operations.push(
            `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)} RG`,
            `${(primitive.lineWidth ?? 0.5).toFixed(2)} w`,
          );
        }
        operations.push(
          `${primitive.x.toFixed(2)} ${primitive.y.toFixed(
            2,
          )} ${primitive.width.toFixed(2)} ${primitive.height.toFixed(2)} re`,
        );
        operations.push(
          primitive.fill && primitive.stroke
            ? "B"
            : primitive.fill
              ? "f"
              : "S",
          "Q",
        );
        return operations.join(" ");
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
