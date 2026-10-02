import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { MANUAL_LEP_SNAPSHOTS, planIsolatedLepRefresh } from "./prepare-isolated-lep-source-refresh.mjs";
const sha = x => createHash("sha256").update(x).digest("hex");
function fixture(council = "BYRON") {
  const spec = MANUAL_LEP_SNAPSHOTS[council], updatedAt = "2026-06-13T00:00:00.000Z";
  const parsed = Array.from({length:spec.mainCount},(_,i)=>({clauseKey:spec.prefix+"_1_"+(i+1),title:"Clause "+(i+1),
    bodyText:"Rule "+i,bodyHtml:"<p>Rule "+i+"</p>",hierarchyPath:["Part 1","Clause "+(i+1)],contentHash:sha("Rule "+i)}));
  const history = parsed.map((p,i)=>({...p,id:"old_"+i,instrumentId:"instrument_"+council,slug:"lep_"+council,
    name:spec.name,sourceUrl:"https://legislation.nsw.gov.au/view/html/inforce/current/"+spec.instrument,
    instrumentUpdatedAt:updatedAt,version:1,isCurrent:true,retrievedAt:updatedAt,effectiveFrom:null,effectiveTo:null,
    updatedAt,bodyTextSha256:sha(p.bodyText),bodyHtmlSha256:sha(p.bodyHtml)}));
  const statuses=parsed.map((p,i)=>({xmlId:"sec.1."+(i+1),number:"1."+(i+1),status:i===0?"repealed":"operative"}));
  return {council,projectId:"red-term-77984898",branchId:spec.branchId,databaseName:"neondb",
    receipt:{acquisition:"user-manual-official-browser-download",originalSha256:spec.originalSha256,
      versionId:spec.versionId,localFileModifiedAt:spec.completedAt,httpRetrievedAt:null},
    history,parsed,statuses,now:new Date("2026-09-30T10:00:00Z")};
}
for(const council of ["BYRON","KEMPSEY"]) test(council+" preserves history and represents manual acquisition honestly",()=>{
 const plan=planIsolatedLepRefresh(fixture(council));
 assert.equal(plan.counts.retire,1);assert.equal(plan.httpRetrievedAt,null);
 assert.match(plan.statements.join("\n"),/historical_bodies_preserved/);
 assert.doesNotMatch(plan.statements.join("\n"),/DELETE FROM|TRUNCATE|ALTER TABLE|lastSyncedAt|UPDATE public\."Clause" c SET\s+"body/);
});
test("new text gets a version beyond every historical version",()=>{
 const x=fixture();x.history.push({...x.history[1],id:"older_9",version:9,isCurrent:false});
 x.parsed[1].bodyText="Changed";x.parsed[1].contentHash=sha("Changed");
 const p=planIsolatedLepRefresh(x).operations.find(x=>x.action==="version");
 assert.equal(p.version,10);assert.equal(p.id,"old_1");assert.equal(p.bodyText,"Changed");
});
test("new operative key is added without inventing effective dates",()=>{
 const x=fixture();x.history.splice(1,1);
 const plan=planIsolatedLepRefresh(x);assert.equal(plan.counts.add,1);
 assert.match(plan.statements[6],/true, NULL, NULL/);
});
test("repealed provision with no parser body can still retire preserved old row",()=>{
 const x=fixture();x.parsed.shift();
 assert.equal(planIsolatedLepRefresh(x).counts.retire,1);
});
test("already historical repeal is never reactivated",()=>{
 const x=fixture();x.history[0].isCurrent=false;
 assert.equal(planIsolatedLepRefresh(x).counts.retire,undefined);
});
test("grouped repeal maps the actual heading without guessing separate clauses",()=>{
 const x=fixture();const key=MANUAL_LEP_SNAPSHOTS.BYRON.prefix+"_1_1_1_2";
 x.statuses[0].number="1.1, 1.2";x.history[0].clauseKey=key;x.parsed[0].clauseKey=key;
 assert.equal(planIsolatedLepRefresh(x).operations.find(x=>x.action==="retire").clauseKey,key);
});
test("unmapped schedule history is left untouched",()=>{
 const x=fixture();x.history.push({...x.history[1],id:"schedule",clauseKey:"BYRON_2014_1",title:"Legacy schedule",isCurrent:true});
 const plan=planIsolatedLepRefresh(x);assert.equal(plan.untouchedHistory,1);
 assert.ok(!plan.operations.some(x=>x.id==="schedule"));
});
for(const [name,mutate] of [
 ["Production target",x=>x.branchId="br-odd-pine-a7nph47f"],
 ["other council target",x=>x.branchId=MANUAL_LEP_SNAPSHOTS.KEMPSEY.branchId],
 ["wrong project",x=>x.projectId="other"],
 ["wrong database",x=>x.databaseName="other"],
 ["wrong original",x=>x.receipt.originalSha256="b".repeat(64)],
 ["wrong official version",x=>x.receipt.versionId="other"],
 ["fabricated HTTP receipt",x=>x.receipt.httpRetrievedAt=x.receipt.localFileModifiedAt],
 ["freshened filesystem time",x=>x.receipt.localFileModifiedAt="2026-09-30T09:00:00Z"],
 ["wrong acquisition",x=>x.receipt.acquisition="automatic"],
 ["stale manual snapshot",x=>x.now=new Date("2026-10-08T10:00:00Z")],
 ["future snapshot",x=>x.now=new Date("2026-09-29T10:00:00Z")],
 ["missing XML status coverage",x=>x.statuses.pop()],
 ["unknown XML status",x=>x.statuses[0].status="unknown"],
 ["duplicate XML identity",x=>x.statuses[1]={...x.statuses[0]}],
 ["malicious XML identity",x=>x.statuses[0].xmlId="'; DROP TABLE x; --"],
 ["duplicate current key",x=>x.history.push({...x.history[1],id:"extra_current",version:2})],
 ["duplicate historical version",x=>x.history.push({...x.history[1],id:"extra_version"})],
 ["wrong instrument",x=>x.history[1].instrumentId="other"],
 ["altered parsed body",x=>x.parsed[1].bodyText="Altered"],
 ["missing operative parse",x=>x.parsed.splice(1,1)],
]) test("rejects "+name,()=>{const x=fixture();mutate(x);assert.throws(()=>planIsolatedLepRefresh(x),/precondition_failed/);});
test("quotation marks in original text are escaped as SQL data",()=>{
 const x=fixture();x.parsed[1].bodyText="Council's rule";x.parsed[1].contentHash=sha(x.parsed[1].bodyText);
 const plan=planIsolatedLepRefresh(x);assert.ok(plan.statements[5].includes("Council''s rule"));
});
