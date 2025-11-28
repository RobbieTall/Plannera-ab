import { Metadata } from "next";

import Link from "next/link";
import { cookies } from "next/headers";

import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getProjectsForUser } from "@/lib/projects";

export const metadata: Metadata = {
  title: "My Projects | Plannera",
};

export default async function DashboardPage() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSessionCookie(sessionCookie);

  if (!session?.userId) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">My Projects</h1>
          <p className="text-slate-600">Sign in to view your saved workspaces.</p>
        </div>
        <Link
          href="/signin"
          className="inline-flex w-fit items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const projects = await getProjectsForUser(session.userId);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">My Projects</h1>
            <p className="text-sm text-slate-500">Review your recent workspaces.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Create new project
          </Link>
        </header>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Active projects</p>
              <p className="text-sm text-slate-500">Continue planning from where you left off.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Sorted by last updated
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-600">
              <p className="font-semibold text-slate-900">No active projects yet</p>
              <p className="mt-1 text-sm text-slate-500">New workspaces will appear here after you start planning.</p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Zoning</th>
                    <th className="px-4 py-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-t border-slate-100 text-slate-600">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{project.title}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{project.address ?? "Unknown"}</td>
                      <td className="px-4 py-4 text-slate-700">{project.zoning ?? "—"}</td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/projects/${project.id}/workspace`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
