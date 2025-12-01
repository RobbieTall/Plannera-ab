"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type SignOutButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  const router = useRouter();

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    await fetch("/api/auth/clear-session", {
      method: "POST",
      cache: "no-store",
    });

    const signOutResult = await signOut({ callbackUrl: "/", redirect: false });
    const destination = typeof signOutResult?.url === "string" ? signOutResult.url : "/";

    router.push(destination);
    router.refresh();
  };

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
