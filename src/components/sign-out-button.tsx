"use client";

import { signOut } from "next-auth/react";
import React from "react";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type SignOutButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const response = await fetch("/api/auth/clear-session", { method: "POST" });
    if (!response.ok) {
      throw new Error("Unable to clear the Plannera session");
    }
    await signOut({ callbackUrl: "/" });
  };

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
