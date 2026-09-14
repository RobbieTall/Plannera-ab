import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }));

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}));

import { SignOutButton } from "@/components/sign-out-button";

describe("SignOutButton", () => {
  beforeEach(() => {
    signOutMock.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("clears the Plannera session before signing out of NextAuth", async () => {
    render(<SignOutButton>Sign out</SignOutButton>);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/" }));
    expect(fetch).toHaveBeenCalledWith("/api/auth/clear-session", { method: "POST" });
    expect(vi.mocked(fetch).mock.invocationCallOrder[0]).toBeLessThan(
      signOutMock.mock.invocationCallOrder[0],
    );
  });
});
