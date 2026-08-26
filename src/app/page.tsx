"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";

import { SiteHeader } from "@/components/navigation/site-header";
import { buildWorkspaceSeedQuery, launchExampleAddresses } from "@/lib/landing-entry";

type ProposalFields = {
  landAreaHectares: string;
  proposedBuildingFootprintSquareMetres: string;
  existingFarmBuildingFootprintSquareMetres: string;
  proposedBuildingHeightMetres: string;
  roadSetbackMetres: string;
  sideSetbackMetres: string;
  otherBoundarySetbackMetres: string;
};

const emptyProposalFields: ProposalFields = {
  landAreaHectares: "",
  proposedBuildingFootprintSquareMetres: "",
  existingFarmBuildingFootprintSquareMetres: "",
  proposedBuildingHeightMetres: "",
  roadSetbackMetres: "",
  sideSetbackMetres: "",
  otherBoundarySetbackMetres: "",
};

export default function HomePage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [includeProposal, setIncludeProposal] = useState(false);
  const [proposalFields, setProposalFields] =
    useState<ProposalFields>(emptyProposalFields);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showItem74hAcceptance =
    process.env.NEXT_PUBLIC_ITEM74H_AUTHORITATIVE_SPATIAL_ACCEPTANCE === "true";
  const proposalComplete = Object.values(proposalFields).every(
    (value) => value.trim().length > 0,
  );

  const updateProposalField = (
    field: keyof ProposalFields,
    value: string,
  ) => {
    setProposalFields((current) => ({ ...current, [field]: value }));
  };

  function buildProposalAttestation() {
    if (!includeProposal) return undefined;
    if (!proposalComplete) {
      throw new Error(
        "Complete each shed detail, including zero where there are no existing farm buildings.",
      );
    }

    return {
      proposalPurpose:
        "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE" as const,
      landAreaHectares: Number(proposalFields.landAreaHectares),
      proposedBuildingFootprintSquareMetres: Number(
        proposalFields.proposedBuildingFootprintSquareMetres,
      ),
      existingFarmBuildingFootprintSquareMetres: Number(
        proposalFields.existingFarmBuildingFootprintSquareMetres,
      ),
      proposedBuildingHeightMetres: Number(
        proposalFields.proposedBuildingHeightMetres,
      ),
      roadSetbackMetres: Number(proposalFields.roadSetbackMetres),
      sideSetbackMetres: Number(proposalFields.sideSetbackMetres),
      otherBoundarySetbackMetres: Number(
        proposalFields.otherBoundarySetbackMetres,
      ),
      roadCategory: "UNRESOLVED" as const,
    };
  }

  async function startSiteCheck(rawAddress: string) {
    const trimmed = rawAddress.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    setAddress(trimmed);

    try {
      const proposalAttestation = buildProposalAttestation();
      const response = await fetch("/api/plannera-check/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          ...(proposalAttestation ? { proposalAttestation } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(
          "Unable to start a Quick Site Check. Review the details and try again.",
        );
      }

      const payload = await response.json();
      const projectId = payload?.project?.id;
      const query = buildWorkspaceSeedQuery(trimmed);
      if (!projectId || !query) {
        throw new Error("Unable to open the site workspace. Please try again.");
      }

      router.push(`/projects/${projectId}/workspace?${query}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start a Quick Site Check. Please try again.",
      );
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await startSiteCheck(address);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <SiteHeader navigation={[]} />
      <main className="flex-1">
        <section
          className="mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-4xl flex-col justify-center px-4 py-4 sm:px-6 sm:py-8 lg:px-8"
          aria-labelledby="check-heading"
        >
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <MapPin className="h-4 w-4" /> Plannera Check
            </p>
            <div className="space-y-3">
              <h1
                id="check-heading"
                className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl"
              >
                Run a free Quick Site Check.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-700">
                Reveal available NSW planning controls with cited or unavailable
                evidence. Pilot coverage is focused on Byron and Kempsey. Early
                planning information only; not legal or professional planning
                advice.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-w-2xl border-y border-slate-200 py-4"
            >
              <label
                htmlFor="site-address"
                className="block text-sm font-semibold text-slate-900"
              >
                Site address
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="site-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  autoComplete="street-address"
                  placeholder="1 Example Lane, Sampletown NSW 2000"
                  className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                />
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !address.trim() ||
                    (includeProposal && !proposalComplete)
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "Starting..." : "Run free site check"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70">
                <button
                  type="button"
                  onClick={() => setIncludeProposal((current) => !current)}
                  aria-expanded={includeProposal}
                  aria-controls="proposal-details"
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-emerald-950">
                      Checking a rural shed or outbuilding?
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-emerald-900">
                      Add estimates for a more useful preliminary pathway.
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      includeProposal ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {includeProposal ? (
                  <fieldset
                    id="proposal-details"
                    className="grid gap-3 border-t border-emerald-200 px-4 py-4 sm:grid-cols-2"
                  >
                    <legend className="sr-only">
                      Rural shed proposal estimates
                    </legend>
                    {[
                      ["landAreaHectares", "Land area", "hectares"],
                      [
                        "proposedBuildingFootprintSquareMetres",
                        "Proposed shed footprint",
                        "m²",
                      ],
                      [
                        "existingFarmBuildingFootprintSquareMetres",
                        "Existing farm buildings",
                        "m², enter 0 if none",
                      ],
                      [
                        "proposedBuildingHeightMetres",
                        "Proposed height",
                        "metres",
                      ],
                      ["roadSetbackMetres", "Road setback", "metres"],
                      ["sideSetbackMetres", "Side setback", "metres"],
                      [
                        "otherBoundarySetbackMetres",
                        "Other boundary setback",
                        "metres",
                      ],
                    ].map(([field, label, suffix]) => (
                      <label
                        key={field}
                        className="text-sm font-medium text-slate-800"
                      >
                        {label}
                        <span className="ml-1 font-normal text-slate-500">
                          ({suffix})
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={
                            proposalFields[field as keyof ProposalFields]
                          }
                          onChange={(event) =>
                            updateProposalField(
                              field as keyof ProposalFields,
                              event.target.value,
                            )
                          }
                          required
                          className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                        />
                      </label>
                    ))}
                    <p className="sm:col-span-2 text-xs leading-5 text-slate-600">
                      Estimates help Plannera compare possible controls. They
                      remain user-attested and cannot unlock a paid report until
                      supported by current site evidence.
                    </p>
                  </fieldset>
                ) : null}
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-3 text-sm font-medium text-red-700"
                >
                  {error}
                </p>
              ) : null}
            </form>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Approved launch examples
              </p>
              <div className="flex flex-wrap gap-2">
                {launchExampleAddresses.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => startSiteCheck(example)}
                    disabled={submitting}
                    className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-t border-slate-200 bg-white"
          aria-label="What happens next"
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span className="font-semibold text-slate-900">
              Next: Create project in Plannera
            </span>
            <span className="max-w-2xl">
              The same project and evidence continue into Detailed Planning
              Pack, SEE, and referral steps only when current evidence supports
              them.
            </span>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} Plannera.ai</span>
          <div className="flex items-center gap-4">
            {showItem74hAcceptance ? (
              <Link
                href="/api/internal/item74h-authoritative-spatial"
                prefetch={false}
                className="font-medium text-amber-800 hover:text-amber-950"
              >
                Item 74H acceptance
              </Link>
            ) : null}
            <Link
              href="/privacy"
              className="font-medium text-slate-700 hover:text-slate-950"
            >
              Privacy
            </Link>
            <Link
              href="/projects"
              className="font-medium text-slate-700 hover:text-slate-950"
            >
              My Projects
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
