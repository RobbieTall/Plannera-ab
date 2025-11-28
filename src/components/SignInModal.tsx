"use client";

import { FormEvent, useState } from "react";

const postMagicLink = async (email: string) => {
  const response = await fetch("/api/auth/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to send magic link");
  }
};

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SignInModal({ open, onClose }: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatus("loading");
    setMessage(null);

    try {
      await postMagicLink(email.trim());
      setStatus("sent");
      setMessage("Magic link sent. Check your inbox to finish signing in.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send magic link.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-600">
            Close
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">Enter your email to receive a sign-in link.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Send magic link"}
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>{message}</p>
        )}
      </div>
    </div>
  );
}
