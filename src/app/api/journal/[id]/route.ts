import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalEntries } from "../../../../../db";
import { authenticateRequest } from "../../../../../lib/auth";
import { handleApiError, NotFoundError, ValidationError } from "../../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../../lib/middleware/security";
import { eq, and } from "drizzle-orm";

const MAX_CONTENT_LENGTH = 50_000;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const entries = await journalDb
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.id, params.id),
            eq(journalEntries.userId, user.dbUserId)
          )
        )
        .limit(1);

      if (entries.length === 0) throw new NotFoundError("Journal entry");
      return NextResponse.json(entries[0]);
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const body = await req.json();
      const { title, content, mood, energy, tags } = body;

      if (content !== undefined) {
        if (!content.trim()) throw new ValidationError("Content cannot be empty");
        if (content.length > MAX_CONTENT_LENGTH) {
          throw new ValidationError(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
        }
      }
      if (mood !== undefined && mood !== null && (typeof mood !== "number" || mood < 1 || mood > 10)) {
        throw new ValidationError("mood must be a number between 1 and 10");
      }
      if (energy !== undefined && energy !== null && (typeof energy !== "number" || energy < 1 || energy > 10)) {
        throw new ValidationError("energy must be a number between 1 and 10");
      }
      if (tags !== undefined && !Array.isArray(tags)) {
        throw new ValidationError("tags must be an array");
      }

      const [updated] = await journalDb
        .update(journalEntries)
        .set({
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content: content.trim() }),
          ...(mood !== undefined && { mood }),
          ...(energy !== undefined && { energy }),
          ...(tags !== undefined && { tags }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(journalEntries.id, params.id),
            eq(journalEntries.userId, user.dbUserId)
          )
        )
        .returning();

      if (!updated) throw new NotFoundError("Journal entry");
      return NextResponse.json(updated);
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const deleted = await journalDb
        .delete(journalEntries)
        .where(
          and(
            eq(journalEntries.id, params.id),
            eq(journalEntries.userId, user.dbUserId)
          )
        )
        .returning();

      if (deleted.length === 0) throw new NotFoundError("Journal entry");
      return NextResponse.json({ deleted: true });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
