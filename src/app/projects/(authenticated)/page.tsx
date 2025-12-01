import Link from "next/link";
import type { Metadata } from "next";

import { listProjectsForUser } from "@/lib/projects";
import { getUserContext } from "@/lib/getUserContext";

export const metadata: Metadata = {
  title: "My Projects | Plannera",
};

export default async function ProjectsPage() {
  const { userId } = await getUserContext();

  if (!userId) {
    return (
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">My Projects</h1>
        <p className="text-slate-600">Please sign in to view your projects.</p>
      </div>
    );
  }

  const projects = await listProjectsForUser(userId);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">My Projects</h1>
        <p className="text-slate-600">Projects you have created or claimed.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {projects.length === 0 ? (
          <p className="text-slate-600">You don&apos;t have any projects yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {projects.map((project) => (
              <li key={project.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{project.title}</p>
                  {project.address ? (
                    <p className="text-sm text-slate-600">{project.address}</p>
                  ) : (
                    <p className="text-sm text-slate-500">No address provided</p>
                  )}
                  {project.zoning ? (
                    <p className="text-xs text-slate-500">Zoning: {project.zoning}</p>
                  ) : null}
                </div>
                <Link
                  href={`/projects/${project.id}/workspace`}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Open workspace
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
