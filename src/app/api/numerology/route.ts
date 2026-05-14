import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalUsers } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import {
  getNumerologyProfile,
  calculateLifePath,
  calculateSoulUrge,
  calculateExpression,
  calculatePersonalDay,
  getNumerologyMeaning,
} from "../../../../lib/numerology";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const { searchParams } = new URL(req.url);
      const date = searchParams.get("date") ?? undefined;

      const [dbUser] = await journalDb
        .select()
        .from(journalUsers)
        .where(eq(journalUsers.id, user.dbUserId))
        .limit(1);

      if (!dbUser?.birthDate) {
        throw new ValidationError("Birth date is required for numerology calculations");
      }

      const profile = getNumerologyProfile(dbUser.birthDate, dbUser.displayName ?? undefined);
      const personalDay = calculatePersonalDay(dbUser.birthDate, date);

      return NextResponse.json({
        ...profile,
        personalDay,
        personalDayMeaning: getNumerologyMeaning(personalDay),
        requestedDate: date ?? new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function POST(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const body = await req.json();
      const { birthDate, fullName } = body;

      if (!birthDate) throw new ValidationError("birthDate is required");

      const lifePath = calculateLifePath(birthDate);
      const personalDay = calculatePersonalDay(birthDate);

      const nameNumbers = fullName
        ? {
            soulUrge: calculateSoulUrge(fullName),
            expression: calculateExpression(fullName),
          }
        : null;

      return NextResponse.json({
        lifePath,
        lifePathMeaning: getNumerologyMeaning(lifePath),
        personalDay,
        personalDayMeaning: getNumerologyMeaning(personalDay),
        ...(nameNumbers && {
          soulUrge: nameNumbers.soulUrge,
          soulUrgeMeaning: getNumerologyMeaning(nameNumbers.soulUrge),
          expression: nameNumbers.expression,
          expressionMeaning: getNumerologyMeaning(nameNumbers.expression),
        }),
      });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
