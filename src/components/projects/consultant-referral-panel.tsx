"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Mail, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ConsultantReferralSummary, ConsultantReferralStatus } from "@/types/consultant-referral";

type Props = {
  projectId: string;
  reviewRequestArtefactId: string;
};

const statusCopy: Record<ConsultantReferralStatus, string> = {
  SUBMITTED: "Submitted to Plannera. No consultant has been contacted yet.",
  ACKNOWLEDGED: "Plannera has acknowledged the request and is reviewing the package.",
  ASSIGNED: "Plannera records the package as sent to a consultant. Consultant acknowledgement has not yet been recorded.",
  CONSULTANT_ACKNOWLEDGED: "A consultant has acknowledged receipt of the package.",
  NEEDS_INFORMATION: "Plannera needs more information and will follow up using the submitted email address.",
  DECLINED: "Plannera is unable to progress this request through the current referral queue.",
  CLOSED: "This referral is closed.",
};

const hasEvent = (referral: ConsultantReferralSummary, statuses: ConsultantReferralStatus[]) =>
  referral.events.some((event) => statuses.includes(event.toStatus));

export function ConsultantReferralPanel({ projectId, reviewRequestArtefactId }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [referral, setReferral] = useState<ConsultantReferralSummary | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() =>
    `/api/projects/${encodeURIComponent(projectId)}/consultant-referrals?reviewRequestArtefactId=${encodeURIComponent(reviewRequestArtefactId)}`,
  [projectId, reviewRequestArtefactId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(endpoint, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json() as { enabled?: boolean; referral?: ConsultantReferralSummary | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load referral status");
        if (!active) return;
        setEnabled(payload.enabled === true);
        setReferral(payload.referral ?? null);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load referral status");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint.split("?")[0], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reviewRequestArtefactId,
          contactName,
          contactEmail,
          consent,
        }),
      });
      const payload = await response.json() as { referral?: ConsultantReferralSummary; error?: string };
      if (!response.ok || !payload.referral) throw new Error(payload.error ?? "Unable to submit referral");
      setReferral(payload.referral);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit referral");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Checking direct referral availability...</p>;
  }

  if (referral) {
    const sent = hasEvent(referral, ["ASSIGNED", "CONSULTANT_ACKNOWLEDGED"]);
    const consultantAcknowledged = hasEvent(referral, ["CONSULTANT_ACKNOWLEDGED"]);
    const steps = [
      { label: "Package saved", complete: true },
      { label: "Submitted to Plannera", complete: true },
      { label: "Sent to consultant", complete: sent },
      { label: "Consultant acknowledged", complete: consultantAcknowledged },
    ];
    return (
      <section className="border-t border-slate-200 pt-4 dark:border-slate-700" aria-label="Consultant referral delivery">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-950 dark:text-white">Direct referral status</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{statusCopy[referral.status]}</p>
          </div>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.complete ? CheckCircle2 : Circle;
            return (
              <li key={step.label} className="flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Icon className={step.complete ? "h-4 w-4 shrink-0 text-emerald-600" : "h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600"} aria-hidden="true" />
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          Queue reference {referral.id}. Copying or downloading the package does not change this delivery status.
        </p>
      </section>
    );
  }

  if (!enabled) {
    return (
      <section className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-slate-100">Direct submission is not currently open</p>
        <p className="mt-1">The package is saved and remains available to copy or download. No referral has been submitted.</p>
      </section>
    );
  }

  return (
    <section className="border-t border-slate-200 pt-4 dark:border-slate-700" aria-label="Submit consultant referral">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">Submit to Plannera</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            This sends the exact saved package to Plannera&apos;s human-operated queue. It does not promise matching, availability, quotes or response times.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
          Contact name
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            autoComplete="name"
            className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
          Contact email
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            autoComplete="email"
            className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        />
        <span>I consent to Plannera storing these contact details and this exact package, contacting me about the request, and sharing the package with a consultant if Plannera manually assigns it.</span>
      </label>
      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <a href="/privacy" className="text-xs font-medium text-blue-700 underline dark:text-blue-300">Privacy and deletion</a>
        <Button
          size="sm"
          onClick={submit}
          disabled={submitting || contactName.trim().length < 2 || !contactEmail.includes("@") || !consent}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          {submitting ? "Submitting..." : "Submit to Plannera"}
        </Button>
      </div>
    </section>
  );
}
