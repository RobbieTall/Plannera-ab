import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Optional className applied to the root element for sizing control.
   */
  className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
  return (
    <div
      className={cn("flex items-center gap-2 font-semibold text-slate-900", className)}
      aria-label="Plannera.ai"
      {...props}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-sm text-white">PL</span>
      <span className="text-base leading-none">Plannera.ai</span>
    </div>
  );
}
