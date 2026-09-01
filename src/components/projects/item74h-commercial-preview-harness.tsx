"use client";

import { QuickSiteCheckModal } from "@/components/projects/quick-site-check-modal";
import type { PathwayCustomerResult } from "@/lib/pathway-customer-result";
import type { QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";

export function Item74hCommercialPreviewHarness({
  lepResult,
  pathwayResult,
}: {
  lepResult: QuickSiteCheckLepSuccess;
  pathwayResult: PathwayCustomerResult;
}) {
  return (
    <QuickSiteCheckModal
      open
      onClose={() => undefined}
      projectId={lepResult.projectId}
      initialResult={lepResult}
      initialPathwayResult={pathwayResult}
      acceptanceMode
      planningPackCheckoutEnabled={false}
    />
  );
}
