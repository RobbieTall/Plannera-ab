import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalReminders } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { eq } from "drizzle-orm";

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

