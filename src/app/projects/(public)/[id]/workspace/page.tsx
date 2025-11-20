"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { useExperience } from "@/components/providers/experience-provider";
import type { Project } from "@/lib/mock-data";
import { normalizeProjectId } from "@/lib/project-identifiers";

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

  useEffect(() => {
    const controller = new AbortController();
    const syncProject = async () => {
      if (!project) {
        return;
      }

      try {
        await fetch("/api/projects/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicId: normalizeProjectId(project.publicId ?? project.id),
            name: project.name,
            description: project.description,
            propertyName: project.location ?? project.name,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[project-sync-error]", error);
      }
    };

    void syncProject();

    return () => controller.abort();
  }, [project]);

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
