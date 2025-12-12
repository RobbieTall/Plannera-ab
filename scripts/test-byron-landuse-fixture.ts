import fs from "fs";
import path from "path";

import { extractZoneFromXmlClausegroup } from "../src/lib/lep/zone-utils";

const fixturePath = path.resolve(process.cwd(), "data/nsw/xml/Byron-lep-2014.xml");

if (!fs.existsSync(fixturePath)) {
  console.error("Byron LEP fixture missing", { fixturePath });
  process.exit(1);
}

const xml = fs.readFileSync(fixturePath, "utf-8");
const zones = ["R2", "R3"] as const;

let failed = false;

for (const zone of zones) {
  const extraction = extractZoneFromXmlClausegroup(xml, zone);
  if (!extraction) {
    console.error(`No extraction returned for zone ${zone}`);
    failed = true;
    continue;
  }

  const landUseTotal =
    extraction.withoutConsent.length + extraction.withConsent.length + extraction.prohibited.length;

  if (!extraction.objectives.length) {
    console.error(`No objectives extracted for zone ${zone}`);
    failed = true;
  }

  if (!landUseTotal) {
    console.error(`No land-use entries extracted for zone ${zone}`);
    failed = true;
  }

  console.log(
    `Zone ${zone}: objectives=${extraction.objectives.length}, landUse without=${extraction.withoutConsent.length}, with=${extraction.withConsent.length}, prohibited=${extraction.prohibited.length}`,
  );
}

if (failed) {
  process.exit(1);
}
