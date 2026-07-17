"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { SignInModal } from "@/components/SignInModal";

export const AUTH_BYPASS_ACTIVE = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true";

export type PendingAuthAction = () => void | Promise<void>;

interface AuthGuardContextValue {
  requireAuth: (action: PendingAuthAction) => void;
  openAuthModal: (action?: PendingAuthAction) => void;
  closeAuthModal: () => void;
  isAuthenticated: boolean;
  isSignedIn: boolean;
  isAuthModalOpen: boolean;
}

const AuthGuardContext = createContext<AuthGuardContextValue | null>(null);

export function AuthGuardProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingActionRef = useRef<PendingAuthAction | null>(null);

  const isSignedIn = status === "authenticated" && Boolean(session?.user);
  const isAuthenticated = AUTH_BYPASS_ACTIVE ? true : isSignedIn;

  const callbackUrl = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  const projectId = useMemo(() => pathname.match(/\/projects\/([^/]+)\/workspace/)?.[1], [pathname]);

  const executePendingAction = useCallback(async () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (!action) return;
    try {
      await action();
    } catch (error) {
      console.error("[auth-guard] Failed to execute pending action", error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setIsAuthModalOpen(false);
      if (pendingActionRef.current) {
        void executePendingAction();
      }
    }
  }, [executePendingAction, isAuthenticated]);

  const openAuthModal = useCallback((action?: PendingAuthAction) => {
    if (action) {
      pendingActionRef.current = action;
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const requireAuth = useCallback(
    (action: PendingAuthAction) => {
      if (AUTH_BYPASS_ACTIVE) {
        void Promise.resolve(action());
        return;
      }

      if (isAuthenticated) {
        void Promise.resolve(action());
        return;
      }

      pendingActionRef.current = action;
      setIsAuthModalOpen(true);
    },
    [isAuthenticated],
  );

  const value = useMemo(
    () => ({ requireAuth, openAuthModal, closeAuthModal, isAuthenticated, isSignedIn, isAuthModalOpen }),
    [closeAuthModal, isAuthModalOpen, isAuthenticated, isSignedIn, openAuthModal, requireAuth],
  );

  return (
    <AuthGuardContext.Provider value={value}>
      {children}
      <SignInModal open={isAuthModalOpen} onClose={closeAuthModal} callbackUrl={callbackUrl} projectId={projectId} />
    </AuthGuardContext.Provider>
  );
}

export function useAuthGuard() {
  const context = useContext(AuthGuardContext);
  if (!context) {
    throw new Error("useAuthGuard must be used within an AuthGuardProvider");
  }
  return context;
}
