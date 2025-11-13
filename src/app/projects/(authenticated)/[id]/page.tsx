import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetailShell } from "@/components/projects/project-detail-shell";
import { projects } from "@/lib/mock-data";

interface ProjectPageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export function generateMetadata({ params }: ProjectPageProps): Metadata {
  const project = projects.find((entry) => entry.id === params.id);
  return {
    title: project ? `${project.name} | Project Overview` : "Project | Plannera",
    description: project?.description,
  };
}

export default function ProjectDetailPage({ params }: ProjectPageProps) {
  const project = projects.find((entry) => entry.id === params.id);
  if (!project) {
    notFound();
  }

  return <ProjectDetailShell project={project} />;
}
