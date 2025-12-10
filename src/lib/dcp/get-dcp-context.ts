import type { ScoredDcpClause } from "./search";

import { searchDcpClauses } from "./search";

const MAX_RESULTS = 5;

export const getDCPContext = async (lga: string, query: string): Promise<ScoredDcpClause[]> => {
  if (!query.trim()) return [];
  const clauses = await searchDcpClauses({ query, lgaCode: lga, limit: MAX_RESULTS });
  return clauses;
};
