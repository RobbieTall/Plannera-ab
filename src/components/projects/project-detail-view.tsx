"use client";

import ReactMarkdown from "react-markdown";
import { CalendarDays, Clock3, Inbox, ShieldCheck } from "lucide-react";

import type { Project } from "@/lib/mock-data";
import { formatDate, getPriorityStyles, getProjectStatusStyles, getStatusStyles } from "@/lib/utils";
import { ProjectHeader } from "./project-header";
import { ProjectStats } from "./project-stats";

interface ProjectDetailViewProps {
  project: Project;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  disableArchive?: boolean;
}

export function ProjectDetailView({ project, onEdit, onArchive, onDelete, disableArchive }: ProjectDetailViewProps) {
  const renderDate = (value: string | null) => {
    if (!value) {
      return "TBD";
    }
    return formatDate(value, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-8">
      <ProjectHeader
        project={project}
        onEdit={onEdit ?? (() => {})}
        onArchive={onArchive ?? (() => {})}
        onDelete={onDelete ?? (() => {})}
        isArchiveDisabled={disableArchive}
      />

      <ProjectStats project={project} />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
          <div className="space-y-4 text-sm leading-relaxed text-slate-700 [&>h1]:text-2xl [&>h1]:font-semibold [&>h2]:text-xl [&>h2]:font-semibold [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>a]:text-slate-900 [&>strong]:text-slate-900">
            <ReactMarkdown>{project.description}</ReactMarkdown>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Start date</dt>
              <dd className="mt-1 text-sm text-slate-700">{renderDate(project.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target completion</dt>
              <dd className="mt-1 text-sm text-slate-700">{renderDate(project.endDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getProjectStatusStyles(project.status)}`}>
                  {project.status.replace("-", " ")}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Priority</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getPriorityStyles(project.priority)}`}>
                  {project.priority}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick glance</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>Started {renderDate(project.startDate)}</span>
            </li>
            <li className="flex items-center gap-3">
              <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>
                Target completion {project.endDate ? renderDate(project.endDate) : "TBD"}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>{project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} priority</span>
            </li>
            <li className="flex items-center gap-3">
              <Inbox className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>{project.tasks.length} linked task{project.tasks.length === 1 ? "" : "s"}</span>
            </li>
          </ul>
          <div className="space-y-2 text-xs text-slate-500">
            <p className="font-semibold uppercase tracking-wide text-slate-400">Tags</p>
            <div className="flex flex-wrap gap-2">
              {project.tags.length ? (
                project.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700">
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">No tags yet</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Task preview</h2>
              <p className="text-sm text-slate-500">Most recent tasks tied to this project.</p>
            </div>
          </header>
          {project.tasks.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No tasks yet—create one to kick off the effort.
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-slate-100">
              {project.tasks.slice(0, 6).map((task) => (
                <li key={task.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">Due {formatDate(task.dueDate, { month: "short", day: "numeric" })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(task.status)}`}>
                      {task.status.replace("-", " ")}
                    </span>
                    {task.assignee ? (
                      <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600"
                          style={{ backgroundImage: `url(${task.assignee.avatarUrl})`, backgroundSize: "cover" }}
                          aria-hidden="true"
                        />
                        {task.assignee.name}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Team</h2>
            <ul className="mt-4 space-y-3">
              {project.teamMembers.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600"
                    style={{ backgroundImage: `url(${member.avatarUrl})`, backgroundSize: "cover" }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
            <ul className="mt-4 space-y-4 text-sm">
              {project.activity.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span
                    className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600"
                    style={{ backgroundImage: `url(${entry.actor.avatarUrl})`, backgroundSize: "cover" }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{entry.summary}</p>
                    <p className="text-xs text-slate-500">{entry.detail}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(entry.timestamp, { month: "short", day: "numeric" })} · {entry.actor.name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
