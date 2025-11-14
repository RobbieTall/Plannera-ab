import { getNswPlanningSnapshot } from "@/lib/nsw";
import { parseProjectDescription } from "@/lib/project-parser";

async function main() {
  const params = parseProjectDescription("6 townhouses on a 1200sqm site in Bondi");
  const snapshot = await getNswPlanningSnapshot(params);
  console.log(`[nsw] property records: ${snapshot.property.length}`);
  console.log(`[nsw] water catchments: ${snapshot.water.length}`);
  console.log(`[nsw] trades profiles: ${snapshot.trades.length}`);
  console.log(`[nsw] first property: ${snapshot.property[0]?.address ?? "n/a"}`);
}

main().catch((error) => {
  console.error("NSW data check failed", error);
  process.exit(1);
});
