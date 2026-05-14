import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalEntries } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { getMoonPhase } from "../../../../lib/astrology";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const { searchParams } = new URL(req.url);
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

      const conditions = [eq(journalEntries.userId, user.dbUserId)];
      if (from) conditions.push(gte(journalEntries.entryDate, from));
      if (to) conditions.push(lte(journalEntries.entryDate, to));

      const entries = await journalDb
        .select()
        .from(journalEntries)
        .where(and(...conditions))
        .orderBy(desc(journalEntries.entryDate))
        .limit(limit);

      return NextResponse.json({ entries, total: entries.length });
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

      const date = entryDate ?? new Date().toISOString().slice(0, 10);
      const moonPhase = getMoonPhase(date).phase;

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
          moonPhase,
          syncedAt: new Date(),
        })
        .returning();

      return NextResponse.json(entry, { status: 201 });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
