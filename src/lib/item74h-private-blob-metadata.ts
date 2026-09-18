export interface ExactPrivateBlobMetadataDependencies {
  headObject: (objectRef: string) => Promise<unknown>;
  isNotFoundError: (error: unknown) => boolean;
}

export const countExactPrivateBlobObjectsByMetadata = async (
  objectRef: string,
  deps: ExactPrivateBlobMetadataDependencies,
): Promise<0 | 1> => {
  try {
    await deps.headObject(objectRef);
    return 1;
  } catch (error: unknown) {
    if (deps.isNotFoundError(error)) return 0;
    throw error;
  }
};
