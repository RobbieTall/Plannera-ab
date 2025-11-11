import Link, { type LinkProps } from "next/link";

type NavigationItem = {
  name: string;
  href: LinkProps["href"];
};

const navigation: NavigationItem[] = [
  { name: "Milestones", href: { pathname: "/", hash: "milestones" } },
  { name: "Reports", href: { pathname: "/", hash: "reports" } },
  { name: "Playbooks", href: { pathname: "/", hash: "playbooks" } },
];

const features = [
  {
    title: "Automated council-ready documents",
    description:
      "Generate professionally structured planning submissions that stay aligned with local regulations.",
  },
  {
    title: "Feasibility intelligence",
    description:
      "Model development scenarios with real-time financial projections and compare outcomes side by side.",
  },
  {
    title: "Guided delivery milestones",
    description:
      "Track site progress with collaborative checklists that keep stakeholders aligned from concept to approval.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold text-slate-900">Plannera.ai</div>
          <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className="hover:text-slate-900">
                {item.name}
              </Link>
            ))}
          </nav>
          <Link
            href="#get-started"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm"
          >
            Request access
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
        <section className="grid gap-10 md:grid-cols-[1.3fr,1fr] md:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
              AB build · Next.js 14 + Tailwind CSS
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Property development workflows, orchestrated by AI.
            </h1>
            <p className="text-lg text-slate-600">
              Plannera.ai helps development teams produce compliant documentation, understand site feasibility,
              and stay on track with every stakeholder milestone.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                id="get-started"
                href="mailto:hello@plannera.ai"
                className="flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90"
              >
                Book a demo
              </Link>
              <Link
                href="https://nextjs.org/docs/app"
                className="flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Explore the stack
              </Link>
            </div>
          </div>
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">AB version focus</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>• Modular, testable components for future feature work.</li>
              <li>• Clear separation of domain logic and UI.</li>
              <li>• Reliable build tooling powered by Next.js 14 and Tailwind CSS.</li>
            </ul>
          </div>
        </section>

        <section id="reports" className="space-y-10">
          <h2 className="text-2xl font-semibold text-slate-900">Why this foundation works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card h-full">
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="milestones" className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Milestones at a glance</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Site acquisition",
              "Council submission",
              "Construction kickoff",
            ].map((stage, index) => (
              <div key={stage} className="card">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Phase {index + 1}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">{stage}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Centralise documents, assign owners, and capture decisions in one auditable thread.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="playbooks" className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Playbooks ready to extend</h2>
          <div className="card">
            <p className="text-sm text-slate-600">
              This project is structured using the Next.js App Router and a modular `src/` layout so teams can
              grow Plannera.ai with domain-specific features, integrations, and data pipelines without reworking
              the foundation.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Plannera.ai. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="https://nextjs.org" className="hover:text-slate-700">
              Built with Next.js 14
            </Link>
            <Link href="https://tailwindcss.com" className="hover:text-slate-700">
              Styled with Tailwind CSS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
