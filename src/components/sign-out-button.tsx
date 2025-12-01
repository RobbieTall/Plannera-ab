"use client";

import { signOut } from "next-auth/react";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type SignOutButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    await fetch("/api/auth/signout", {
      method: "POST",
    });

    await signOut({ callbackUrl: "/" });
  };

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
