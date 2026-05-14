import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalReminders } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError, NotFoundError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const reminders = await journalDb
        .select()
        .from(journalReminders)
        .where(eq(journalReminders.userId, user.dbUserId));

      return NextResponse.json({ reminders });
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
      const { title, message, cronExpression, fcmToken } = body;

      if (!title?.trim()) throw new ValidationError("Reminder title is required");
      if (!cronExpression?.trim()) throw new ValidationError("Cron expression is required");

      const [reminder] = await journalDb
        .insert(journalReminders)
        .values({
          userId: user.dbUserId,
          title: title.trim(),
          message,
          cronExpression,
          fcmToken,
        })
        .returning();

      return NextResponse.json(reminder, { status: 201 });
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const body = await req.json();
      const { id, isActive, fcmToken, title, message } = body;

      if (!id) throw new ValidationError("Reminder id is required");

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

export async function DELETE(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) throw new ValidationError("Reminder id is required");

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
