"use client";

import React from "react";

import { cn } from "@/lib/utils";

const REACTIONS = ["👍", "👎", "🏗️", "✅"] as const;

interface MessageReactionBarProps {
  messageId: string;
  reactions: Record<string, number>;
  onToggle: (messageId: string, emoji: string) => void;
}

export function MessageReactionBar({ messageId, reactions, onToggle }: MessageReactionBarProps) {
  return (
    <div className="mt-1 flex gap-1" role="group" aria-label="Message reactions">
      {REACTIONS.map((emoji) => {
        const count = reactions[emoji] ?? 0;
        const active = count > 0;
        return (
          <button
            key={emoji}
            type="button"
            aria-pressed={active}
            aria-label={`React with ${emoji}`}
            onClick={() => onToggle(messageId, emoji)}
            className={cn(
              "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
              active
                ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                : "border-transparent hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700",
            )}
          >
            <span>{emoji}</span>
            {active && <span className="text-slate-600 dark:text-slate-400">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
