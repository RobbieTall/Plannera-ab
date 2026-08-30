import { parse } from "node-html-parser";

export const ITEM74H_PUBLIC_DA_CASE_VERSION =
  "item74h-public-da-case.v1" as const;
export const ITEM74H_PUBLIC_DA_TRACKER_URL =
  "https://datracker.byron.nsw.gov.au/MasterViewUI-External/Application/ApplicationDetails/010.2025.00000535.001/" as const;
export const ITEM74H_PUBLIC_DA_NUMBER = "10.2025.535.1" as const;

export type Item74hPublicDaDocumentRole =
  | "ROAD_CLASSIFICATION"
  | "CADASTRAL_SURVEY"
  | "PROPOSED_SHED_LAYOUT"
  | "DETERMINATION";

type ExpectedDocument = {
  role: Item74hPublicDaDocumentRole;
  recordNumber: string;
  descriptionFragment: string;
  maxBytes: number;
};

export const ITEM74H_PUBLIC_DA_EXPECTED_DOCUMENTS: readonly ExpectedDocument[] = [
  {
    role: "ROAD_CLASSIFICATION",
    recordNumber: "E2025/131541",
    descriptionFragment: "S138 Approval",
    maxBytes: 2 * 1024 * 1024,
  },
  {
    role: "CADASTRAL_SURVEY",
    recordNumber: "E2025/131546",
    descriptionFragment: "Survey Plans",
    maxBytes: 12 * 1024 * 1024,
  },
  {
    role: "PROPOSED_SHED_LAYOUT",
    recordNumber: "E2026/59935",
    descriptionFragment: "Stamped Approved Plans",
    maxBytes: 12 * 1024 * 1024,
  },
  {
    role: "DETERMINATION",
    recordNumber: "E2026/60560",
    descriptionFragment: "Notice of Determination",
    maxBytes: 8 * 1024 * 1024,
  },
] as const;

export type Item74hPublicDaDocumentSource = ExpectedDocument & {
  downloadUrl: string;
};

export type Item74hPublicDaCatalog = {
  version: typeof ITEM74H_PUBLIC_DA_CASE_VERSION;
  daNumber: typeof ITEM74H_PUBLIC_DA_NUMBER;
  approved: true;
  documents: Item74hPublicDaDocumentSource[];
};

export class Item74hPublicDaPolicyError extends Error {
  constructor(readonly code: string) {
    super("Item 74H public DA source failed closed");
  }
}

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

const validateDownloadUrl = (rawHref: string, expected: ExpectedDocument) => {
  let url: URL;
  try {
    url = new URL(rawHref, ITEM74H_PUBLIC_DA_TRACKER_URL);
  } catch {
    throw new Item74hPublicDaPolicyError("INVALID_DOWNLOAD_URL");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "mho-da-api.byron.nsw.gov.au" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== "" ||
    url.pathname.toLowerCase() !==
      "/masterviewui-external/document/download"
  ) {
    throw new Item74hPublicDaPolicyError("UNTRUSTED_DOWNLOAD_ORIGIN");
  }

  const keys = [...url.searchParams.keys()].sort();
  if (
    keys.length !== 2 ||
    keys[0] !== "fileName" ||
    keys[1] !== "key" ||
    url.searchParams.getAll("fileName").length !== 1 ||
    url.searchParams.getAll("key").length !== 1
  ) {
    throw new Item74hPublicDaPolicyError("UNEXPECTED_DOWNLOAD_PARAMETERS");
  }

  const fileName = url.searchParams.get("fileName") ?? "";
  const key = url.searchParams.get("key") ?? "";
  if (
    !fileName.toLowerCase().endsWith(".pdf") ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..") ||
    !fileName.includes(ITEM74H_PUBLIC_DA_NUMBER) ||
    !normalize(fileName).includes(expected.descriptionFragment)
  ) {
    throw new Item74hPublicDaPolicyError("UNEXPECTED_DOCUMENT_FILENAME");
  }
  if (!/^[A-Za-z0-9+/]{8,64}={0,2}$/.test(key)) {
    throw new Item74hPublicDaPolicyError("INVALID_DOWNLOAD_CAPABILITY");
  }

  return url.toString();
};

export function parseApprovedItem74hPublicDaCatalog(
  html: string,
): Item74hPublicDaCatalog {
  if (Buffer.byteLength(html, "utf8") > 2 * 1024 * 1024) {
    throw new Item74hPublicDaPolicyError("TRACKER_RESPONSE_TOO_LARGE");
  }

  const root = parse(html);
  const pageText = normalize(root.textContent);
  if (
    !pageText.includes(
      "Application: Development Application (" + ITEM74H_PUBLIC_DA_NUMBER + ")",
    ) ||
    !pageText.includes("Application Status: Determined") ||
    !pageText.includes("Determination Type: Approved") ||
    !pageText.includes(
      "Dual Occupancy (Detached) comprising an Existing Dwelling, a New Dwelling and a New Farm Shed",
    )
  ) {
    throw new Item74hPublicDaPolicyError("CASE_NOT_APPROVED_EXACT_MATCH");
  }

  const rows = root.querySelectorAll("tr");
  const documents = ITEM74H_PUBLIC_DA_EXPECTED_DOCUMENTS.map((expected) => {
    const matchingRows = rows.filter((row) =>
      normalize(row.textContent).includes(expected.recordNumber),
    );
    if (matchingRows.length !== 1) {
      throw new Item74hPublicDaPolicyError("DOCUMENT_ROW_CARDINALITY_MISMATCH");
    }

    const row = matchingRows[0];
    const rowText = normalize(row.textContent);
    if (
      !rowText.includes(expected.descriptionFragment) ||
      !rowText.includes("PDF")
    ) {
      throw new Item74hPublicDaPolicyError("DOCUMENT_METADATA_MISMATCH");
    }

    const anchors = row.querySelectorAll("a[href]");
    if (anchors.length !== 1) {
      throw new Item74hPublicDaPolicyError("DOCUMENT_LINK_CARDINALITY_MISMATCH");
    }
    const href = anchors[0].getAttribute("href");
    if (!href) {
      throw new Item74hPublicDaPolicyError("DOCUMENT_LINK_MISSING");
    }

    return {
      ...expected,
      downloadUrl: validateDownloadUrl(href, expected),
    };
  });

  if (
    new Set(documents.map((document) => document.recordNumber)).size !==
      documents.length ||
    new Set(documents.map((document) => document.role)).size !== documents.length
  ) {
    throw new Item74hPublicDaPolicyError("DOCUMENT_SET_NOT_UNIQUE");
  }

  return {
    version: ITEM74H_PUBLIC_DA_CASE_VERSION,
    daNumber: ITEM74H_PUBLIC_DA_NUMBER,
    approved: true,
    documents,
  };
}
