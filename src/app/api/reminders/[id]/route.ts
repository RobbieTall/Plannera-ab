import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalReminders } from "../../../../../db";
import { authenticateRequest } from "../../../../../lib/auth";
import { handleApiError, NotFoundError, ValidationError } from "../../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../../lib/middleware/security";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const { id } = params;
      const body = await req.json();
      const { isActive, fcmToken, title, message } = body;

      const [updated] = await journalDb
        .update(journalReminders)
        .set({
          ...(isActive !== undefined && { isActive }),
          ...(fcmToken !== undefined && { fcmToken }),
          ...(title !== undefined && { title }),
          ...(message !== undefined && { message }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(journalReminders.id, id),
            eq(journalReminders.userId, user.dbUserId)
          )
        )
        .returning();

      if (!updated) throw new NotFoundError("Reminder");
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
      const { id } = params;

      const deleted = await journalDb
        .delete(journalReminders)
        .where(
          and(
            eq(journalReminders.id, id),
            eq(journalReminders.userId, user.dbUserId)
          )
        )
        .returning();

      if (deleted.length === 0) throw new NotFoundError("Reminder");
      return NextResponse.json({ deleted: true });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
