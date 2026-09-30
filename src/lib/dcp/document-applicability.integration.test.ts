import { beforeEach, describe, expect, it, vi } from "vitest";
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { dCPClause: { findMany } } }));
import { searchDcpClauses } from "./search";

function row(id:string, chapter:string, body="Minimum front setback 4 metres. R2 parking landscaping building design.") {
  return {id,lgaCode:"BYRON",instrumentSlug:"byron-dcp-2014",ref:"B3",title:"General requirements",
    headingPath:["Byron Shire Development Control Plan 2014",chapter],bodyText:body,bodyHtml:body,
    topicTags:["setbacks"],numericMeta:null,depth:2,parentRef:null,
    createdAt:new Date("2026-09-30T01:00:00Z"),updatedAt:new Date("2026-09-30T01:00:00Z")};
}
describe("document retrieval scope guard", () => {
  beforeEach(() => vi.clearAllMocks());
  it("filters area-specific candidates before the result limit", async () => {
    const wrong=Array.from({length:8},(_,i)=>row("area-"+i,"Chapter E8 West Byron Urban Release Area","R2 setback parking landscaping ".repeat(20)));
    findMany.mockResolvedValue([...wrong,row("general","Chapter D1 Residential Development")]);
    const result=await searchDcpClauses({query:"R2 setback parking",siteZone:"R2",lgaCode:"BYRON",limit:1});
    expect(result.map(x=>x.id)).toEqual(["general"]);
  });
  it("body keywords cannot rescue a commercial chapter for housing", async () => {
    findMany.mockResolvedValue([row("commercial","Chapter D4 Commercial and Retail Development"),row("general","Chapter D1 Residential Development")]);
    expect((await searchDcpClauses({query:"R2 building design commercial frontage",siteZone:"R2",lgaCode:"BYRON"})).map(x=>x.id)).toEqual(["general"]);
  });
  it("preserves exact row identity and metadata of retained candidates", async () => {
    const source=row("general","Chapter B3 General controls");
    findMany.mockResolvedValue([source]);
    const [result]=await searchDcpClauses({query:"setback",siteZone:"R2",lgaCode:"BYRON"});
    expect(result.id).toBe(source.id);
    expect(result.headingPath).toEqual(source.headingPath);
    expect(result.updatedAt).toEqual(source.updatedAt);
    expect(result.bodyText).toBe(source.bodyText);
  });
  it("does not rewrite council-specific semantics for Kempsey", async () => {
    const source={...row("kempsey","Chapter E8"),lgaCode:"KEMPSEY",headingPath:["Kempsey Development Control Plan","Chapter E8"]};
    findMany.mockResolvedValue([source]);
    expect((await searchDcpClauses({query:"setback",siteZone:"R2",lgaCode:"KEMPSEY"})).map(x=>x.id)).toEqual(["kempsey"]);
  });
});
