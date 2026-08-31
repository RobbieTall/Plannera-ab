import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM74H_PUBLIC_DA_EXPECTED_DOCUMENTS,
  Item74hPublicDaPolicyError,
  parseApprovedItem74hPublicDaCatalog,
} from "../src/lib/pathway-public-da-download-policy";

const validHref = (_record: string, description: string) =>
  "https://mho-da-api.byron.nsw.gov.au/masterviewui-external/Document/Download?fileName=" +
  encodeURIComponent("10.2025.535.1 - " + description + ".PDF") +
  "&key=YWJjZGVmZ2g%3D";

const approvedHtml = (
  hrefFor: (record: string, description: string) => string,
) =>
  "<html><body>" +
  "<h2>Application: Development Application (10.2025.535.1)</h2>" +
  "<div>Dual Occupancy (Detached) comprising an Existing Dwelling, a New Dwelling and a New Farm Shed</div>" +
  "<div>Application Status: Determined</div>" +
  "<div>Determination Type: Approved</div>" +
  "<table><tbody>" +
  ITEM74H_PUBLIC_DA_EXPECTED_DOCUMENTS.map(
    (document) =>
      "<tr><td>" +
      document.recordNumber +
      "</td><td>" +
      document.descriptionFragment +
      "</td><td>PDF</td><td><a href=\"" +
      hrefFor(document.recordNumber, document.descriptionFragment) +
      "\">View</a></td></tr>",
  ).join("") +
  "</tbody></table></body></html>";

test("accepts only the exact approved Byron case and expected document set", () => {
  const result = parseApprovedItem74hPublicDaCatalog(approvedHtml(validHref));
  assert.equal(result.approved, true);
  assert.equal(result.documents.length, 6);
  assert.deepEqual(
    result.documents.map((document) => document.recordNumber),
    ITEM74H_PUBLIC_DA_EXPECTED_DOCUMENTS.map(
      (document) => document.recordNumber,
    ),
  );
});

test("rejects a foreign document origin", () => {
  assert.throws(
    () =>
      parseApprovedItem74hPublicDaCatalog(
        approvedHtml((record, description) =>
          validHref(record, description).replace(
            "mho-da-api.byron.nsw.gov.au",
            "example.com",
          ),
        ),
      ),
    (error) =>
      error instanceof Item74hPublicDaPolicyError &&
      error.code === "UNTRUSTED_DOWNLOAD_ORIGIN",
  );
});

test("rejects extra capability parameters", () => {
  assert.throws(
    () =>
      parseApprovedItem74hPublicDaCatalog(
        approvedHtml(
          (record, description) =>
            validHref(record, description) + "&redirect=https://example.com",
        ),
      ),
    (error) =>
      error instanceof Item74hPublicDaPolicyError &&
      error.code === "UNEXPECTED_DOWNLOAD_PARAMETERS",
  );
});

test("rejects duplicate expected rows", () => {
  const html = approvedHtml(validHref).replace(
    "</tbody>",
    "<tr><td>E2025/131541</td><td>S138 Approval</td><td>PDF</td><td><a href=\"" +
      validHref("", "S138 Approval") +
      "\">View</a></td></tr></tbody>",
  );
  assert.throws(
    () => parseApprovedItem74hPublicDaCatalog(html),
    (error) =>
      error instanceof Item74hPublicDaPolicyError &&
      error.code === "DOCUMENT_ROW_CARDINALITY_MISMATCH",
  );
});

test("rejects a case that is not explicitly approved", () => {
  assert.throws(
    () =>
      parseApprovedItem74hPublicDaCatalog(
        approvedHtml(validHref).replace(
          "Determination Type: Approved",
          "Determination Type: Pending",
        ),
      ),
    (error) =>
      error instanceof Item74hPublicDaPolicyError &&
      error.code === "CASE_NOT_APPROVED_EXACT_MATCH",
  );
});
