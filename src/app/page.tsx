"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";

import { SiteHeader } from "@/components/navigation/site-header";
import { buildWorkspaceSeedQuery, launchExampleAddresses } from "@/lib/landing-entry";

const navigation = [{ label: "My Projects", href: "/projects" }];

export default function HomePage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSiteCheck(rawAddress: string) {
    const trimmed = rawAddress.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    setAddress(trimmed);

    try {
      const response = await fetch("/api/projects/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Unable to start a Quick Site Check. Please try again.");
      }

      const payload = await response.json();
      const projectId = payload?.project?.id;
      const query = buildWorkspaceSeedQuery(trimmed);
      if (!projectId || !query) {
        throw new Error("Unable to open the site workspace. Please try again.");
      }

      router.push(`/projects/${projectId}/workspace?${query}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start a Quick Site Check. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await startSiteCheck(address);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <SiteHeader navigation={navigation} />
      <main className="flex-1">
        <section className="mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-4xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="check-heading">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <MapPin className="h-4 w-4" /> Plannera Check
            </p>
            <div className="space-y-3">
              <h1 id="check-heading" className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                Run a free Quick Site Check.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-700">
                Enter a site address to resolve the real project workspace, retrieve available NSW planning controls, and reveal cited or unavailable evidence. Pilot coverage is focused on Byron and Kempsey. This is planning information for early scoping, not legal or professional planning advice.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl border-y border-slate-200 py-4">
              <label htmlFor="site-address" className="block text-sm font-semibold text-slate-900">Site address</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="site-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  autoComplete="street-address"
                  placeholder="45 Broken Head Road, Byron Bay NSW 2481"
                  className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                />
                <button
                  type="submit"
                  disabled={submitting || !address.trim()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "Starting…" : "Run free site check"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
            </form>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Approved launch examples</p>
              <div className="flex flex-wrap gap-2">
                {launchExampleAddresses.map((example) => (
                  <button key={example} type="button" onClick={() => startSiteCheck(example)} disabled={submitting} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60">
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white" aria-label="What happens next">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span className="font-semibold text-slate-900">Next: Create project in Plannera</span>
            <span className="max-w-2xl">The same project and evidence continue into Detailed Planning Pack, SEE, and referral steps only when current evidence supports them.</span>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} Plannera.ai</span>
          <Link href="/projects" className="font-medium text-slate-700 hover:text-slate-950">My Projects</Link>
        </div>
      </footer>
    </div>
  );
}
