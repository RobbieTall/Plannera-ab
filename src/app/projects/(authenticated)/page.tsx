import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarClock, MapPin, Plus, Sparkles } from "lucide-react";

import { listProjectsForUser } from "@/lib/projects";
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

export default async function ProjectsPage() {
  const { userId, sessionId } = await getUserContext();

  if (!userId) {
    return (
      <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-sm shadow-slate-200/70">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Projects</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Sign in to view your projects</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Your claimed planning workspaces, saved site context and generated artefacts will appear here.
        </p>
      </div>
    );
  }

  const projects = await listProjectsForUser(userId, sessionId);
  const projectsWithAddress = projects.filter((project) => Boolean(project.address)).length;
  const projectsWithZoning = projects.filter((project) => Boolean(project.zoning)).length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-slate-950 p-6 text-white shadow-2xl shadow-blue-950/10 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr] md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">My projects</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Pick up the next planning decision.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Open a workspace to continue site checks, planning conversations, saved notes and council-ready outputs.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-200">Total</p>
              <p className="mt-1 text-2xl font-semibold">{projects.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-200">Sites set</p>
              <p className="mt-1 text-2xl font-semibold">{projectsWithAddress}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-200">Zoned</p>
              <p className="mt-1 text-2xl font-semibold">{projectsWithZoning}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-sm shadow-slate-200/70 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspaces</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Continue where you left off</h2>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-blue-500" />
            <p className="mt-3 text-base font-semibold text-slate-950">No projects yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">
              Start from the homepage with an address or project idea and Plannera will create your first workspace.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.publicId ?? project.id}/workspace`}
                  className="group grid gap-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-slate-950">{project.title}</p>
                      {project.zoning ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{project.zoning}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {project.address ?? "No address provided"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-4 w-4" />
                        Updated {formatUpdatedAt(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-600">
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
