import { Metadata } from "next";

import Link from "next/link";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createProjectForUser, deleteProjectForUser, listProjectsForUser } from "@/lib/projects";

export const metadata: Metadata = {
  title: "My Projects | Plannera",
};

const readSession = () => {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  return decodeSessionCookie(sessionCookie);
};

const requireUserId = () => {
  const session = readSession();

  if (!session?.userId) {
    redirect("/signin");
  }

  return session.userId;
};

const createProject = async () => {
  "use server";

  const userId = requireUserId();
  await createProjectForUser(userId);
  revalidatePath("/dashboard");
};

const deleteProject = async (projectId: string) => {
  "use server";

  const userId = requireUserId();
  await deleteProjectForUser(userId, projectId);
  revalidatePath("/dashboard");
};

const formatUpdatedAt = (date: Date) =>
  date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
  const session = readSession();

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

  const projects = await listProjectsForUser(session.userId);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">My Projects</h1>
          <p className="text-sm text-slate-500">Projects you own and can continue editing.</p>
        </div>
        <form action={createProject}>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
            New project
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Your projects</p>
          <span className="text-xs text-slate-500">Sorted by last edited</span>
        </div>

        {projects.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">No projects yet</p>
            <p className="mt-1">Create a project to start planning.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Zoning</th>
                  <th className="px-4 py-3">Last edited</th>
                  <th className="px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-3 font-semibold text-slate-900">{project.title}</td>
                    <td className="px-4 py-3">{project.address ?? "—"}</td>
                    <td className="px-4 py-3">{project.zoning ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatUpdatedAt(project.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-slate-400"
                          href={`/projects/${project.id}/workspace`}
                        >
                          Open
                        </Link>
                        <form action={deleteProject.bind(null, project.id)}>
                          <button
                            className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400"
                            type="submit"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
