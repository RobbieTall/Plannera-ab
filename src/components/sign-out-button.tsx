"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { signOut } from "next-auth/react";

type SignOutButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      await signOut({ callbackUrl: "/" });
    }
  };

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
