type Item74hPrivateBlobEnvironment = {
  ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN?: string;
  ITEM74H_PRIVATE_BLOB_STORE_ID?: string;
  VERCEL_OIDC_TOKEN?: string;
};

export type Item74hPrivateBlobAuth =
  | { oidcToken: string; storeId: string }
  | { storeId: string; token: string };

const readValue = (value: string | undefined) => value?.trim() || undefined;

export const resolveItem74hPrivateBlobAuth = (
  environment: Item74hPrivateBlobEnvironment = process.env,
): Item74hPrivateBlobAuth => {
  const storeId = readValue(environment.ITEM74H_PRIVATE_BLOB_STORE_ID);
  const oidcToken = readValue(environment.VERCEL_OIDC_TOKEN);
  const token = readValue(
    environment.ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN,
  );

  if (!storeId || (!oidcToken && !token)) {
    throw new Error("Dedicated Preview private Blob configuration is unavailable");
  }

  if (oidcToken) {
    return { oidcToken, storeId };
  }

  return { storeId, token: token! };
};
