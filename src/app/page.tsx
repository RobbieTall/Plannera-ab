import Link from "next/link";

const navigation: { label: string; href: string }[] = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
];

const featureHighlights: { title: string; description: string }[] = [
  {
    title: "Planning intelligence",
    description:
      "Generate compliant documentation and track planning milestones with audit-ready transparency.",
  },
  {
    title: "Feasibility modelling",
    description:
      "Run live scenario models to understand project viability and unlock smarter investment decisions.",
  },
  {
    title: "Team alignment",
    description:
      "Coordinate consultants, councils, and investors through structured workflows and automated updates.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="text-lg font-semibold text-slate-900">Plannera.ai</div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-slate-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="mailto:hello@plannera.ai"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            Request access
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-6 py-16">
        <section id="platform" className="grid gap-12 lg:grid-cols-[1.35fr,1fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Property development, orchestrated
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              Build the future of planning with Plannera.ai
            </h1>
            <p className="text-lg text-slate-600">
              Plannera.ai gives property teams a shared operating system for planning approvals, feasibility
              modelling, and stakeholder communication.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="mailto:hello@plannera.ai"
                className="flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                Talk to us
              </Link>
              <Link
                href="https://www.plannera.ai"
                className="flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Visit Plannera.ai
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Why teams choose Plannera.ai</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-600">
              <li>Stay aligned from feasibility through delivery with guided workflows.</li>
              <li>Centralise documentation with versioned audit trails.</li>
              <li>Ship submissions faster with AI-accelerated drafting tools.</li>
            </ul>
          </div>
        </section>

        <section id="features" className="space-y-10">
          <h2 className="text-2xl font-semibold text-slate-900">Feature highlights</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {featureHighlights.map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Designed for confident delivery</h2>
          <p className="text-base text-slate-600">
            From boutique developments to multi-site portfolios, Plannera.ai gives every team the tools to operate
            with clarity. Deploy on Vercel, scale globally, and extend the platform with integrations tailored to your
            workflow.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Plannera.ai. Built with Next.js 14.</span>
          <div className="flex gap-4">
            <Link href="https://nextjs.org" className="transition hover:text-slate-700">
              Next.js
            </Link>
            <Link href="https://tailwindcss.com" className="transition hover:text-slate-700">
              Tailwind CSS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
