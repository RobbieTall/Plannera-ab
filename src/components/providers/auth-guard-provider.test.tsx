import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React, { type ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const useSessionMock = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

vi.mock("@/components/SignInModal", () => ({
  SignInModal: () => null,
}));

import { AuthGuardProvider, useAuthGuard } from "@/components/providers/auth-guard-provider";

const wrapper = ({ children }: { children: ReactNode }) => <AuthGuardProvider>{children}</AuthGuardProvider>;

describe("AuthGuardProvider signed-in truth", () => {
  it("keeps bypass entitlement distinct from an actual signed-in user", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
    const { result } = renderHook(() => useAuthGuard(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
  });

  it("reports actual signed-in state from NextAuth", () => {
    useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } }, status: "authenticated" });
    const { result } = renderHook(() => useAuthGuard(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isSignedIn).toBe(true);
  });
});
