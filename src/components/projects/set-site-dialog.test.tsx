import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SiteCandidate } from "@/types/site";
import { setSiteFromCandidate, toPersistableSiteCandidate } from "@/lib/site-context-client";

vi.mock("@/lib/site-context-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/site-context-client")>(
    "@/lib/site-context-client",
  );
  return {
    ...actual,
    setSiteFromCandidate: vi.fn(),
  };
});

const TestSetSiteDialog = ({ candidates }: { candidates: SiteCandidate[] }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const persistableCandidates = candidates.map((candidate) => toPersistableSiteCandidate(candidate));

  const handleSave = async () => {
    if (!selectedId) {
      setError("Select a valid NSW site before confirming.");
      return;
    }
    const chosen = persistableCandidates.find((candidate) => candidate.id === selectedId);
    if (!chosen) {
      setError("Select a valid NSW site before confirming.");
      return;
    }
    try {
      await setSiteFromCandidate({
        projectId: "project-1",
        addressInput: chosen.formattedAddress,
        candidate: chosen,
      });
      setError(null);
      setOpen(false);
    } catch (dialogError) {
      console.error(dialogError);
      setError("Unable to save the selected site. Please try again.");
    }
  };

  if (!open) return null;

  return (
    <div>
      <fieldset>
        <legend>Select a site</legend>
        {persistableCandidates.map((candidate) => (
          <label key={candidate.id}>
            <input
              type="radio"
              name="site"
              value={candidate.id}
              onChange={() => {
                setSelectedId(candidate.id);
                setError(null);
              }}
            />
            {candidate.formattedAddress}
          </label>
        ))}
      </fieldset>
      {error ? (
        <div role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}
      <button type="button" onClick={() => void handleSave()}>
        Use this site
      </button>
    </div>
  );
};

const mockedSetSiteFromCandidate = vi.mocked(setSiteFromCandidate);

describe("Set Site dialog", () => {
  it("reuses the shared site setter with a persistable candidate", async () => {
    mockedSetSiteFromCandidate.mockResolvedValueOnce({
      id: "site-1",
      projectId: "project-1",
      addressInput: "22 Campbell Parade, Bondi Beach NSW, Australia",
      formattedAddress: "22 Campbell Parade, Bondi Beach NSW, Australia",
      lgaName: "Waverley",
      lgaCode: "WAV",
      parcelId: null,
      lot: null,
      planNumber: null,
      latitude: -33.891,
      longitude: 151.276,
      zone: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    const resolverCandidate: SiteCandidate = {
      id: "place-123",
      formattedAddress: "22 Campbell Parade, Bondi Beach NSW, Australia",
      lgaName: "Waverley",
      latitude: -33.891,
      longitude: 151.276,
      provider: "google",
    };

    render(<TestSetSiteDialog candidates={[resolverCandidate]} />);

    await userEvent.click(screen.getByLabelText(resolverCandidate.formattedAddress));
    await userEvent.click(screen.getByRole("button", { name: /use this site/i }));

    await waitFor(() => expect(mockedSetSiteFromCandidate).toHaveBeenCalled());

    expect(mockedSetSiteFromCandidate).toHaveBeenCalledWith({
      projectId: "project-1",
      addressInput: resolverCandidate.formattedAddress,
      candidate: expect.objectContaining({
        id: resolverCandidate.id,
        provider: "google",
        latitude: resolverCandidate.latitude,
        longitude: resolverCandidate.longitude,
        lgaName: resolverCandidate.lgaName,
      }),
    });

    await waitFor(() => expect(screen.queryByRole("button", { name: /use this site/i })).not.toBeInTheDocument());
    expect(screen.queryByText(/Unable to save the selected site/i)).not.toBeInTheDocument();
  });
});
