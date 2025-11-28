"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { useExperience } from "@/components/providers/experience-provider";
import type { Project } from "@/lib/mock-data";
import { normalizeProjectId } from "@/lib/project-identifiers";

interface WorkspacePageProps {
  params: { id: string };
}

export default function ProjectWorkspacePage({ params }: WorkspacePageProps) {
  const { data: session } = useSession();
  const { getProject, getChatHistory, saveChatHistory } = useExperience();
  const [project, setProject] = useState<Project | null>(null);
  const [persistedProjectId, setPersistedProjectId] = useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setProject(getProject(params.id) ?? null);
  }, [getProject, params.id]);

  useEffect(() => {
    const controller = new AbortController();

    const ensurePersistedProject = async () => {
      if (!project || persistedProjectId) {
        return;
      }

      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: project.name }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error("[project-persist-error]", await response.text());
          return;
        }

        const data: { project?: { id: string; title?: string } } = await response.json();
        const persistedProject = data.project;
        if (!persistedProject?.id) {
          return;
        }

        const currentHistory = getChatHistory(project.id);
        setPersistedProjectId(persistedProject.id);
        setProject((previous) => {
          if (!previous) return previous;
          if (currentHistory.length) {
            saveChatHistory(persistedProject.id, currentHistory);
          }
          return { ...previous, id: persistedProject.id, name: persistedProject.title ?? previous.name };
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[project-persist-error]", error);
      }
    };

    void ensurePersistedProject();

    return () => controller.abort();
  }, [getChatHistory, persistedProjectId, project, saveChatHistory]);

  useEffect(() => {
    const controller = new AbortController();
    const syncProject = async () => {
      if (!project) {
        return;
      }

      try {
        const landingPrompt = getChatHistory(project.id)[0]?.content;
        await fetch("/api/projects/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicId: normalizeProjectId(project.publicId ?? project.id),
            name: project.name,
            description: project.description,
            propertyName: project.location ?? project.name,
            landingPrompt: landingPrompt ?? project.description,
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
  }, [getChatHistory, project]);

  useEffect(() => {
    if (!session?.user?.id || hasClaimed) {
      return;
    }

    const controller = new AbortController();
    const claimProjects = async () => {
      try {
        const response = await fetch("/api/projects/claim", { method: "POST", signal: controller.signal });
        if (!response.ok) {
          console.warn("[project-claim-error]", await response.text());
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[project-claim-error]", error);
      } finally {
        setHasClaimed(true);
      }
    };

    void claimProjects();

    return () => controller.abort();
  }, [hasClaimed, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setHasClaimed(false);
    }
  }, [session?.user?.id]);

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
