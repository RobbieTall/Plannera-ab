import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const ALLOWED_REACTIONS = ["👍", "👎", "🏗️", "✅"] as const;

export async function POST(request: Request, { params }: { params: { messageId: string } }) {
  try {
    const { emoji } = await request.json();
    if (!ALLOWED_REACTIONS.includes(emoji)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: params.messageId },
      select: { reactions: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = (message.reactions as Record<string, number> | null) ?? {};
    const updated: Record<string, number> = { ...current };
    if (updated[emoji] && updated[emoji] > 0) {
      delete updated[emoji];
    } else {
      updated[emoji] = 1;
    }

    const saved = await prisma.chatMessage.update({
      where: { id: params.messageId },
      data: { reactions: updated },
      select: { reactions: true },
    });

    return NextResponse.json({ reactions: saved.reactions ?? {} });
  } catch (err) {
    console.error("[react] error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
