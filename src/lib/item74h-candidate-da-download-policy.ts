import { parse } from "node-html-parser";

export const ITEM74H_CANDIDATE_DA_CASE_VERSION =
  "item74h-candidate-da-case.v1" as const;
export const ITEM74H_CANDIDATE_DA_TRACKER_URL =
  "https://datracker.byron.nsw.gov.au/MasterViewUI-External/Application/ApplicationDetails/010.2026.00000223.001/" as const;
export const ITEM74H_CANDIDATE_DA_NUMBER = "10.2026.223.1" as const;
export const ITEM74H_CANDIDATE_DA_ADDRESS =
  "33 Lorikeet Ln, Mullumbimby 2482 NSW" as const;
export const ITEM74H_CANDIDATE_DA_LOT = "LOT: 138 DP: 1265934" as const;

export type Item74hCandidateDaDocumentRole =
  | "CADASTRAL_SURVEY"
  | "SITE_PLAN"
  | "STAMPED_PLANS"
  | "DETERMINATION";

type ExpectedDocument = {
  role: Item74hCandidateDaDocumentRole;
  recordNumber: string;
  descriptionFragment: string;
  maxBytes: number;
};

export const ITEM74H_CANDIDATE_DA_EXPECTED_DOCUMENTS: readonly ExpectedDocument[] =
  [
    {
      role: "STAMPED_PLANS",
      recordNumber: "E2026/47502",
      descriptionFragment: "DA Stamped Plans",
      maxBytes: 2 * 1024 * 1024,
    },
    {
      role: "SITE_PLAN",
      recordNumber: "E2026/47506",
      descriptionFragment: "SITE PLAN_SHED_33 Lorikeet Lane_24042026 v2026",
      maxBytes: 2 * 1024 * 1024,
    },
    {
      role: "CADASTRAL_SURVEY",
      recordNumber: "E2026/47509",
      descriptionFragment: "Survey_33 Lorikeet Lane Mullumbimby",
      maxBytes: 2 * 1024 * 1024,
    },
    {
      role: "DETERMINATION",
      recordNumber: "E2026/80895",
      descriptionFragment: "Notice of Determination",
      maxBytes: 2 * 1024 * 1024,
    },
  ] as const;

export type Item74hCandidateDaDocumentSource = ExpectedDocument & {
  downloadUrl: string;
};

export type Item74hCandidateDaCatalog = {
  version: typeof ITEM74H_CANDIDATE_DA_CASE_VERSION;
  daNumber: typeof ITEM74H_CANDIDATE_DA_NUMBER;
  approved: true;
  documents: Item74hCandidateDaDocumentSource[];
};

export class Item74hCandidateDaPolicyError extends Error {
  constructor(readonly code: string) {
    super("Item 74H candidate DA source failed closed");
  }
}

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

const validateDownloadUrl = (rawHref: string, expected: ExpectedDocument) => {
  let url: URL;
  try {
    url = new URL(rawHref, ITEM74H_CANDIDATE_DA_TRACKER_URL);
  } catch {
    throw new Item74hCandidateDaPolicyError("INVALID_DOWNLOAD_URL");
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
    throw new Item74hCandidateDaPolicyError("UNTRUSTED_DOWNLOAD_ORIGIN");
  }

  const keys = [...url.searchParams.keys()].sort();
  if (
    keys.length !== 2 ||
    keys[0] !== "fileName" ||
    keys[1] !== "key" ||
    url.searchParams.getAll("fileName").length !== 1 ||
    url.searchParams.getAll("key").length !== 1
  ) {
    throw new Item74hCandidateDaPolicyError(
      "UNEXPECTED_DOWNLOAD_PARAMETERS",
    );
  }

  const fileName = url.searchParams.get("fileName") ?? "";
  const key = url.searchParams.get("key") ?? "";
  if (
    !fileName.toLowerCase().endsWith(".pdf") ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..") ||
    !fileName.includes(ITEM74H_CANDIDATE_DA_NUMBER) ||
    !normalize(fileName).includes(expected.descriptionFragment)
  ) {
    throw new Item74hCandidateDaPolicyError(
      "UNEXPECTED_DOCUMENT_FILENAME",
    );
  }
  if (!/^[A-Za-z0-9+/]{8,64}={0,2}$/.test(key)) {
    throw new Item74hCandidateDaPolicyError(
      "INVALID_DOWNLOAD_CAPABILITY",
    );
  }

  return url.toString();
};

export function parseApprovedItem74hCandidateDaCatalog(
  html: string,
): Item74hCandidateDaCatalog {
  if (Buffer.byteLength(html, "utf8") > 2 * 1024 * 1024) {
    throw new Item74hCandidateDaPolicyError(
      "TRACKER_RESPONSE_TOO_LARGE",
    );
  }

  const root = parse(html);
  const pageText = normalize(root.textContent);
  if (
    !pageText.includes(
      "Application: Development Application (" +
        ITEM74H_CANDIDATE_DA_NUMBER +
        ")",
    ) ||
    !pageText.includes("Description: Shed") ||
    !pageText.includes(ITEM74H_CANDIDATE_DA_ADDRESS) ||
    !pageText.includes(ITEM74H_CANDIDATE_DA_LOT) ||
    !pageText.includes("Application Status: Determined") ||
    !pageText.includes("Determination Type: Approved")
  ) {
    throw new Item74hCandidateDaPolicyError(
      "CASE_NOT_APPROVED_EXACT_MATCH",
    );
  }

  const rows = root.querySelectorAll("tr");
  const documents = ITEM74H_CANDIDATE_DA_EXPECTED_DOCUMENTS.map(
    (expected) => {
      const matchingRows = rows.filter((row) =>
        normalize(row.textContent).includes(expected.recordNumber),
      );
      if (matchingRows.length !== 1) {
        throw new Item74hCandidateDaPolicyError(
          "DOCUMENT_ROW_CARDINALITY_MISMATCH",
        );
      }

      const row = matchingRows[0];
      const rowText = normalize(row.textContent);
      if (
        !rowText.includes(expected.descriptionFragment) ||
        !rowText.includes("PDF")
      ) {
        throw new Item74hCandidateDaPolicyError(
          "DOCUMENT_METADATA_MISMATCH",
        );
      }

      const anchors = row.querySelectorAll("a[href]");
      if (anchors.length !== 1) {
        throw new Item74hCandidateDaPolicyError(
          "DOCUMENT_LINK_CARDINALITY_MISMATCH",
        );
      }
      const href = anchors[0].getAttribute("href");
      if (!href) {
        throw new Item74hCandidateDaPolicyError(
          "DOCUMENT_LINK_MISSING",
        );
      }

      return {
        ...expected,
        downloadUrl: validateDownloadUrl(href, expected),
      };
    },
  );

  if (
    new Set(documents.map(({ recordNumber }) => recordNumber)).size !==
      documents.length ||
    new Set(documents.map(({ role }) => role)).size !== documents.length
  ) {
    throw new Item74hCandidateDaPolicyError(
      "DOCUMENT_SET_NOT_UNIQUE",
    );
  }

  return {
    version: ITEM74H_CANDIDATE_DA_CASE_VERSION,
    daNumber: ITEM74H_CANDIDATE_DA_NUMBER,
    approved: true,
    documents,
  };
}
