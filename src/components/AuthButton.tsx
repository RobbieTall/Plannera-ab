"use client";

import { useRouter } from "next/navigation";

import { useAuthGuard } from "@/components/providers/auth-guard-provider";

export function AuthButton() {
  const router = useRouter();
  const { isAuthenticated, openAuthModal } = useAuthGuard();

  const label = isAuthenticated ? "Account" : "Sign in";

  const handleClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }

    openAuthModal();
  };

  return (
    <button type="button" onClick={handleClick} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
      {label}
    </button>
  );
}
