import { createWorkingSeeGenerationHandler } from "@/lib/see-document-generation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const deploymentEnvironment = process.env.VERCEL_ENV;
  const enabled = process.env.PLANNERA_WORKING_SEE_GENERATION_ENABLED === "1";
  return createWorkingSeeGenerationHandler({
    deploymentEnvironment, enabled,
    previewOrigin: {
      vercel: process.env.VERCEL,
      deploymentUrl: process.env.VERCEL_URL,
      branchUrl: process.env.VERCEL_BRANCH_URL,
    },
    getActorId: async () => {
      const { getServerSession } = await import("next-auth");
      const { authOptions } = await import("@/lib/auth");
      return (await getServerSession(authOptions))?.user?.id ?? null;
    },
    prepare: async (scope) => {
      const { prisma } = await import("@/lib/prisma");
      const { loadSavedWorkingSeeGeneration } = await import("@/lib/see-document-generation-source-loader");
      return loadSavedWorkingSeeGeneration(prisma, scope);
    },
    save: async (scope, prepared, snapshot) => {
      const { prisma } = await import("@/lib/prisma");
      const { get, put } = await import("@vercel/blob");
      const { createPrivateWorkingSeeReader } = await import("@/lib/see-document-private-reader");
      const { createPrivateWorkingSeeWriter } = await import("@/lib/see-document-private-writer");
      const { createWorkingSeePersistence } = await import("@/lib/see-document-persistence");
      const { loadSavedWorkingSeeGeneration } = await import("@/lib/see-document-generation-source-loader");
      return createWorkingSeePersistence({
        prisma, deploymentEnvironment, writesEnabled: enabled,
        writePrivateSnapshot: createPrivateWorkingSeeWriter({
          deploymentEnvironment, writesEnabled: enabled, put,
          readPrivateSnapshot: createPrivateWorkingSeeReader({ deploymentEnvironment, get }),
        }),
        validateSourceSnapshot: async (tx) => {
          const current = await loadSavedWorkingSeeGeneration(tx, scope);
          if (current.sourceSignature !== prepared.sourceSignature) throw new Error("source_changed");
        },
      })({ actorId: scope.actorId, projectId: scope.projectId, purchaseId: prepared.purchaseId, snapshot });
    },
  })(request, params.projectId);
}
