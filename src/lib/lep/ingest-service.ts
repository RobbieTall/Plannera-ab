import { prisma } from "@/lib/prisma";

import { parseNswLepXml } from "./nsw-lep-parser";
import type { LepParseResult } from "./types";

export async function ingestLepXmlForProject({
  projectId,
  xml,
}: {
  projectId: string;
  xml: string;
}): Promise<LepParseResult> {
  const parsed = parseNswLepXml(xml);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      lepData: parsed,
    },
  });

  return parsed;
}
