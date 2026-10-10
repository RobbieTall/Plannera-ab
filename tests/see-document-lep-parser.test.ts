import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseInstrumentDocument } from "../src/lib/legislation/parser";
import type { InstrumentConfig } from "../src/lib/legislation/types";

const config: InstrumentConfig = {
  slug: "synthetic-lep", name: "Synthetic LEP", shortName: "Synthetic",
  instrumentType: "LEP", sourceUrl: "https://example.invalid/synthetic",
  clausePrefix: "SYNTHETIC_LEP",
};
const clause = (id: string, number: string, title: string, text: string) =>
  '<level type="clause" id="'+id+'"><head><no>'+number+'</no><heading>'+title+'</heading></head><block><txt>'+text+'</txt></block></level>';
const schedule = (number: string, body: string) =>
  '<level type="schedule" id="sch.'+number+'"><head><no>'+number+'</no><heading>Schedule</heading></head>'+body+'</level>';
const parse = (body: string) => parseInstrumentDocument(config, '<exdoc><content type="body">'+body+'</content></exdoc>', "xml");

test("main clause identity and content remain unchanged", () => {
  const [result] = parse(clause("sec.2.3", "2.3", "Zone objectives", "Synthetic main body"));
  assert.equal(result.clauseKey, "SYNTHETIC_LEP_2_3");
  assert.equal(result.title, "2.3 Zone objectives");
  assert.equal(result.bodyText, "Synthetic main body");
});
test("equal clause numbers in different schedules remain distinct", () => {
  const result = parse(schedule("1",clause("sch.1-sec.1","1","Site use","First body"))+
    schedule("6",clause("sch.6-sec.1","1","Conservation","Second body")));
  assert.deepEqual(result.map(c=>c.clauseKey), ["SYNTHETIC_LEP_SCH_1_SEC_1","SYNTHETIC_LEP_SCH_6_SEC_1"]);
  assert.deepEqual(result.map(c=>c.bodyText), ["First body","Second body"]);
  assert.equal(new Set(result.map(c=>c.clauseKey)).size,result.length);
});
test("nested schedule divisions retain the official provision identity", () => {
  const result = parse(schedule("6",'<level type="part" id="sch.6-pt.1"><head><no>1</no><heading>Part</heading></head>'+
    '<level type="division" id="sch.6-pt.1-div.1"><head><no>1</no><heading>Division</heading></head>'+
    clause("sch.6-sec.1","1","Conservation","Nested body")+'</level></level>'));
  assert.equal(result[0].clauseKey,"SYNTHETIC_LEP_SCH_6_SEC_1");
  assert.equal(result[0].title,"1 Conservation");
  assert.equal(result[0].hierarchyPath.length,4);
});
test("grouped zoning text remains in its parent provision", () => {
  const result = parse('<level type="clausegroup" id="pt-cg1.Zone_RU1"><head><no>RU1</no><heading>Primary Production</heading></head>'+
    clause("sec.1","1","Objectives","Objective content")+
    clause("sec.2","2","Permitted without consent","Permitted content")+'</level>');
  assert.equal(result.length,1);
  assert.equal(result[0].clauseKey,"SYNTHETIC_LEP_RU1");
  assert.ok(result[0].bodyText.includes("Objective content"));
  assert.ok(result[0].bodyText.includes("Permitted content"));
});
test("HTML clause keys are unaffected", () => {
  const [result] = parseInstrumentDocument(config,'<html><body><h2>4.3 Height of buildings</h2><p>Height body</p></body></html>',"html");
  assert.equal(result.clauseKey,"SYNTHETIC_LEP_4_3");
  assert.equal(result.bodyText,"Height body");
});

test("unnumbered schedule provisions keep their distinct official identities", () => {
  const result = parse(schedule("2",
    '<level type="clause" id="sch.2-sec"><head><heading>First unnumbered</heading></head><block><txt>First text</txt></block></level>'+
    '<level type="clause" id="sch.2-sec-oc.2"><head><heading>Second unnumbered</heading></head><block><txt>Second text</txt></block></level>'));
  assert.deepEqual(result.map(c => c.clauseKey), [
    "SYNTHETIC_LEP_SCH_2_SEC", "SYNTHETIC_LEP_SCH_2_SEC_OC_2",
  ]);
  assert.deepEqual(result.map(c => c.bodyText), ["First text", "Second text"]);
});
