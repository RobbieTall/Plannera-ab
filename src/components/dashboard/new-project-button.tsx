"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/ui/modal";

interface NewProjectResponse {
  project?: {
    id?: string;
  };
}

interface NewProjectButtonProps {
  projectCount: number;
  existingProjectId?: string;
}

export function NewProjectButton({ projectCount, existingProjectId }: NewProjectButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const handleNewProject = async () => {
    if (isCreating) return;

    if (projectCount >= 1) {
      setIsLimitModalOpen(true);
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/projects/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled project" }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as NewProjectResponse;
      const projectId = data?.project?.id;

      if (projectId) {
        router.push(`/projects/${projectId}/workspace`);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create project", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGoToProject = () => {
    if (existingProjectId) {
      router.push(`/projects/${existingProjectId}/workspace`);
      router.refresh();
    }
    setIsLimitModalOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleNewProject}
        disabled={isCreating}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
      >
        {isCreating ? "Creating…" : "New project"}
      </button>

      <Modal
        open={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        title="Free plan project limit reached"
        description="On the free plan you can only keep 1 active project. You can delete your existing project to start a new one, or upgrade your plan to create more."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="order-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 sm:order-1"
            onClick={() => setIsLimitModalOpen(false)}
          >
            Close
          </button>
          <button
            type="button"
            className="order-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:order-2"
            onClick={handleGoToProject}
          >
            Go to my project
          </button>
        </div>
      </Modal>
    </>
  );
}
