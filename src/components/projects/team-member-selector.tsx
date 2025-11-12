"use client";

import { useMemo, useState } from "react";
import { Check, Search, Users } from "lucide-react";

import type { TeamMember } from "@/lib/mock-data";

interface TeamMemberSelectorProps {
  members: TeamMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

export function TeamMemberSelector({ members, selectedIds, onChange, error }: TeamMemberSelectorProps) {
  const [query, setQuery] = useState("");

  const filteredMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return members;
    }
    return members.filter((member) =>
      `${member.name} ${member.role}`.toLowerCase().includes(term),
    );
  }, [members, query]);

  const toggleMember = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
        <span className="inline-flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Team members
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Multi-select
        </span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-slate-900">
        <label className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or role"
            className="w-full border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Search team members"
          />
        </label>
        <div className="max-h-48 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">No team members match your search.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredMembers.map((member) => {
                const isSelected = selectedIds.includes(member.id);
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-100"
                      aria-pressed={isSelected}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600"
                          style={{ backgroundImage: `url(${member.avatarUrl})`, backgroundSize: "cover" }}
                          aria-hidden="true"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-900">{member.name}</span>
                          <span className="text-xs text-slate-500">{member.role}</span>
                        </span>
                      </span>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 text-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">Tip: Invite the core delivery team so assignments stay focused.</p>
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
