import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Optional className applied to the root element for sizing control.
   */
  className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold text-current", className)} aria-label="Plannera.ai" {...props}>
      <svg
        aria-hidden
        viewBox="0 0 32 32"
        fill="currentColor"
        className="h-9 w-9"
        role="presentation"
      >
        <path d="M7 6a3 3 0 0 1 3-3h8a7 7 0 1 1 0 14h-5v9a2 2 0 0 1-2 2H7V6Zm6 8h5a3 3 0 1 0 0-6h-5v6Z" />
        <path d="M7 21h4v5H7z" opacity="0.2" />
      </svg>
      <span className="text-base leading-none">Plannera.ai</span>
    </span>
  );
}
