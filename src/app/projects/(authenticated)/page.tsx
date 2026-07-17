import Link from "next/link";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { ArrowRight, CalendarClock, MapPin, Plus, Trash2 } from "lucide-react";

import { deleteProjectForRequester, listProjectsForRequester } from "@/lib/projects";
import { getUserContext } from "@/lib/getUserContext";

export const metadata: Metadata = {
  title: "My Projects | Plannera",
};

const formatUpdatedAt = (value: Date) =>
  new Intl.DateTimeFormat("en-AU", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);

async function deleteProject(projectId: string) {
  "use server";

  const { userId, sessionId } = await getUserContext();
  await deleteProjectForRequester(projectId, userId, sessionId);
  revalidatePath("/projects");
}

export default async function ProjectsPage() {
  const { userId, sessionId } = await getUserContext();
  const projects = await listProjectsForRequester(userId, sessionId);
  const heading = userId ? "My Projects" : "Projects in this browser";
  const description = userId
    ? "Continue your saved planning workspaces."
    : "These workspaces belong to this browser session. Sign in when you want to keep them across devices.";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Plannera</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">{heading}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New site check
        </Link>
      </header>

      <section aria-labelledby="projects-heading" className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="projects-heading" className="text-base font-semibold text-slate-950">
            Workspaces
          </h2>
          <span className="text-sm text-slate-500">{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-6 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-950">No projects yet</p>
            <p className="mt-1">Run a free site check from the homepage to create your first workspace.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {projects.map((project) => (
              <li key={project.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-950">{project.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {project.address ?? "No address saved yet"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" aria-hidden="true" />
                      Updated {formatUpdatedAt(project.updatedAt)}
                    </span>
                    {project.zoning ? <span className="font-medium text-slate-800">{project.zoning}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Link
                    href={`/projects/${project.publicId ?? project.id}/workspace`}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 transition hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <form action={deleteProject.bind(null, project.id)}>
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
