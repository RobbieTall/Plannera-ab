import type { HTMLElement } from "node-html-parser";

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

const padCells = (cells: string[], targetLength: number) => {
  if (cells.length >= targetLength) return cells;
  const padded = [...cells];
  while (padded.length < targetLength) padded.push("-");
  return padded;
};

export const tableToMarkdown = (table: HTMLElement): string => {
  const rows = table
    .querySelectorAll("tr")
    .map((row) => row.querySelectorAll("th,td").map((cell) => normalize(cell.textContent || "")))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (!rows.length) return "";

  const header = rows[0].some((cell) => cell) ? rows[0] : [];
  const bodyRows = header.length ? rows.slice(1) : rows;
  const columnCount = Math.max(header.length || 0, ...bodyRows.map((row) => row.length));

  const headerRow = header.length ? padCells(header, columnCount) : Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
  const separatorRow = Array.from({ length: columnCount }, () => "---");
  const lines = [headerRow, separatorRow, ...bodyRows.map((row) => padCells(row, columnCount))];

  const markdown = lines.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return markdown;
};
