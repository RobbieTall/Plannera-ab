"use client";

import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/mock-data";

interface PrioritySelectorProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  error?: string;
}

const priorities: Array<{ label: string; value: TaskPriority; description: string; accent: string }> = [
  { label: "High", value: "high", description: "Critical tasks that need immediate attention", accent: "bg-rose-500/10 text-rose-600" },
  { label: "Medium", value: "medium", description: "Important tasks with a reasonable timeline", accent: "bg-amber-500/10 text-amber-600" },
  { label: "Low", value: "low", description: "Nice-to-have tasks or longer timelines", accent: "bg-emerald-500/10 text-emerald-600" },
];

export function PrioritySelector({ value, onChange, error }: PrioritySelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">Priority</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {priorities.map((priority) => {
          const isActive = value === priority.value;
          return (
            <button
              key={priority.value}
              type="button"
              onClick={() => onChange(priority.value)}
              className={cn(
                "flex h-full flex-col rounded-2xl border bg-white p-4 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                isActive ? "border-slate-900 shadow-sm" : "border-slate-200 hover:border-slate-300",
              )}
              aria-pressed={isActive}
            >
              <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", priority.accent)}>
                {priority.label}
              </span>
              <span className="mt-3 text-xs text-slate-500">{priority.description}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </fieldset>
  );
}

