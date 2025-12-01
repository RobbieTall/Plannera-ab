import { Metadata } from "next";

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/projects";
import { NewProjectButton } from "@/components/dashboard/new-project-button";

export const metadata: Metadata = {
  title: "My Projects | Plannera",
};

const requireUserId = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  return session.user.id;
};

const deleteProject = async (projectId: string) => {
  "use server";

  await requireUserId();
  const requestHeaders = headers();
  const cookieHeader = requestHeaders.get("cookie");

  const response = await fetch(
    `${requestHeaders.get("origin") ?? "http://localhost:3000"}/api/projects/${projectId}`,
    {
      method: "DELETE",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (!response.ok && response.status === 401) {
    redirect("/");
  }
  revalidatePath("/dashboard");
};

const formatUpdatedAt = (date: Date) =>
  date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const projects = await listProjectsForUser(session.user.id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">My Projects</h1>
          <p className="text-sm text-slate-500">Projects you own and can continue editing.</p>
        </div>
        <NewProjectButton />
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
