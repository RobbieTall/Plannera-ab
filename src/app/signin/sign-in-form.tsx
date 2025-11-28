"use client";

import { FormEvent, useState } from "react";

import { useExperience } from "@/components/providers/experience-provider";

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

export function SignInForm() {
  const { setUserTier } = useExperience();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      await postMagicLink(email.trim());
      setStatus("success");
      setMessage("Magic link sent. Check your inbox to finish signing in.");
      setUserTier("free");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send magic link.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-75"
      >
        {status === "loading" ? "Sending magic link..." : "Send me a magic link"}
      </button>
      {message && (
        <p
          className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}
          role={status === "error" ? "alert" : undefined}
        >
          {message}
        </p>
      )}
    </form>
  );
}
