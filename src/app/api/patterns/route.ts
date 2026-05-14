import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalEntries, journalPatterns } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { analyzeJournalPatterns } from "../../../../lib/openai";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const patterns = await journalDb
        .select()
        .from(journalPatterns)
        .where(eq(journalPatterns.userId, user.dbUserId))
        .orderBy(desc(journalPatterns.updatedAt));

      return NextResponse.json({ patterns });
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function POST(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);

      const entries = await journalDb
        .select({
          content: journalEntries.content,
          mood: journalEntries.mood,
          entryDate: journalEntries.entryDate,
        })
        .from(journalEntries)
        .where(eq(journalEntries.userId, user.dbUserId))
        .orderBy(desc(journalEntries.entryDate))
        .limit(30);

      if (entries.length < 3) {
        return NextResponse.json({
          patterns: [],
          message: "Need at least 3 journal entries to detect patterns",
        });
      }

      const analyzed = await analyzeJournalPatterns(
        entries.map((e) => ({
          content: e.content,
          mood: e.mood ?? undefined,
          entryDate: e.entryDate,
        }))
      );

      const today = new Date().toISOString().slice(0, 10);
      const saved = await Promise.all(
        analyzed.map(async (p) => {
          const [pattern] = await journalDb
            .insert(journalPatterns)
            .values({
              userId: user.dbUserId,
              type: p.type,
              description: p.description,
              lastSeen: today,
            })
            .returning();
          return pattern;
        })
      );

      return NextResponse.json({ patterns: saved });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
