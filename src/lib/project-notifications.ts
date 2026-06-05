import { ProjectNotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const LGA_READY_NOTIFICATION_TITLE = "Local planning controls are searchable";

export const buildLgaReadyNotificationMessage = (lgaCode: string) =>
  `Local planning controls for ${lgaCode} are now searchable. You can refresh affected project outputs where needed.`;

export const createLgaReadyProjectNotification = async (projectId: string, lgaCode: string) => {
  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { publicId: projectId }] },
    select: { id: true },
  });

  if (!project) return null;

  const message = buildLgaReadyNotificationMessage(lgaCode);

  return prisma.projectNotification.upsert({
    where: {
      projectId_type_lgaCode: {
        projectId: project.id,
        type: ProjectNotificationType.LGA_SEARCHABLE_READY,
        lgaCode,
      },
    },
    update: {
      title: LGA_READY_NOTIFICATION_TITLE,
      message,
    },
    create: {
      projectId: project.id,
      type: ProjectNotificationType.LGA_SEARCHABLE_READY,
      title: LGA_READY_NOTIFICATION_TITLE,
      message,
      lgaCode,
    },
  });
};
