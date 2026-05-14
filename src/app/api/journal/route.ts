import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalEntries, journalUsers } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { getMoonPhase } from "../../../../lib/astrology";
import { calculatePersonalDay } from "../../../../lib/numerology";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONTENT_LENGTH = 50_000;

export async function GET(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const { searchParams } = new URL(req.url);
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 100);
      const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
      const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);

      if (from && !DATE_RE.test(from)) {
        throw new ValidationError("from must be in YYYY-MM-DD format");
      }
      if (to && !DATE_RE.test(to)) {
        throw new ValidationError("to must be in YYYY-MM-DD format");
      }

      const conditions = [eq(journalEntries.userId, user.dbUserId)];
      if (from) conditions.push(gte(journalEntries.entryDate, from));
      if (to) conditions.push(lte(journalEntries.entryDate, to));

      const whereClause = and(...conditions);

      const [[{ total }], entries] = await Promise.all([
        journalDb
          .select({ total: count() })
          .from(journalEntries)
          .where(whereClause),
        journalDb
          .select()
          .from(journalEntries)
          .where(whereClause)
          .orderBy(desc(journalEntries.entryDate))
          .limit(limit)
          .offset(offset),
      ]);

      return NextResponse.json({ entries, total, limit, offset });
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function POST(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const body = await req.json();
      const { title, content, mood, energy, tags, entryDate } = body;

      if (!content?.trim()) {
        throw new ValidationError("Journal entry content is required");
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        throw new ValidationError(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
      }
      if (mood !== undefined && (typeof mood !== "number" || mood < 1 || mood > 10)) {
        throw new ValidationError("mood must be a number between 1 and 10");
      }
      if (energy !== undefined && (typeof energy !== "number" || energy < 1 || energy > 10)) {
        throw new ValidationError("energy must be a number between 1 and 10");
      }
      if (entryDate && !DATE_RE.test(entryDate)) {
        throw new ValidationError("entryDate must be in YYYY-MM-DD format");
      }
      if (tags !== undefined && !Array.isArray(tags)) {
        throw new ValidationError("tags must be an array");
      }

      const date = entryDate ?? new Date().toISOString().slice(0, 10);

      const [moonPhaseResult, [dbUser]] = await Promise.all([
        Promise.resolve(getMoonPhase(date)),
        journalDb
          .select({ birthDate: journalUsers.birthDate })
          .from(journalUsers)
          .where(eq(journalUsers.id, user.dbUserId))
          .limit(1),
      ]);

      const numerologyDay = dbUser?.birthDate
        ? calculatePersonalDay(dbUser.birthDate, date)
        : null;

      const [entry] = await journalDb
        .insert(journalEntries)
        .values({
          userId: user.dbUserId,
          title,
          content: content.trim(),
          mood,
          energy,
          tags: tags ?? [],
          entryDate: date,
          moonPhase: moonPhaseResult.phase,
          numerologyDay,
          syncedAt: new Date(),
        })
        .returning();

      return NextResponse.json(entry, { status: 201 });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
