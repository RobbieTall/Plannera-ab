import { LEP_XML_FIXTURES } from "@/lib/legislation/fixtures";
import { extractZoneSummaryFromXmlFixture } from "@/lib/lep/quick-site-check";

const xml = LEP_XML_FIXTURES.BYRON_2014;

if (!xml) {
  console.error("Byron LEP XML fixture not found.");
  process.exit(1);
}

const zones = ["R2", "R3"];

for (const zone of zones) {
  const result = extractZoneSummaryFromXmlFixture(xml, zone);
  if (!result) {
    console.error(`Zone ${zone} could not be extracted from the fixture.`);
    process.exit(1);
  }

  const objectiveCount = result.summary.objectives.length;
  const landUseCount =
    result.summary.landUse.withoutConsent.length +
    result.summary.landUse.withConsent.length +
    result.summary.landUse.prohibited.length;

  if (!objectiveCount || !landUseCount) {
    console.error(
      `Zone ${zone} extraction failed: objectives=${objectiveCount}, landUseTotal=${landUseCount}.`,
    );
    process.exit(1);
  }

  console.log(
    `Zone ${zone} extracted from ${result.clausegroupId} with ${objectiveCount} objectives and ${landUseCount} land-use entries.`,
  );
}
