import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { projects } from "@/lib/mock-data";

interface WorkspacePageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export function generateMetadata({ params }: WorkspacePageProps): Metadata {
  const project = projects.find((entry) => entry.id === params.id);
  return {
    title: project ? `${project.name} | Workspace` : "Project Workspace | Plannera",
    description: project?.description,
  };
}

export default function ProjectWorkspacePage({ params }: WorkspacePageProps) {
  const project = projects.find((entry) => entry.id === params.id);

  if (!project) {
    notFound();
  }

  return <ProjectWorkspace project={project} />;
}
