"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Project } from "@/lib/mock-data";
import { teamMembers } from "@/lib/mock-data";
import type { ProjectFormData } from "@/lib/project-form-schema";
import { cn } from "@/lib/utils";
import { ProjectDeleteModal } from "./project-delete-modal";
import { ProjectDetailView } from "./project-detail-view";
import { ProjectModal } from "./project-modal";

interface ProjectDetailShellProps {
  project: Project;
}

export function ProjectDetailShell({ project }: ProjectDetailShellProps) {
  const router = useRouter();
  const [projectState, setProjectState] = useState<Project>(project);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; variant: "success" | "error" } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ id: Date.now(), message, variant });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const mapFormToProject = (values: ProjectFormData): Project => {
    const updatedMembers = values.teamMemberIds
      .map((id) => teamMembers.find((member) => member.id === id) ?? null)
      .filter((member): member is NonNullable<typeof member> => Boolean(member));

    return {
      ...projectState,
      name: values.name,
      description: values.description,
      status: values.status,
      priority: values.priority,
      progress: values.progress / 100,
      startDate: values.startDate,
      endDate: values.endDate,
      color: values.color,
      tags: values.tags,
      teamMembers: updatedMembers,
    } satisfies Project;
  };

  const handleSubmit = async (values: ProjectFormData) => {
    try {
      setIsSaving(true);
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      const updated = mapFormToProject(values);
      setProjectState(updated);
      showToast("Project updated");
      setModalOpen(false);
    } catch (error) {
      console.error("Failed to update project", error);
      showToast("Unable to update project", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = () => {
    if (projectState.status === "archived") {
      showToast("Already archived", "error");
      return;
    }
    setProjectState((previous) => ({ ...previous, status: "archived" }));
    showToast("Project archived");
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      showToast("Project deleted");
      setDeleteOpen(false);
      router.push("/projects");
    } catch (error) {
      console.error("Failed to delete project", error);
      showToast("Unable to delete project", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center px-4">
          <div
            role="status"
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
              toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
                : "border-rose-200 bg-rose-50/80 text-rose-600",
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <ProjectDetailView
        project={projectState}
        onEdit={() => setModalOpen(true)}
        onArchive={handleArchive}
        onDelete={() => setDeleteOpen(true)}
        disableArchive={projectState.status === "archived"}
      />

      <ProjectModal
        open={modalOpen}
        mode="edit"
        project={projectState}
        teamMembers={teamMembers}
        isSubmitting={isSaving}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ProjectDeleteModal
        open={deleteOpen}
        project={projectState}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
