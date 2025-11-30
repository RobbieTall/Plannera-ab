"use client";

import { useRouter } from "next/navigation";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type SignOutButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  const router = useRouter();

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    await fetch("/api/auth/signout", {
      method: "POST",
    });

    router.push("/");
    router.refresh();
  };

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
