"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { SignInModal } from "./SignInModal";

export function AuthButton() {
  const { data } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isAuthenticated = Boolean(data?.user?.id || data?.user?.email);
  const label = isAuthenticated ? "Account" : "Sign in";

  const handleClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }

    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={handleClick} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
        {label}
      </button>
      <SignInModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
