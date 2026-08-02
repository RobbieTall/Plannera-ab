export const consultantReferralStatuses = [
  "SUBMITTED",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "CONSULTANT_ACKNOWLEDGED",
  "NEEDS_INFORMATION",
  "DECLINED",
  "CLOSED",
] as const;

export type ConsultantReferralStatus = (typeof consultantReferralStatuses)[number];

export type ConsultantReferralEventSummary = {
  fromStatus: ConsultantReferralStatus | null;
  toStatus: ConsultantReferralStatus;
  occurredAt: string;
  reasonCode: string | null;
};

export type ConsultantReferralSummary = {
  id: string;
  reviewRequestArtefactId: string;
  status: ConsultantReferralStatus;
  queueTarget: "plannera_human_queue";
  submittedAt: string;
  updatedAt: string;
  events: ConsultantReferralEventSummary[];
};
