import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalEntries, journalInsights, journalUsers, journalPatterns } from "../../../../../db";
import { authenticateRequest } from "../../../../../lib/auth";
import { handleApiError, ValidationError } from "../../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../../lib/middleware/security";
import { generateJournalInsight } from "../../../../../lib/openai";
import { getNumerologyProfile } from "../../../../../lib/numerology";
import { getDailyAstrology } from "../../../../../lib/astrology";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const body = await req.json();
      const { entryId } = body;

      if (!entryId) throw new ValidationError("entryId is required");

      const [entry] = await journalDb
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, entryId))
        .limit(1);

      if (!entry || entry.userId !== user.dbUserId) {
        throw new ValidationError("Entry not found or access denied");
      }

      const [dbUser] = await journalDb
        .select()
        .from(journalUsers)
        .where(eq(journalUsers.id, user.dbUserId))
        .limit(1);

      const patterns = await journalDb
        .select({ description: journalPatterns.description })
        .from(journalPatterns)
        .where(eq(journalPatterns.userId, user.dbUserId))
        .orderBy(desc(journalPatterns.updatedAt))
        .limit(5);

      const numerologyContext = dbUser?.birthDate
        ? getNumerologyProfile(dbUser.birthDate)
        : undefined;

      const astrologyContext = dbUser?.sunSign
        ? (() => {
            const daily = getDailyAstrology(dbUser.sunSign!, entry.entryDate);
            return {
              sunSign: dbUser.sunSign!,
              moonPhase: daily.moonPhase.phase,
              dailyGuidance: daily.dailyGuidance,
            };
          })()
        : undefined;

      const insight = await generateJournalInsight({
        journalContent: entry.content,
        mood: entry.mood ?? undefined,
        energy: entry.energy ?? undefined,
        numerologyContext,
        astrologyContext,
        recentPatterns: patterns.map((p) => p.description),
      });

      const [saved] = await journalDb
        .insert(journalInsights)
        .values({
          userId: user.dbUserId,
          entryId: entry.id,
          type: insight.type,
          title: insight.title,
          content: insight.content,
          numerologyContext,
          astrologyContext,
        })
        .returning();

      return NextResponse.json(saved, { status: 201 });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
