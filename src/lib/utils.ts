export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(parsed);
}

export function formatShortDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export type DateRangeFilter = "all" | "overdue" | "this-week" | "next-week" | "this-month";

export function isWithinDateRange(date: string, range: DateRangeFilter) {
  if (range === "all") {
    return true;
  }

  const target = new Date(date);
  if (Number.isNaN(target.getTime())) {
    return false;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case "overdue": {
      return target < startOfDay;
    }
    case "this-week": {
      const weekStart = new Date(startOfDay);
      const day = weekStart.getDay();
      const diffToMonday = (day + 6) % 7;
      weekStart.setDate(weekStart.getDate() - diffToMonday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return target >= weekStart && target <= weekEnd;
    }
    case "next-week": {
      const weekStart = new Date(startOfDay);
      const day = weekStart.getDay();
      const diffToMonday = (day + 6) % 7;
      weekStart.setDate(weekStart.getDate() - diffToMonday + 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return target >= weekStart && target <= weekEnd;
    }
    case "this-month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      return target >= monthStart && target <= monthEnd;
    }
    default:
      return true;
  }
}

export function getStatusStyles(status: string) {
  switch (status) {
    case "todo":
      return "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200";
    case "in-progress":
      return "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200";
    case "completed":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
    case "blocked":
      return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

export function getPriorityStyles(priority: string) {
  switch (priority) {
    case "high":
      return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
    case "medium":
      return "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200";
    case "low":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

export function getProjectStatusStyles(status: string) {
  switch (status) {
    case "on-track":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
    case "at-risk":
      return "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200";
    case "off-track":
      return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
    case "completed":
      return "bg-slate-900 text-white ring-1 ring-inset ring-slate-900";
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}
