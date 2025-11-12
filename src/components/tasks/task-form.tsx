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

import type { Project, TaskPriority, TaskStatus, TeamMember } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { DatePicker } from "./date-picker";
import { PrioritySelector } from "./priority-selector";
import { ProjectSelector } from "./project-selector";
import { AssigneeSelector } from "./assignee-selector";
import { TagInput } from "./tag-input";
import { defaultTaskFormValues, TaskFormValues, taskFormSchema } from "@/lib/task-form-schema";

type TaskFormState = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  projectId: string;
  assigneeId: string;
  tags: string[];
  estimatedHours: string;
};

const toFormState = (values: TaskFormValues): TaskFormState => ({
  title: values.title,
  description: values.description,
  priority: values.priority,
  status: values.status,
  dueDate: values.dueDate ?? "",
  projectId: values.projectId,
  assigneeId: values.assigneeId ?? "",
  tags: values.tags,
  estimatedHours: values.estimatedHours !== null && values.estimatedHours !== undefined ? String(values.estimatedHours) : "",
});

const toTaskFormValues = (state: TaskFormState): TaskFormValues => ({
  title: state.title.trim(),
  description: state.description.trim(),
  priority: state.priority,
  status: state.status,
  dueDate: state.dueDate ? state.dueDate : null,
  projectId: state.projectId,
  assigneeId: state.assigneeId ? state.assigneeId : null,
  tags: state.tags,
  estimatedHours: state.estimatedHours ? Number(state.estimatedHours.trim()) : null,
});

export interface TaskFormHandle {
  submit: () => void;
  reset: () => void;
}

interface TaskFormProps {
  mode: "create" | "edit";
  projects: Project[];
  teamMembers: TeamMember[];
  initialValues?: TaskFormValues;
  isSubmitting?: boolean;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type ErrorState = Partial<Record<keyof TaskFormValues, string>>;

export const TaskForm = forwardRef<TaskFormHandle, TaskFormProps>(
  (
    {
      mode,
      projects,
      teamMembers,
      initialValues = defaultTaskFormValues,
      isSubmitting,
      onSubmit,
      onCancel,
      onDirtyChange,
    },
    ref,
  ) => {
    const [formState, setFormState] = useState<TaskFormState>(() => toFormState(initialValues));
    const [errors, setErrors] = useState<ErrorState>({});
    const initialStateRef = useRef<TaskFormState>(toFormState(initialValues));

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

    const availableMembers = useMemo(() => {
      if (!formState.projectId) {
        return teamMembers;
      }
      const project = projects.find((entry) => entry.id === formState.projectId);
      if (!project) {
        return teamMembers;
      }
      if (project.teamMembers.length === 0) {
        return teamMembers;
      }
      return project.teamMembers;
    }, [formState.projectId, projects, teamMembers]);

    const handleSubmit = useCallback(async () => {
      const payload = toTaskFormValues(formState);
      if (payload.estimatedHours !== null && Number.isNaN(payload.estimatedHours)) {
        payload.estimatedHours = null;
      }

      const parsed = taskFormSchema.safeParse(payload);
      if (!parsed.success) {
        const nextErrors: ErrorState = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0];
          if (typeof path === "string" && !nextErrors[path as keyof TaskFormValues]) {
            nextErrors[path as keyof TaskFormValues] = issue.message;
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
        reset: () => setFormState(initialStateRef.current),
      }),
      [handleSubmit],
    );

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSubmit();
    };

    const updateField = <Key extends keyof TaskFormState>(key: Key, value: TaskFormState[Key]) => {
      setFormState((previous) => ({ ...previous, [key]: value }));
    };

    const statusOptions: Array<{ label: string; value: TaskStatus }> = [
      { label: "To do", value: "todo" },
      { label: "In progress", value: "in-progress" },
      { label: "Completed", value: "completed" },
      { label: "Blocked", value: "blocked" },
    ];

    return (
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6" noValidate>
        <div className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="task-title" className="text-sm font-medium text-slate-700">
              Task title
            </label>
            <input
              id="task-title"
              type="text"
              value={formState.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={120}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              aria-invalid={Boolean(errors.title)}
              aria-describedby="task-title-help"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span id="task-title-help">Keep it concise—120 characters max.</span>
              <span>{formState.title.length}/120</span>
            </div>
            {errors.title ? <p className="text-xs font-medium text-rose-600">{errors.title}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="task-description" className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="task-description"
              value={formState.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={6}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              aria-invalid={Boolean(errors.description)}
              aria-describedby="task-description-help"
            />
            <p id="task-description-help" className="text-xs text-slate-500">
              Supports Markdown for quick formatting. Describe the goal, context, or acceptance criteria.
            </p>
            {errors.description ? <p className="text-xs font-medium text-rose-600">{errors.description}</p> : null}
          </div>
        </div>

        <PrioritySelector value={formState.priority} onChange={(priority) => updateField("priority", priority)} error={errors.priority} />

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="task-status" className="text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="task-status"
              value={formState.status}
              onChange={(event) => updateField("status", event.target.value as TaskStatus)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              aria-invalid={Boolean(errors.status)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status ? <p className="text-xs font-medium text-rose-600">{errors.status}</p> : null}
          </div>

          <DatePicker
            id="task-due-date"
            label="Due date"
            value={formState.dueDate || null}
            onChange={(value) => updateField("dueDate", value ?? "")}
            description="Leave blank if this task is flexible."
            error={errors.dueDate}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <ProjectSelector
            value={formState.projectId}
            onChange={(projectId) => {
              updateField("projectId", projectId);
              const project = projects.find((entry) => entry.id === projectId);
              if (project) {
                const memberIds = new Set(project.teamMembers.map((member) => member.id));
                if (formState.assigneeId && !memberIds.has(formState.assigneeId)) {
                  updateField("assigneeId", "");
                }
              }
            }}
            projects={projects}
            error={errors.projectId}
          />
          <AssigneeSelector
            members={availableMembers}
            value={formState.assigneeId || null}
            onChange={(memberId) => updateField("assigneeId", memberId ?? "")}
            error={errors.assigneeId}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <TagInput tags={formState.tags} onChange={(tags) => updateField("tags", tags)} error={errors.tags} />
          <div className="space-y-2">
            <label htmlFor="task-estimate" className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Estimated time</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Optional</span>
            </label>
            <input
              id="task-estimate"
              type="number"
              min={0}
              step={0.5}
              value={formState.estimatedHours}
              onChange={(event) => updateField("estimatedHours", event.target.value)}
              placeholder="e.g. 4"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              aria-invalid={Boolean(errors.estimatedHours)}
            />
            <p className="text-xs text-slate-500">Track forecasted effort in hours to stay realistic with planning.</p>
            {errors.estimatedHours ? <p className="text-xs font-medium text-rose-600">{errors.estimatedHours}</p> : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Press ⌘/Ctrl + Enter to save instantly.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                "inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                isSubmitting ? "cursor-wait opacity-80" : "",
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create task" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    );
  },
);

TaskForm.displayName = "TaskForm";

