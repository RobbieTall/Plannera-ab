"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, Search, UserCircle2 } from "lucide-react";

import type { TeamMember } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface AssigneeSelectorProps {
  members: TeamMember[];
  value: string | null;
  onChange: (memberId: string | null) => void;
  error?: string;
}

export function AssigneeSelector({ members, value, onChange, error }: AssigneeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) {
      return members;
    }
    const term = searchTerm.toLowerCase();
    return members.filter((member) => member.name.toLowerCase().includes(term) || member.role.toLowerCase().includes(term));
  }, [members, searchTerm]);

  const selectedMember = members.find((member) => member.id === value);

  return (
    <div className="space-y-2">
      <label htmlFor="task-assignee" className="flex items-center justify-between text-sm font-medium text-slate-700">
        <span>Assignee</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Optional</span>
      </label>
      <div className="rounded-2xl border border-slate-200 bg-white transition focus-within:border-slate-900">
        <div className="flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            id="task-assignee"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search team members"
            className="w-full border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="max-h-40 overflow-y-auto border-t border-slate-100">
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-slate-50",
              value === null ? "bg-slate-50" : "",
            )}
            onClick={() => onChange(null)}
          >
            <UserCircle2 className="h-8 w-8 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Unassigned</p>
              <p className="text-xs text-slate-500">Keep this task without an owner for now</p>
            </div>
            {value === null ? <Check className="ml-auto h-4 w-4 text-slate-900" /> : null}
          </button>
          {filteredMembers.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-500">No team members match “{searchTerm}”.</p>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = value === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-slate-50",
                    isSelected ? "bg-slate-50" : "",
                  )}
                  onClick={() => onChange(member.id)}
                >
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                  />
                  <div>
                    <p className="font-medium text-slate-700">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.role}</p>
                  </div>
                  {isSelected ? <Check className="ml-auto h-4 w-4 text-slate-900" /> : null}
                </button>
              );
            })
          )}
        </div>
      </div>
      {selectedMember ? (
        <p className="text-xs text-slate-500">
          Assigned to <span className="font-medium text-slate-700">{selectedMember.name}</span>
        </p>
      ) : (
        <p className="text-xs text-slate-500">You can assign an owner later.</p>
      )}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

