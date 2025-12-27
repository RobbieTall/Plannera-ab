import fs from "fs";
import { createRequire } from "module";
import path from "path";

let byronLep2014: string;

try {
  const require = createRequire(import.meta.url);
  const imported = require("./byron-lep-2014.xml") as { default?: string } | string;
  byronLep2014 = typeof imported === "string" ? imported : imported.default ?? "";
} catch {
  const fixturePath = path.join(__dirname, "byron-lep-2014.xml");
  byronLep2014 = fs.readFileSync(fixturePath, "utf-8");
}

export const LEP_XML_FIXTURES: Record<string, string> = {
  BYRON_2014: byronLep2014,
};
