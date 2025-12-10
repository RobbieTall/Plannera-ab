import type { DCPClause } from "@prisma/client";

import { searchDcpClauses } from "./search";

const MAX_RESULTS = 5;

export const getDCPContext = async (lga: string, query: string): Promise<DCPClause[]> => {
  if (!query.trim()) return [];
  const clauses = await searchDcpClauses({ query, lgaCode: lga, limit: MAX_RESULTS });
  return clauses;
};
