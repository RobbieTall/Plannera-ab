import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold text-slate-900">
            Plannera.ai
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="hidden sm:inline">{session.user.email}</span>
            <SignOutButton className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
              Sign out
            </SignOutButton>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {session.user.name ?? session.user.email}</h1>
          <p className="mt-2 text-sm text-slate-600">
            You are signed in with a passwordless magic link. Replace this dashboard with product functionality as
            needed.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Session details</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <dt>Email</dt>
                <dd className="font-medium text-slate-900">{session.user.email}</dd>
              </div>
              {session.user.name && (
                <div className="flex justify-between">
                  <dt>Name</dt>
                  <dd className="font-medium text-slate-900">{session.user.name}</dd>
                </div>
              )}
              {session.user.image && (
                <div className="flex justify-between">
                  <dt>Avatar</dt>
                  <dd className="font-medium text-slate-900">{session.user.image}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Next steps</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>Configure SMTP credentials and database connection in <code>.env</code>.</li>
              <li>Run <code>npx prisma migrate dev</code> to create the database schema.</li>
              <li>Replace this dashboard with your product experience.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
