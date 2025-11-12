"use client";

import type { Project } from "@/lib/mock-data";

interface ProjectSelectorProps {
  value: string;
  onChange: (projectId: string) => void;
  projects: Project[];
  error?: string;
}

export function ProjectSelector({ value, onChange, projects, error }: ProjectSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="task-project" className="text-sm font-medium text-slate-700">
        Project
      </label>
      <select
        id="task-project"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        aria-invalid={Boolean(error)}
      >
        <option value="" disabled>
          Select a project
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

