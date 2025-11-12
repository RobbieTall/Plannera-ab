"use client";

import { forwardRef } from "react";
import { CalendarDays } from "lucide-react";

interface DatePickerProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
  description?: string;
  error?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ id, label, value, onChange, required, description, error }, ref) => {
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="flex items-center justify-between text-sm font-medium text-slate-700">
          <span>{label}</span>
          {required ? <span className="text-xs font-semibold uppercase tracking-wide text-rose-500">Required</span> : null}
        </label>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={ref}
            type="date"
            id={id}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value ? event.target.value : null)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            aria-invalid={Boolean(error)}
            aria-describedby={description ? `${id}-description` : undefined}
          />
        </div>
        {description ? (
          <p id={`${id}-description`} className="text-xs text-slate-500">
            {description}
          </p>
        ) : null}
        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";

