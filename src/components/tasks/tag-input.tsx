"use client";

import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}

export function TagInput({ tags, onChange, error }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || tags.includes(trimmed)) {
      return;
    }
    onChange([...tags, trimmed]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((existing) => existing !== tag));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Tab" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && !draft && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="task-tags" className="flex items-center justify-between text-sm font-medium text-slate-700">
        <span>Tags</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Optional</span>
      </label>
      <div className="rounded-2xl border border-slate-200 bg-white p-2 transition focus-within:border-slate-900">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-1 transition hover:bg-slate-900/10"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="task-tags"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length ? "Add another tag" : "Add tags and press enter"}
            className="flex-1 min-w-[120px] border-none bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">Use tags to group tasks by themes, labels, or workflows.</p>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

