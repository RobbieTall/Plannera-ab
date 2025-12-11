"use client";

import { FormEvent, useEffect, useState } from "react";
import { MapPin } from "lucide-react";

type SetSiteInputProps = {
  onSubmit: (value: string) => void;
  initialValue?: string;
};

export function SetSiteInput({ onSubmit, initialValue }: SetSiteInputProps) {
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue(trimmed);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50"
    >
      <label className="flex items-center gap-3" htmlFor="set-site-input">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-700">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <input
            id="set-site-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter site address…"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">Press Enter to set the project site.</p>
        </div>
      </label>
    </form>
  );
}
