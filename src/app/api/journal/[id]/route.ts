import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalEntries } from "../../../../../db";
import { authenticateRequest } from "../../../../../lib/auth";
import { handleApiError, NotFoundError, ValidationError } from "../../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../../lib/middleware/security";
import { eq, and } from "drizzle-orm";

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

      if (content !== undefined && !content.trim()) {
        throw new ValidationError("Content cannot be empty");
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
