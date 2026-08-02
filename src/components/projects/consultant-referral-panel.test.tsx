import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsultantReferralPanel } from "@/components/projects/consultant-referral-panel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const response = (body: unknown, ok = true) => Promise.resolve({
  ok,
  json: async () => body,
}) as Promise<Response>;

describe("ConsultantReferralPanel", () => {
  it("requires contact details and explicit consent before submitting to the human queue", async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response({ enabled: true, referral: null }))
      .mockImplementationOnce(() => response({
        created: true,
        referral: {
          id: "referral-1",
          reviewRequestArtefactId: "review-1",
          status: "SUBMITTED",
          queueTarget: "plannera_human_queue",
          submittedAt: "2026-08-02T01:00:00.000Z",
          updatedAt: "2026-08-02T01:00:00.000Z",
          events: [{ fromStatus: null, toStatus: "SUBMITTED", occurredAt: "2026-08-02T01:00:00.000Z", reasonCode: "explicit_consent_submission" }],
        },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ConsultantReferralPanel projectId="project-1" reviewRequestArtefactId="review-1" />);

    const submit = await screen.findByRole("button", { name: "Submit to Plannera" });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/human-operated queue/i)).toBeInTheDocument();
    expect(screen.getByText(/does not promise matching/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Contact name"), "Alex Owner");
    await user.type(screen.getByLabelText("Contact email"), "alex@example.com");
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByText("Submitted to Plannera. No consultant has been contacted yet.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/projects/project-1/consultant-referrals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          reviewRequestArtefactId: "review-1",
          contactName: "Alex Owner",
          contactEmail: "alex@example.com",
          consent: true,
        }),
      }),
    );
  });

  it("distinguishes sent from consultant acknowledged", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response({
      enabled: true,
      referral: {
        id: "referral-1",
        reviewRequestArtefactId: "review-1",
        status: "ASSIGNED",
        queueTarget: "plannera_human_queue",
        submittedAt: "2026-08-02T01:00:00.000Z",
        updatedAt: "2026-08-02T02:00:00.000Z",
        events: [
          { fromStatus: null, toStatus: "SUBMITTED", occurredAt: "2026-08-02T01:00:00.000Z", reasonCode: null },
          { fromStatus: "ACKNOWLEDGED", toStatus: "ASSIGNED", occurredAt: "2026-08-02T02:00:00.000Z", reasonCode: "sent_to_consultant" },
        ],
      },
    })));

    render(<ConsultantReferralPanel projectId="project-1" reviewRequestArtefactId="review-1" />);

    expect(await screen.findByText(/sent to a consultant/i)).toBeInTheDocument();
    expect(screen.getByText("Sent to consultant")).toBeInTheDocument();
    expect(screen.getByText("Consultant acknowledged")).toBeInTheDocument();
    expect(screen.getByText(/acknowledgement has not yet been recorded/i)).toBeInTheDocument();
  });

  it("truthfully leaves direct submission unavailable when the queue flag is off", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response({ enabled: false, referral: null })));

    render(<ConsultantReferralPanel projectId="project-1" reviewRequestArtefactId="review-1" />);

    expect(await screen.findByText("Direct submission is not currently open")).toBeInTheDocument();
    expect(screen.getByText(/No referral has been submitted/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Submit to Plannera" })).not.toBeInTheDocument());
  });

  it("does not report the queue as closed when referral status cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Unable to load referral status"))));

    render(<ConsultantReferralPanel projectId="project-1" reviewRequestArtefactId="review-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load referral status");
    expect(screen.getByText(/No submission state is being inferred/i)).toBeInTheDocument();
    expect(screen.queryByText("Direct submission is not currently open")).not.toBeInTheDocument();
  });
});
