import { NextResponse } from "next/server";
import { z } from "zod";

import { generatePlanningReplyForNswSite, inferZoneFromMessage } from "@/lib/workspace-chat";

const requestSchema = z.object({
  message: z.string().min(1),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, projectId, projectName } = requestSchema.parse(body);

    const result = await generatePlanningReplyForNswSite({
      messageText: message,
      projectId,
      zone: inferZoneFromMessage(message),
    });

    return NextResponse.json({
      reply: result.reply,
      lga: result.lga,
      zone: result.zone,
      projectName,
      instruments: result.instruments,
    });
  } catch (error) {
    console.error("Workspace chat error", error);
    return NextResponse.json(
      {
        reply:
          "I wasn’t able to retrieve the Sydney planning controls just now. Try again with the zone or site address and I’ll search the LEP and SEPP clauses for you.",
      },
      { status: 200 }
    );
  }
}
