import { createWorkingSeeVersionListHandler } from "@/lib/see-document-version-list";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const deploymentEnvironment = process.env.VERCEL_ENV;
  return createWorkingSeeVersionListHandler({
    deploymentEnvironment,
    getActorId: async () => {
      const { getServerSession } = await import("next-auth");
      const { authOptions } = await import("@/lib/auth");
      return (await getServerSession(authOptions))?.user?.id ?? null;
    },
    loadVersions: async (scope) => {
      const { prisma } = await import("@/lib/prisma");
      const { createWorkingSeeVersionList } = await import("@/lib/see-document-version-list");
      return createWorkingSeeVersionList({ prisma, deploymentEnvironment })(scope);
    },
  })(request, params.projectId);
}
