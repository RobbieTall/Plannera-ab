"use client";

import { useSession } from "next-auth/react";

export function useAuthState() {
  const { data, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(data?.user);

  return { session: data, status, isAuthenticated };
}
