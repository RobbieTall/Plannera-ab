import type { NextRequest } from "next/server";

import { handleUploadGet, handleUploadPost } from "./handler";

export { handleUploadGet as GET };

export async function POST(request: NextRequest, context: { params: { projectId: string } }) {
  return handleUploadPost(request, context);
}
