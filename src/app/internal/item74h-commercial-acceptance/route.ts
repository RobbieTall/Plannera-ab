import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ITEM74H_VISUAL_ACCEPTANCE_VIEW_PATH,
  item74hVisualAcceptanceAllowed,
} from "@/lib/item74h-visual-acceptance";

export const dynamic = "force-dynamic";

const notFoundResponse = () =>
  new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-cache, no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });

export function GET(request: NextRequest) {
  if (!item74hVisualAcceptanceAllowed(process.env)) {
    return notFoundResponse();
  }

  return NextResponse.redirect(
    new URL(ITEM74H_VISUAL_ACCEPTANCE_VIEW_PATH, request.url),
    307,
  );
}
