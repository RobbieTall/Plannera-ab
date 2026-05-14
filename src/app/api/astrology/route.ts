import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalUsers } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { getSunSign, getZodiacInfo, getMoonPhase, getDailyAstrology } from "../../../../lib/astrology";
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

      const sunSign = dbUser?.sunSign ?? (dbUser?.birthDate ? getSunSign(dbUser.birthDate) : null);

      const moonPhase = getMoonPhase(date);

      const dailyData = sunSign ? getDailyAstrology(sunSign, date) : null;

      return NextResponse.json({
        sunSign,
        sunSignInfo: sunSign ? getZodiacInfo(sunSign) : null,
        moonPhase,
        dailyGuidance: dailyData?.dailyGuidance ?? null,
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
      const { birthDate, date } = body;

      if (!birthDate) throw new ValidationError("birthDate is required");

      const sunSign = getSunSign(birthDate);
      const moonPhase = getMoonPhase(date);
      const daily = getDailyAstrology(sunSign, date);

      return NextResponse.json({
        sunSign,
        sunSignInfo: getZodiacInfo(sunSign),
        moonPhase,
        dailyGuidance: daily.dailyGuidance,
      });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
