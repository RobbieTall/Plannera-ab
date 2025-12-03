import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../data/nsw");
const TARGET_EXTENSIONS = new Set([".xml", ".html", ".htm", ".pdf"]);

interface SourceRecord {
  filePath: string;
  lga: string;
  format: string;
}

const normaliseLga = (filename: string) => {
  const base = filename.replace(/\.[^.]+$/, "");
  const lepIndex = base.toLowerCase().indexOf("-lep-");
  const lgaPart = lepIndex >= 0 ? base.slice(0, lepIndex) : base;
  return lgaPart.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
};

const walk = (dir: string, results: SourceRecord[]) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!TARGET_EXTENSIONS.has(ext)) {
      continue;
    }

    results.push({
      filePath: path.relative(path.resolve(__dirname, ".."), fullPath),
      lga: normaliseLga(entry.name),
      format: ext.replace(/^\./, ""),
    });
  }
};

const main = () => {
  const sources: SourceRecord[] = [];
  walk(ROOT, sources);

  const sorted = sources.sort((a, b) => a.lga.localeCompare(b.lga));
  console.log("Detected NSW LEP source files (by LGA):\n");
  for (const source of sorted) {
    console.log(`- ${source.lga} [${source.format}] → ${source.filePath}`);
  }

  console.log(`\nTotal LGAs detected: ${new Set(sorted.map((s) => s.lga)).size}`);
  console.log(`Total files detected: ${sorted.length}`);
};

main();
