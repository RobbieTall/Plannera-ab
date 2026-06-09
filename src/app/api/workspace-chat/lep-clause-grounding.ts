export type WorkspaceLepClause = {
  clauseNumber: string | null;
  heading: string | null;
  zone: string | null;
  content: string | null;
};

export const shouldSearchLepClauses = (message: string): boolean => {
  const normalised = message.toLowerCase();
  return [
    "height",
    "floor space",
    "fsr",
    "setback",
    "lot size",
    "permissib",
    "permitted",
    "prohibited",
    "consent",
    "zone",
    "objective",
    "land use",
    "dwelling",
    "secondary",
    "development",
    "subdivision",
    "complying",
    "exempt",
    "clause",
    "lep",
    "local environmental",
  ].some((kw) => normalised.includes(kw));
};

export const buildLepClausePrompt = (clauses: WorkspaceLepClause[]): string => {
  if (clauses.length === 0) return "";
  const lines = clauses.map(
    (clause) =>
      `[cl. ${clause.clauseNumber ?? "?"}] ${clause.heading ?? ""}${clause.zone ? ` (zone: ${clause.zone})` : ""}\n${(clause.content ?? "").slice(0, 600)}`,
  );
  return `## LEP Clauses\nThe following clauses are from the ingested Local Environmental Plan for this LGA. Cite them by reference (e.g. "Byron LEP 2014 cl. 4.3") when answering.\n\n${lines.join("\n\n")}`;
};
