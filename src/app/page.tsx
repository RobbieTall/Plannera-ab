"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, FileSearch, MapPin, Send } from "lucide-react";

import { SiteHeader } from "@/components/navigation/site-header";
import { buildWorkspaceSeedQuery, launchExampleAddresses } from "@/lib/landing-entry";

const navigation = [
  { label: "Quick Site Check", href: "#quick-site-check" },
  { label: "Journey", href: "#journey" },
  { label: "Scope", href: "#scope" },
];

const journey = [
  { title: "Site", description: "Start with one launch-path NSW address so the workspace has the correct site seed." },
  { title: "Quick Site Check", description: "Run the free check for site, zone and key LEP controls with cited NSW planning sources." },
  { title: "Detailed Planning Pack", description: "Use proposal-specific DCP detail and provenance when the proposal is ready to test." },
  { title: "SEE / referral", description: "Move cited outputs into a consultant-ready SEE or referral handoff when the evidence supports it." },
];

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
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      <SiteHeader navigation={navigation} />
      <main className="flex-1">
        <section id="quick-site-check" className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded border border-emerald-700/20 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">
                <MapPin className="h-4 w-4" /> Plannera Quick Site Check
              </p>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                  Run a free Quick Site Check for a launch-path NSW address.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700">
                  Plannera is piloting cited NSW planning checks for the Byron and Kempsey launch path. The free check covers site, zone and key LEP controls; proposal-specific DCP detail follows in the Detailed Planning Pack.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="max-w-2xl rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label htmlFor="site-address" className="block text-sm font-semibold text-slate-900">Site address</label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="site-address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    autoComplete="street-address"
                    placeholder="45 Broken Head Road, Byron Bay NSW 2481"
                    className="min-h-12 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !address.trim()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {submitting ? "Starting…" : "Run free site check"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
              </form>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Example addresses</p>
                <div className="flex flex-wrap gap-2">
                  {launchExampleAddresses.map((example) => (
                    <button key={example} type="button" onClick={() => startSiteCheck(example)} disabled={submitting} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60">
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <aside id="scope" className="self-start rounded-lg border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-950">What the free check is for</h2>
              <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                <li className="flex gap-3"><FileSearch className="mt-1 h-5 w-5 shrink-0 text-blue-700" />Cited NSW site, zone and key LEP control checks for the Byron/Kempsey launch workflow.</li>
                <li className="flex gap-3"><ClipboardCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-800" />A clean workspace seed for proposal-aware DCP review in the Detailed Planning Pack.</li>
                <li className="flex gap-3"><Send className="mt-1 h-5 w-5 shrink-0 text-slate-700" />Planning information to support early scoping, not legal or professional planning advice.</li>
              </ul>
            </aside>
          </div>
        </section>

        <section id="journey" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-slate-950">The four-step commercial journey</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {journey.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-blue-700">{index + 1}</p>
                <h3 className="mt-2 text-base font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} Plannera.ai</span>
          <Link href="/projects" className="font-medium text-slate-700 hover:text-slate-950">My Projects</Link>
        </div>
      </footer>
    </div>
  );
}
