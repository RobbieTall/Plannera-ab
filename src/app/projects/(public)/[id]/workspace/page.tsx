import Link from "next/link";
import { cookies } from "next/headers";

import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getProjectForRequester } from "@/lib/projects";
import type { Project as PrismaProject } from "@prisma/client";
import type { Project } from "@/lib/mock-data";

interface WorkspacePageProps {
  params: { id: string };
}

const buildWorkspaceProject = (project: PrismaProject): Project => {
  const createdAt = project.createdAt;
  const startDate = project.startDate ?? createdAt;
  const ownerName = project.userId ? "Project owner" : "Workspace user";
  const actor = {
    id: project.userId ?? "owner",
    name: ownerName,
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=Plannera",
    role: "Owner",
  } as const;

  return {
    id: project.id,
    publicId: project.publicId,
    name: project.title || project.name,
    description: project.description ?? "Workspace project",
    location: project.address ?? undefined,
    isDemo: Boolean(project.isDemo),
    status: "active",
    priority: "high",
    progress: 0,
    startDate: startDate.toISOString(),
    endDate: project.dueDate ? project.dueDate.toISOString() : null,
    color: "#0f172a",
    tags: [project.zoning, project.zoningName, project.zoningCode].filter(Boolean) as string[],
    tasks: [],
    teamMembers: [actor],
    createdAt: createdAt.toISOString(),
    activity: [
      {
        id: `${project.id}-loaded`,
        summary: "Workspace restored",
        detail: "Project loaded from your account.",
        timestamp: project.updatedAt.toISOString(),
        actor,
      },
    ],
  };
};

function NotFoundState() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-12">
      <p className="text-2xl font-semibold text-slate-900">Project not found</p>
      <p className="text-sm text-slate-600">
        Create a new planning workspace from the homepage or revisit an existing project from your dashboard.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
        >
          Back to homepage
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default async function ProjectWorkspacePage({ params }: WorkspacePageProps) {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? decodeSessionCookie(sessionCookie) : null;

  const project = session
    ? await getProjectForRequester(params.id, session.id, session.userId ?? null)
    : null;

  if (!project) {
    return <NotFoundState />;
  }

  const workspaceProject = buildWorkspaceProject(project);

  return <ProjectWorkspace project={workspaceProject} />;
}
