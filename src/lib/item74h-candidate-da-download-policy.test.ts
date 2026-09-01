import { describe, expect, it } from "vitest";

import {
  ITEM74H_CANDIDATE_DA_EXPECTED_DOCUMENTS,
  Item74hCandidateDaPolicyError,
  parseApprovedItem74hCandidateDaCatalog,
} from "./item74h-candidate-da-download-policy";

const row = (
  recordNumber: string,
  description: string,
  key: string,
) => `
  <tr>
    <td>${recordNumber}</td>
    <td>${description}</td>
    <td>PDF</td>
    <td>
      <a href="https://mho-da-api.byron.nsw.gov.au/masterviewui-external/Document/Download?fileName=${encodeURIComponent(
        "10.2026.223.1 - " + description + ".PDF",
      )}&key=${encodeURIComponent(key)}">View</a>
    </td>
  </tr>`;

const validHtml = `
  <h1>Application: Development Application (10.2026.223.1)</h1>
  <div>Description: Shed</div>
  <div>33 Lorikeet Ln, Mullumbimby 2482 NSW (LOT: 138 DP: 1265934)</div>
  <div>Application Status: Determined</div>
  <div>Determination Type: Approved</div>
  <table>
    ${row("E2026/47502", "DA Stamped Plans", "YWJjZGVmZ2g=")}
    ${row(
      "E2026/47506",
      "SITE PLAN_SHED_33 Lorikeet Lane_24042026 v2026",
      "aWprbG1ub3A=",
    )}
    ${row(
      "E2026/47509",
      "Survey_33 Lorikeet Lane Mullumbimby",
      "cXJzdHV2d3g=",
    )}
    ${row(
      "E2026/80895",
      "Notice of Determination",
      "eXphYmNkZWY=",
    )}
  </table>`;

describe("Item 74H candidate DA download policy", () => {
  it("accepts only the exact approved Council case and four bounded records", () => {
    const catalog = parseApprovedItem74hCandidateDaCatalog(validHtml);

    expect(catalog.approved).toBe(true);
    expect(catalog.daNumber).toBe("10.2026.223.1");
    expect(catalog.documents).toHaveLength(4);
    expect(catalog.documents.map(({ role }) => role)).toEqual([
      "STAMPED_PLANS",
      "SITE_PLAN",
      "CADASTRAL_SURVEY",
      "DETERMINATION",
    ]);
    expect(
      catalog.documents.every(
        ({ maxBytes }) => maxBytes === 2 * 1024 * 1024,
      ),
    ).toBe(true);
    expect(ITEM74H_CANDIDATE_DA_EXPECTED_DOCUMENTS).toHaveLength(4);
  });

  it("rejects a changed case, origin or duplicated record", () => {
    const cases = [
      validHtml.replace("Determination Type: Approved", "Determination Type: Refused"),
      validHtml.replace(
        "mho-da-api.byron.nsw.gov.au",
        "untrusted.example",
      ),
      validHtml.replace("</table>", row("E2026/47509", "Survey_33 Lorikeet Lane Mullumbimby", "YWJjZGVmZ2g=") + "</table>"),
    ];

    for (const html of cases) {
      expect(() => parseApprovedItem74hCandidateDaCatalog(html)).toThrow(
        Item74hCandidateDaPolicyError,
      );
    }
  });
});
