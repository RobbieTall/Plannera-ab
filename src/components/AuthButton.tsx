"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { SignInModal } from "./SignInModal";

export function AuthButton() {
  const { data } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const callbackUrl = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  return (
    <>
      <button type="button" onClick={handleClick} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
        {label}
      </button>
      <SignInModal open={open} onClose={() => setOpen(false)} callbackUrl={callbackUrl} />
    </>
  );
}
