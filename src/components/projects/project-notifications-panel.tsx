"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";

interface ProjectNotification {
  id: string;
  type: "LGA_SEARCHABLE_READY";
  title: string;
  message: string;
  lgaCode: string | null;
  createdAt: string;
}

interface ProjectNotificationsPanelProps {
  projectId: string;
}

export function ProjectNotificationsPanel({ projectId }: ProjectNotificationsPanelProps) {
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/notifications`, { credentials: "include" });
        if (!response.ok) return;

        const data = (await response.json()) as { notifications?: ProjectNotification[] };
        if (!cancelled) {
          setNotifications((data.notifications ?? []).filter((notification) => notification.type === "LGA_SEARCHABLE_READY"));
        }
      } catch {
        // Keep workspace chat usable if notification fetch fails.
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const dismissNotification = useCallback(
    async (notificationId: string) => {
      setDismissingId(notificationId);

      try {
        const response = await fetch(`/api/projects/${projectId}/notifications/${notificationId}/read`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) return;

        setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      } catch {
        // Leave the notification visible so it can be dismissed later.
      } finally {
        setDismissingId(null);
      }
    },
    [projectId],
  );

  if (!hasLoaded || notifications.length === 0) return null;

  return (
    <div className="space-y-2" aria-live="polite">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="flex items-start gap-3 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
        >
          <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100">
            <Check className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{notification.title}</p>
            <p className="mt-1 text-xs leading-5 text-emerald-900/80 dark:text-emerald-100/80">{notification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => void dismissNotification(notification.id)}
            disabled={dismissingId === notification.id}
            className="rounded-full p-1 text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-100 dark:hover:bg-emerald-400/20"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
