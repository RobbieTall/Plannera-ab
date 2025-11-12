import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in • Plannera.ai",
};

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold text-slate-900">
            Plannera.ai
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your work email and we&apos;ll send you a secure magic link.
          </p>
          <div className="mt-6">
            <SignInForm />
          </div>
        </div>
      </main>
    </div>
  );
}
