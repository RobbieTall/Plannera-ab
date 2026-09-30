import { test } from "node:test";
import assert from "node:assert/strict";
import { dcpDocumentScopeIssue } from "../src/lib/dcp/document-applicability";

const input = (chapter: string, siteZone = "R2") => ({
  lgaCode: "BYRON", headingPath: ["Byron Shire Development Control Plan 2014", chapter], siteZone,
});
test("West Byron is not established by matching R2 zoning", () => {
  assert.equal(dcpDocumentScopeIssue(input("Chapter E8 West Byron Urban Release Area")), "location_scope_unverified");
});
test("all explicit Byron area chapters need verified site binding", () => {
  for (const chapter of ["E1", "E8", "E10", "E99"])
    assert.equal(dcpDocumentScopeIssue(input("Chapter " + chapter)), "location_scope_unverified");
});
test("missing zone cannot qualify an area chapter", () => {
  assert.equal(dcpDocumentScopeIssue({...input("Chapter E8"), siteZone:null}), "location_scope_unverified");
});
test("commercial zoning cannot qualify an area chapter either", () => {
  assert.equal(dcpDocumentScopeIssue(input("Chapter E8", "E2 Commercial Centre")), "location_scope_unverified");
});
test("hierarchy identifies Byron when memo lacks council metadata", () => {
  assert.equal(dcpDocumentScopeIssue({...input("Chapter E8"), lgaCode:null}), "location_scope_unverified");
});
test("commercial chapter is unconfirmed for residential zones", () => {
  for (const zone of ["R1", "R2", "R3", "R4", "R5"])
    assert.equal(dcpDocumentScopeIssue(input("Chapter D4 Commercial and Retail Development", zone)), "residential_proposal_scope_unverified");
});
test("rural housing chapter does not qualify ordinary residential zoning", () => {
  assert.equal(dcpDocumentScopeIssue(input("Chapter D2 Rural Development")), "residential_proposal_scope_unverified");
});
test("general controls remain candidates, not certified applicable controls", () => {
  assert.equal(dcpDocumentScopeIssue(input("Chapter B3 Services")), null);
});
test("ordinary residential chapter is not excluded", () => {
  assert.equal(dcpDocumentScopeIssue(input("Chapter D1 Residential Development")), null);
});
test("commercial chapter remains a candidate for E2", () => {
  assert.equal(dcpDocumentScopeIssue(input("Chapter D4 Commercial and Retail Development", "E2")), null);
});
test("Kempsey chapter identifiers do not inherit Byron semantics", () => {
  assert.equal(dcpDocumentScopeIssue({lgaCode:"KEMPSEY",headingPath:["Kempsey DCP","Chapter E8"],siteZone:"R2"}),null);
});
test("chapter references outside the structured hierarchy do not decide scope", () => {
  assert.equal(dcpDocumentScopeIssue({lgaCode:"BYRON",headingPath:["Chapter B3 General controls"],siteZone:"R2"}),null);
});
