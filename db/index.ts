import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DRME_DATABASE_URL!);
export const journalDb = drizzle(sql, { schema });

export * from "./schema";
