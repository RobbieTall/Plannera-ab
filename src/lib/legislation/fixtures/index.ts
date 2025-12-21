import fs from "fs";
import path from "path";

let byronLep2014: string;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  byronLep2014 = require("./byron-lep-2014.xml").default as string;
} catch {
  const fixturePath = path.join(__dirname, "byron-lep-2014.xml");
  byronLep2014 = fs.readFileSync(fixturePath, "utf-8");
}

export const LEP_XML_FIXTURES: Record<string, string> = {
  BYRON_2014: byronLep2014,
};
