"use client";

import {
  forwardRef,
  FormEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";

import type { Project, TeamMember } from "@/lib/mock-data";
import { defaultProjectFormData, ProjectFormData, projectFormSchema } from "@/lib/project-form-schema";
import { cn, formatDate } from "@/lib/utils";
import { TagInput } from "@/components/tasks/tag-input";
import { ColorPicker } from "./color-picker";
import { TeamMemberSelector } from "./team-member-selector";

export interface ProjectFormHandle {
  submit: () => void;
  reset: () => void;
}

interface ProjectFormProps {
  mode: "create" | "edit";
  project?: Project | null;
  initialValues?: ProjectFormData;
  teamMembers: TeamMember[];
  isSubmitting?: boolean;
  onSubmit: (values: ProjectFormData) => Promise<void> | void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type ErrorState = Partial<Record<keyof ProjectFormData, string>>;

type ProjectFormState = {
  name: string;
  description: string;
  status: ProjectFormData["status"];
  priority: ProjectFormData["priority"];
  startDate: string;
  endDate: string;
  progress: number;
  teamMemberIds: string[];
  tags: string[];
  color: string;
};

const toFormState = (values: ProjectFormData): ProjectFormState => ({
  name: values.name,
  description: values.description,
  status: values.status,
  priority: values.priority,
  startDate: values.startDate ?? "",
  endDate: values.endDate ?? "",
  progress: values.progress,
  teamMemberIds: values.teamMemberIds,
  tags: values.tags,
  color: values.color,
});

const toProjectFormData = (state: ProjectFormState): ProjectFormData => ({
  name: state.name.trim(),
  description: state.description.trim(),
  status: state.status,
  priority: state.priority,
  startDate: state.startDate ? state.startDate : null,
  endDate: state.endDate ? state.endDate : null,
  progress: state.progress,
  teamMemberIds: state.teamMemberIds,
  tags: state.tags,
  color: state.color,
});

export const ProjectForm = forwardRef<ProjectFormHandle, ProjectFormProps>(
  (
    {
      mode,
      project,
      initialValues = defaultProjectFormData,
      teamMembers,
      isSubmitting,
      onSubmit,
      onCancel,
      onDirtyChange,
    },
    ref,
  ) => {
    const [formState, setFormState] = useState<ProjectFormState>(() => toFormState(initialValues));
    const [errors, setErrors] = useState<ErrorState>({});
    const initialStateRef = useRef<ProjectFormState>(toFormState(initialValues));

    useEffect(() => {
      const mapped = toFormState(initialValues);
      setFormState(mapped);
      setErrors({});
      initialStateRef.current = mapped;
    }, [initialValues]);

    useEffect(() => {
      const dirty = JSON.stringify(formState) !== JSON.stringify(initialStateRef.current);
      onDirtyChange?.(dirty);
    }, [formState, onDirtyChange]);

    const handleSubmit = useCallback(async () => {
      const payload = toProjectFormData(formState);
      const parsed = projectFormSchema.safeParse(payload);
      if (!parsed.success) {
        const nextErrors: ErrorState = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0];
          if (typeof path === "string" && !nextErrors[path as keyof ProjectFormData]) {
            nextErrors[path as keyof ProjectFormData] = issue.message;
          }
        }
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      await onSubmit(parsed.data);
    }, [formState, onSubmit]);

    useImperativeHandle(
      ref,
      () => ({
        submit: () => {
          void handleSubmit();
        },
        reset: () => {
          setFormState(initialStateRef.current);
          setErrors({});
        },
      }),
      [handleSubmit],
    );

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSubmit();
    };

    const updateField = <Key extends keyof ProjectFormState>(key: Key, value: ProjectFormState[Key]) => {
      setFormState((previous) => ({ ...previous, [key]: value }));
    };

    const statusOptions: Array<{ label: string; value: ProjectFormData["status"] }> = [
      { label: "Active", value: "active" },
      { label: "On hold", value: "on-hold" },
      { label: "Completed", value: "completed" },
      { label: "Archived", value: "archived" },
    ];

    const priorityOptions: Array<{ label: string; value: ProjectFormData["priority"]; helper: string }> = [
      { label: "High", value: "high", helper: "Critical path work" },
      { label: "Medium", value: "medium", helper: "Important but stable" },
      { label: "Low", value: "low", helper: "Monitor periodically" },
    ];

    const sortedTeamMembers = useMemo(() => {
      if (!project) {
        return teamMembers;
      }
      const assignedIds = new Set(project.teamMembers.map((member) => member.id));
      return [...teamMembers].sort((a, b) => {
        const aAssigned = assignedIds.has(a.id);
        const bAssigned = assignedIds.has(b.id);
        if (aAssigned === bAssigned) {
          return a.name.localeCompare(b.name);
        }
        return aAssigned ? -1 : 1;
      });
    }, [project, teamMembers]);

    return (
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-8" noValidate>
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-sm font-medium text-slate-700">
                Project name
              </label>
              <input
                id="project-name"
                type="text"
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                maxLength={120}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                aria-invalid={Boolean(errors.name)}
                aria-describedby="project-name-help"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span id="project-name-help">Aim for a memorable name—120 characters max.</span>
                <span>{formState.name.length}/120</span>
              </div>
              {errors.name ? <p className="text-xs font-medium text-rose-600">{errors.name}</p> : null}
            </div>

            <div className="space-y-3">
              <label htmlFor="project-description" className="text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="project-description"
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                aria-invalid={Boolean(errors.description)}
                aria-describedby="project-description-help"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span id="project-description-help">Markdown supported—use **bold**, _italics_, and lists to add context.</span>
                <span>{formState.description.length}/4000</span>
              </div>
              {errors.description ? <p className="text-xs font-medium text-rose-600">{errors.description}</p> : null}
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live preview</p>
                <div className="mt-2">
                  {formState.description ? (
                    <div className="space-y-3 text-sm leading-relaxed text-slate-700 [&>h1]:text-lg [&>h1]:font-semibold [&>h2]:text-base [&>h2]:font-semibold [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>a]:text-slate-900 [&>strong]:text-slate-900">
                      <ReactMarkdown>{formState.description}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-slate-400">Start typing to see a formatted preview.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="project-status" className="text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  id="project-status"
                  value={formState.status}
                  onChange={(event) => updateField("status", event.target.value as ProjectFormData["status"])}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status ? <p className="text-xs font-medium text-rose-600">{errors.status}</p> : null}
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Priority</span>
                <div className="grid gap-2">
                  {priorityOptions.map((option) => {
                    const isActive = option.value === formState.priority;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("priority", option.value)}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition",
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900",
                        )}
                        aria-pressed={isActive}
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-slate-300">{option.helper}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.priority ? <p className="text-xs font-medium text-rose-600">{errors.priority}</p> : null}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="project-start" className="text-sm font-medium text-slate-700">
                  Start date
                </label>
                <input
                  id="project-start"
                  type="date"
                  value={formState.startDate}
                  onChange={(event) => updateField("startDate", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
                />
                {errors.startDate ? <p className="text-xs font-medium text-rose-600">{errors.startDate}</p> : null}
              </div>
              <div className="space-y-2">
                <label htmlFor="project-end" className="text-sm font-medium text-slate-700">
                  End date
                </label>
                <input
                  id="project-end"
                  type="date"
                  value={formState.endDate}
                  onChange={(event) => updateField("endDate", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none"
                />
                {errors.endDate ? <p className="text-xs font-medium text-rose-600">{errors.endDate}</p> : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Progress</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{formState.progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={formState.progress}
                onChange={(event) => updateField("progress", Number(event.target.value))}
                className="w-full accent-slate-900"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={formState.progress}
                aria-label="Project progress"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={formState.progress}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isNaN(next)) {
                    return;
                  }
                  updateField("progress", Math.min(100, Math.max(0, next)));
                }}
                className="w-20 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                aria-label="Progress percentage"
              />
              {errors.progress ? <p className="text-xs font-medium text-rose-600">{errors.progress}</p> : null}
            </div>

            {project ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <p>
                  Last updated {formatDate(project.createdAt, { month: "short", day: "numeric", year: "numeric" })}.
                  Changes save to your workspace once you submit.
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <TeamMemberSelector
              members={sortedTeamMembers}
              selectedIds={formState.teamMemberIds}
              onChange={(value) => updateField("teamMemberIds", value)}
              error={errors.teamMemberIds}
            />
            <TagInput
              tags={formState.tags}
              onChange={(value) => updateField("tags", value)}
              error={errors.tags}
              label="Tags & categories"
              inputId="project-tags"
              helperText="Add labels so teammates can filter project lists."
            />
            <ColorPicker
              value={formState.color}
              onChange={(value) => updateField("color", value)}
              error={errors.color}
            />
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Keyboard tips:</span> Press <kbd className="rounded bg-slate-900/5 px-1">Esc</kbd> to
            close or <kbd className="rounded bg-slate-900/5 px-1">⌘</kbd>/<kbd className="rounded bg-slate-900/5 px-1">Ctrl</kbd> + <kbd className="rounded bg-slate-900/5 px-1">Enter</kbd> to
            save instantly.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
            </button>
          </div>
        </footer>
      </form>
    );
  },
);

ProjectForm.displayName = "ProjectForm";
