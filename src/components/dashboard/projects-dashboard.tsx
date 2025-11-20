"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useExperience } from "@/components/providers/experience-provider";
import { Modal } from "@/components/ui/modal";
import { projects } from "@/lib/mock-data";

export function ProjectsDashboard() {
  const router = useRouter();
  const { state } = useExperience();
  const [showLimitModal, setShowLimitModal] = useState(false);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    []
  );

  const handleCreate = () => {
    const hasFreeAllowance = state.userTier !== "guest" || state.createdProjects.length < state.freeProjectLimit;
    if (!hasFreeAllowance) {
      setShowLimitModal(true);
      return;
    }
    router.push("/");
  };

  const remainingLabel =
    state.userTier === "guest" ? `${state.remainingProjects} free projects remaining` : "Unlimited projects";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to landing
            </button>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">My Projects</h1>
            <p className="text-sm text-slate-500">
              Track your council-ready workspaces, file uploads, and chat artefacts from a single view.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {remainingLabel}
          </div>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Active projects</p>
                <p className="text-sm text-slate-500">Browse workspaces and continue planning.</p>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Create new project
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((project) => (
                    <tr key={project.id} className="border-t border-slate-100 text-slate-600">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{project.name}</div>
                        <p className="text-xs text-slate-500">{project.description}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{project.tags[0] ?? "Mixed use"}</td>
                      <td className="px-4 py-4 text-slate-700">{project.location ?? "Australia"}</td>
                      <td className="px-4 py-4 text-slate-500">{new Date(project.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/projects/${project.publicId ?? project.id}/workspace`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
                        >
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {state.userTier === "guest" ? "1 free project" : "Workspace usage"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {state.userTier === "guest"
                      ? "Sign up to unlock unlimited workspaces, uploads and agents."
                      : "Signed-in accounts sync projects, artefacts, and uploads."}
                  </p>
                </div>
              </div>
              <Link
                href="/signin"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
              >
                Sign up free
              </Link>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 text-sm text-blue-900">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                <ShieldCheck className="h-4 w-4" /> Usage limits
              </div>
              <p className="mt-3 text-sm">
                {state.userTier === "guest"
                  ? `You've used ${state.createdProjects.length} of 1 free projects. Sign up to create unlimited workspaces.`
                  : "Free and Pro plans include unlimited projects. Upgrade to Pro for higher upload caps and premium agents."}
              </p>
            </div>
          </aside>
        </section>
      </div>

      <Modal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title="You've used your 1 free project"
        description="Sign up to create unlimited projects, sync uploads and run premium planning tools."
      >
        <div className="space-y-3">
          <Link
            href="/signin"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign up free
          </Link>
          <button
            type="button"
            onClick={() => setShowLimitModal(false)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Maybe later
          </button>
        </div>
      </Modal>
    </div>
  );
}
