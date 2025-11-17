"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { useExperience } from "@/components/providers/experience-provider";
import type { Project } from "@/lib/mock-data";

interface WorkspacePageProps {
  params: { id: string };
}

export default function ProjectWorkspacePage({ params }: WorkspacePageProps) {
  const { getProject } = useExperience();
  const [project, setProject] = useState<Project | null>(null);
  const router = useRouter();

  useEffect(() => {
    setProject(getProject(params.id) ?? null);
  }, [getProject, params.id]);

  if (!project) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-12">
        <p className="text-2xl font-semibold text-slate-900">Project not found</p>
        <p className="text-sm text-slate-600">
          Create a new planning workspace from the homepage or revisit an existing project from your dashboard.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900"
          >
            Back to homepage
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return <ProjectWorkspace project={project} />;
}
