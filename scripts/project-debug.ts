import "dotenv/config";

import { ensureProjectExists, logExistingProjects } from "@/lib/project-service";

async function main() {
  await logExistingProjects();

  const targetPublicId = process.env.TARGET_PROJECT_PUBLIC_ID;
  const targetName = process.env.TARGET_PROJECT_NAME ?? "Workspace project";

  if (targetPublicId) {
    const project = await ensureProjectExists({
      publicId: targetPublicId,
      name: targetName,
      description: process.env.TARGET_PROJECT_DESCRIPTION ?? undefined,
      propertyName: process.env.TARGET_PROJECT_PROPERTY_NAME ?? targetName,
      propertyCity: process.env.TARGET_PROJECT_PROPERTY_CITY ?? undefined,
      propertyState: process.env.TARGET_PROJECT_PROPERTY_STATE ?? undefined,
      propertyCountry: process.env.TARGET_PROJECT_PROPERTY_COUNTRY ?? undefined,
      createdById: process.env.TARGET_PROJECT_OWNER_ID ?? undefined,
    });
    console.log("[project-debug] ensured", project);
  }
}

main().catch((error) => {
  console.error("[project-debug] failed", error);
  process.exit(1);
});
