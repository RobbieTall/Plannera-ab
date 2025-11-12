"use client";

import { ChangeEvent, useId } from "react";

const presetColors = [
  "#2563eb",
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#e11d48",
  "#8b5cf6",
  "#14b8a6",
  "#0f172a",
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ColorPicker({ value, onChange, error }: ColorPickerProps) {
  const inputId = useId();

  const handleCustomChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
        <label htmlFor={inputId}>Project color</label>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Theme</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presetColors.map((color) => {
          const isActive = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`h-10 w-10 rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 ${
                isActive ? "border-slate-900" : "border-transparent hover:scale-[1.03]"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select ${color} as the project color`}
            />
          );
        })}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
          <label htmlFor={`${inputId}-custom`} className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Custom
          </label>
          <input
            id={`${inputId}-custom`}
            type="color"
            value={value}
            onChange={handleCustomChange}
            className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white"
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        </div>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
