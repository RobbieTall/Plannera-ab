"use client";

import { useSession } from "next-auth/react";

export function useAuthState() {
  const { data, status } = useSession();

  const isAuthenticated = Boolean(data?.user?.id ?? data?.user?.email);

  return { session: data, status, isAuthenticated };
}
