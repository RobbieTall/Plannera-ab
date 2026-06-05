import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectNotificationsPanel } from "@/components/projects/project-notifications-panel";

describe("ProjectNotificationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the LGA-ready notification", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [
          {
            id: "notification-1",
            type: "LGA_SEARCHABLE_READY",
            title: "Local planning controls are searchable",
            message:
              "Local planning controls for KEMPSEY are now searchable. You can refresh affected project outputs where needed.",
            lgaCode: "KEMPSEY",
            createdAt: "2026-06-02T10:00:00.000Z",
          },
        ],
      }),
    } as Response);

    render(<ProjectNotificationsPanel projectId="project-1" />);

    expect(await screen.findByText("Local planning controls are searchable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Local planning controls for KEMPSEY are now searchable. You can refresh affected project outputs where needed.",
      ),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/projects/project-1/notifications", { credentials: "include" });
  });

  it("dismiss action marks the notification read and hides it", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: [
            {
              id: "notification-1",
              type: "LGA_SEARCHABLE_READY",
              title: "Local planning controls are searchable",
              message:
                "Local planning controls for KEMPSEY are now searchable. You can refresh affected project outputs where needed.",
              lgaCode: "KEMPSEY",
              createdAt: "2026-06-02T10:00:00.000Z",
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as Response);

    render(<ProjectNotificationsPanel projectId="project-1" />);

    expect(await screen.findByText("Local planning controls are searchable")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss notification"));

    await waitFor(() => {
      expect(screen.queryByText("Local planning controls are searchable")).not.toBeInTheDocument();
    });
    expect(fetch).toHaveBeenLastCalledWith("/api/projects/project-1/notifications/notification-1/read", {
      method: "POST",
      credentials: "include",
    });
  });
});
