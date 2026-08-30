export const SEE_EVIDENCE_TOPICS = [
  { id: "site_context", label: "Site context and survey" },
  { id: "statutory_planning", label: "Statutory planning controls" },
  { id: "built_form_design", label: "Built form and design" },
  { id: "access_parking_traffic", label: "Access, parking and traffic" },
  { id: "flooding_stormwater", label: "Flooding and stormwater" },
  { id: "bushfire", label: "Bushfire" },
  { id: "biodiversity_landscaping", label: "Biodiversity, trees and landscaping" },
  { id: "heritage_aboriginal", label: "Heritage and Aboriginal heritage" },
  { id: "contamination_geotechnical", label: "Contamination and geotechnical" },
  { id: "servicing_waste", label: "Servicing and waste" },
  { id: "acoustic_amenity", label: "Acoustic and amenity impacts" },
  { id: "social_economic_public_interest", label: "Social, economic and public interest" },
] as const;

export type SeeEvidenceTopicId = (typeof SEE_EVIDENCE_TOPICS)[number]["id"];

export const SEE_EVIDENCE_TOPIC_IDS = SEE_EVIDENCE_TOPICS.map((topic) => topic.id) as [
  SeeEvidenceTopicId,
  ...SeeEvidenceTopicId[],
];

export const seeEvidenceTopicLabel = (topicId: string) =>
  SEE_EVIDENCE_TOPICS.find((topic) => topic.id === topicId)?.label ?? topicId;

export const parseSeeEvidenceTopics = (value: unknown): SeeEvidenceTopicId[] => {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(SEE_EVIDENCE_TOPIC_IDS);
  return [...new Set(value.filter((topic): topic is SeeEvidenceTopicId =>
    typeof topic === "string" && allowed.has(topic),
  ))].sort();
};
