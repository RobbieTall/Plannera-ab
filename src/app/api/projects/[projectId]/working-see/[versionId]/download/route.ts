import { createWorkingSeeDownloadHandler } from "@/lib/see-document-http";
import { createWorkingSeeSnapshotLoader } from "@/lib/see-document-storage-loader";
import { createPrivateWorkingSeeReader } from "@/lib/see-document-private-reader";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { projectId: string; versionId: string } },
) {
  const deploymentEnvironment = process.env.VERCEL_ENV;
  return createWorkingSeeDownloadHandler({
    deploymentEnvironment,
    getActorId: async () => {
      const { getServerSession } = await import("next-auth");
      const { authOptions } = await import("@/lib/auth");
      const session = await getServerSession(authOptions);
      return session?.user?.id ?? null;
    },
    loadAuthorisedSnapshot: async (scope) => {
      // Import the client only after Preview, authentication and request validation.
      const { prisma } = await import("@/lib/prisma");
      return createWorkingSeeSnapshotLoader({
        prisma, deploymentEnvironment,
        readPrivateSnapshot: createPrivateWorkingSeeReader({
          deploymentEnvironment,
          get: async (pathname, options) => {
            const { get } = await import("@vercel/blob");
            return get(pathname, options);
          },
        }),
      })(scope);
    },
  })(request, params);
}

