import { describe, expect, it } from "vitest";

import { createItem74hPrivateBlobObjectRef } from "../src/lib/item74h-private-blob-object-ref";

describe("Item 74H private Blob object reference", () => {
  it("creates an opaque JSON pathname accepted by Blob lifecycle operations", () => {
    expect(
      createItem74hPrivateBlobObjectRef(
        "123e4567-e89b-42d3-a456-426614174000",
      ),
    ).toBe("ev_123e4567e89b42d3a456426614174000.json");
  });

  it("rejects malformed identifiers instead of creating ambiguous pathnames", () => {
    expect(() => createItem74hPrivateBlobObjectRef("not-a-uuid")).toThrow(
      "Synthetic private Blob UUID is invalid",
    );
  });
});
