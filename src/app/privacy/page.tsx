import Link from "next/link";

import { SiteHeader } from "@/components/navigation/site-header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader navigation={[]} />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-blue-700">Plannera.ai</p>
        <h1 className="mt-2 text-3xl font-semibold">Privacy and product measurement</h1>
        <p className="mt-4 text-base leading-7 text-slate-700">
          Plannera records a small set of successful product milestones so we can understand whether
          the planning workflow is working. This measurement is first-party and is not used for
          advertising or user profiling.
        </p>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold">What is measured</h2>
          <p className="mt-2 leading-7 text-slate-700">
            We record completed steps such as starting a check, saving cited evidence, creating a
            project-bound planning pack, generating a feasibility summary or SEE draft, preparing an
            expert review package, and copying or downloading that package.
          </p>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold">What is excluded</h2>
          <p className="mt-2 leading-7 text-slate-700">
            Measurement events do not contain street addresses, parcel or coordinate data, proposed
            works text, planning clauses, chat content, names, email addresses, uploaded documents,
            payment details, or consultant contact details. Plannera does not load a third-party
            analytics SDK, marketing pixel, or advertising tracker for this measurement.
          </p>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold">Retention and deletion</h2>
          <p className="mt-2 leading-7 text-slate-700">
            Events expire after 90 days. They are linked only to opaque internal project and output
            identifiers, and deleting a project removes its associated measurement events. Test,
            preview, demonstration, and development-bypass activity is excluded from customer
            conversion reporting.
          </p>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold">Consultant referral requests</h2>
          <p className="mt-2 leading-7 text-slate-700">
            Direct referral submission is optional and requires explicit consent. Plannera stores
            the submitted contact name and email, an immutable copy of the exact review package,
            consent time, and a delivery-status audit trail. This information is available only to
            authorised Plannera operators running the human referral queue and to a consultant only
            after Plannera manually assigns the request. It is not added to product-measurement
            events, used for advertising, or presented as automated matching.
          </p>
          <p className="mt-2 leading-7 text-slate-700">
            Declined and closed referral records are scheduled for deletion after 180 days. Deleting
            the project also deletes its referral records. An authorised operator can delete a
            referral earlier in response to a verified deletion request.
          </p>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold">Access</h2>
          <p className="mt-2 leading-7 text-slate-700">
            Product-measurement access is restricted to authorised Plannera operators and reports
            return aggregate counts rather than project or user details. Referral queue access is
            separately restricted to authorised operators and is used only to action submitted
            requests. Questions, consent withdrawal, or deletion requests can be sent
            to{" "}
            <a className="font-semibold text-blue-700 underline" href="mailto:hello@plannera.ai">
              hello@plannera.ai
            </a>
            .
          </p>
        </section>

        <Link
          href="/"
          className="mt-10 inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-blue-700"
        >
          Return to Plannera Check
        </Link>
      </main>
    </div>
  );
}
