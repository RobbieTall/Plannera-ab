"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type MainNavigationProps = {
  items: NavigationItem[];
  orientation?: "vertical" | "horizontal";
  className?: string;
};

export function MainNavigation({ items, orientation = "vertical", className }: MainNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        orientation === "vertical"
          ? "flex flex-1 flex-col gap-1"
          : "flex w-full items-center gap-2 overflow-x-auto",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
              orientation === "horizontal" ? "whitespace-nowrap" : "",
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900",
            )}
          >
            <item.icon className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
