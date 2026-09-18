import { randomUUID } from "node:crypto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createItem74hPrivateBlobObjectRef = (
  uuid: string = randomUUID(),
): string => {
  if (!UUID_PATTERN.test(uuid)) {
    throw new Error("Synthetic private Blob UUID is invalid");
  }

  return `ev_${uuid.replaceAll("-", "").toLowerCase()}.json`;
};
