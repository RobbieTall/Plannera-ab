import React from "react";

export const CONSULTANT_CREDENTIAL_DISCLOSURE =
  "Consultants self-report their qualifications and regions of service. Plannera does not verify professional credentials or memberships. Users should confirm relevant licences directly with consultants before engaging.";

export function ConsultantCredentialDisclosure() {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
      role="note"
      aria-label="Consultant credential disclosure"
    >
      {CONSULTANT_CREDENTIAL_DISCLOSURE}
    </div>
  );
}
