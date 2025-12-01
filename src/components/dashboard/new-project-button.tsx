"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NewProjectResponse {
  project?: {
    id?: string;
  };
}

export function NewProjectButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewProject = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/projects", { method: "POST" });

      if (response.status === 401) {
        router.push("/signin");
        return;
      }

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

  return (
    <button
      type="button"
      onClick={handleNewProject}
      disabled={isCreating}
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
    >
      {isCreating ? "Creating…" : "New project"}
    </button>
  );
}
