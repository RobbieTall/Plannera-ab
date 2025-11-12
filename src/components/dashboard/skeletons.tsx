import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-2xl bg-slate-200/70", className)} />;
}

export function ProjectSkeleton() {
  return <Skeleton className="h-48 w-full" />;
}

export function TaskSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}
