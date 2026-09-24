import assert from "node:assert/strict";
import test from "node:test";

import {
  completeWorkspaceUploadOcrAttempt,
  failWorkspaceUploadOcrAttempt,
  queueWorkspaceUploadOcr,
  reviewWorkspaceUploadOcrAttempt,
  startWorkspaceUploadOcrAttempt,
  WorkspaceUploadOcrError,
} from "@/lib/upload-evidence-ocr";

const SOURCE_HASH = "a".repeat(64);
const NOW = new Date("2026-09-24T08:00:00.000Z");

const makeStore = () => {
  const upload: any = {
    id: "upload-image-1",
    projectId: "project-db",
    fileName: "site-plan.png",
    contentHash: SOURCE_HASH,
    evidenceStatus: "IMAGE_ONLY",
    indexingStatus: "NOT_APPLICABLE",
    extractedText: null,
    extractionMethod: null,
    extractionMetadata: null,
    extractedAt: null,
    pageCount: null,
    reviewReason:
      "Image evidence requires OCR and visual review before it can support an SEE claim.",
    indexedAt: null,
    indexingError: null,
  };
  const attempts: any[] = [];
  let indexCalls = 0;

  const prisma: any = {
    project: {
      findFirst: async () => ({ id: "project-db" }),
    },
    workspaceUpload: {
      findFirst: async ({ where }: any) =>
        where.id === upload.id && where.projectId === upload.projectId
          ? { ...upload }
          : null,
      update: async ({ where, data }: any) => {
        assert.equal(where.id, upload.id);
        Object.assign(upload, data);
        return { ...upload };
      },
    },
    workspaceUploadOcrAttempt: {
      findFirst: async ({ where }: any) => {
        const rows = attempts.filter(
          (attempt) =>
            (!where?.id || attempt.id === where.id) &&
            (!where?.uploadId || attempt.uploadId === where.uploadId),
        );
        return rows.length
          ? { ...rows.sort((a, b) => b.attempt - a.attempt)[0] }
          : null;
      },
      create: async ({ data }: any) => {
        if (
          attempts.some(
            (attempt) =>
              attempt.uploadId === data.uploadId &&
              attempt.attempt === data.attempt,
          )
        ) {
          throw Object.assign(new Error("duplicate"), { code: "P2002" });
        }
        const record = {
          id: "ocr-" + String(attempts.length + 1),
          resultText: null,
          resultSegments: null,
          resultContentHash: null,
          pageCount: null,
          errorCode: null,
          startedAt: null,
          completedAt: null,
          reviewedAt: null,
          reviewerRef: null,
          reviewNote: null,
          promotedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
          ...data,
        };
        attempts.push(record);
        return { ...record };
      },
      update: async ({ where, data }: any) => {
        const record = attempts.find((attempt) => attempt.id === where.id);
        assert.ok(record);
        Object.assign(record, data);
        return { ...record };
      },
      updateMany: async ({ where, data }: any) => {
        const record = attempts.find(
          (attempt) =>
            attempt.id === where.id &&
            (!where.status || attempt.status === where.status),
        );
        if (!record) return { count: 0 };
        Object.assign(record, data);
        return { count: 1 };
      },
    },
    $transaction: async (callback: any) => callback(prisma),
  };

  const deps: any = {
    prisma,
    indexEvidence: async ({ extraction }: any) => {
      indexCalls += 1;
      assert.equal(extraction.contentHash, SOURCE_HASH);
      assert.equal(extraction.evidenceStatus, "READY");
      return { created: extraction.segments.length };
    },
    now: () => new Date(NOW),
  };

  return {
    upload,
    attempts,
    deps,
    getIndexCalls: () => indexCalls,
    failIndexing: () => {
      deps.indexEvidence = async () => {
        indexCalls += 1;
        throw new Error("embedding unavailable");
      };
    },
  };
};

const queue = (store: ReturnType<typeof makeStore>, retry = false) =>
  queueWorkspaceUploadOcr({
    projectId: "project-public",
    uploadId: store.upload.id,
    userId: "user-1",
    retry,
    deps: store.deps,
  });

const start = (
  store: ReturnType<typeof makeStore>,
  attemptId: string,
) =>
  startWorkspaceUploadOcrAttempt({
    attemptId,
    providerKey: "test_provider",
    sourceContentHash: SOURCE_HASH,
    deps: store.deps,
  });

const complete = (
  store: ReturnType<typeof makeStore>,
  attemptId: string,
) =>
  completeWorkspaceUploadOcrAttempt({
    attemptId,
    providerKey: "test_provider",
    sourceContentHash: SOURCE_HASH,
    segments: [
      { pageNumber: 1, content: "Survey note page one." },
      { pageNumber: 2, content: "Survey note page two." },
    ],
    deps: store.deps,
  });

test("queues image-only OCR once and reuses the active attempt", async () => {
  const store = makeStore();

  const first = await queue(store);
  const replay = await queue(store);

  assert.equal(first.created, true);
  assert.equal(first.attempt.status, "QUEUED");
  assert.equal(replay.created, false);
  assert.equal(replay.attempt.id, first.attempt.id);
  assert.equal(store.attempts.length, 1);
  assert.equal(store.upload.evidenceStatus, "IMAGE_ONLY");
  assert.equal(store.getIndexCalls(), 0);
});

test("refuses OCR for already machine-readable evidence", async () => {
  const store = makeStore();
  store.upload.evidenceStatus = "READY";

  await assert.rejects(
    queue(store),
    (error) => {
      assert.ok(error instanceof WorkspaceUploadOcrError);
      assert.equal(error.status, 409);
      assert.match(error.message, /image-only evidence/);
      return true;
    },
  );
});

test("provider completion stays review-required and cannot enter indexing", async () => {
  const store = makeStore();
  const queued = await queue(store);
  const processing = await start(store, queued.attempt.id);
  const completed = await complete(store, queued.attempt.id);

  assert.equal(processing.status, "PROCESSING");
  assert.equal(completed.status, "REVIEW_REQUIRED");
  assert.match(completed.resultContentHash ?? "", /^[a-f0-9]{64}$/);
  assert.equal(completed.pageCount, 2);
  assert.equal(store.upload.evidenceStatus, "IMAGE_ONLY");
  assert.equal(store.upload.extractedText, null);
  assert.equal(store.upload.indexingStatus, "NOT_APPLICABLE");
  assert.equal(store.getIndexCalls(), 0);
});

test("failed OCR requires an explicit retry and increments the attempt", async () => {
  const store = makeStore();
  const queued = await queue(store);
  await start(store, queued.attempt.id);
  const failed = await failWorkspaceUploadOcrAttempt({
    attemptId: queued.attempt.id,
    sourceContentHash: SOURCE_HASH,
    errorCode: "PROVIDER_TIMEOUT",
    deps: store.deps,
  });

  assert.equal(failed.status, "FAILED");
  await assert.rejects(queue(store), /Retry must be explicit/);

  const retried = await queue(store, true);
  assert.equal(retried.created, true);
  assert.equal(retried.attempt.attempt, 2);
  assert.equal(store.attempts.length, 2);
});

test("rejects an OCR result without promoting or indexing it", async () => {
  const store = makeStore();
  const queued = await queue(store);
  await start(store, queued.attempt.id);
  await complete(store, queued.attempt.id);

  const reviewed = await reviewWorkspaceUploadOcrAttempt({
    projectId: "project-public",
    uploadId: store.upload.id,
    attemptId: queued.attempt.id,
    userId: "user-1",
    decision: "REJECT",
    note: "Text does not match the visible plan annotations.",
    deps: store.deps,
  });

  assert.equal(reviewed.attempt.status, "REJECTED");
  assert.equal(store.upload.evidenceStatus, "IMAGE_ONLY");
  assert.equal(store.getIndexCalls(), 0);
});

test("denies promotion when upload bytes changed after OCR", async () => {
  const store = makeStore();
  const queued = await queue(store);
  await start(store, queued.attempt.id);
  await complete(store, queued.attempt.id);
  store.upload.contentHash = "b".repeat(64);

  await assert.rejects(
    reviewWorkspaceUploadOcrAttempt({
      projectId: "project-public",
      uploadId: store.upload.id,
      attemptId: queued.attempt.id,
      userId: "user-1",
      decision: "APPROVE",
      deps: store.deps,
    }),
    /upload changed after OCR/,
  );
  assert.equal(store.getIndexCalls(), 0);
});

test("review approval promotes exact OCR pages then reuses normal evidence indexing", async () => {
  const store = makeStore();
  const queued = await queue(store);
  await start(store, queued.attempt.id);
  await complete(store, queued.attempt.id);

  const reviewed = await reviewWorkspaceUploadOcrAttempt({
    projectId: "project-public",
    uploadId: store.upload.id,
    attemptId: queued.attempt.id,
    userId: "user-1",
    decision: "APPROVE",
    note: "Visible text checked against both source pages.",
    deps: store.deps,
  });

  assert.equal(reviewed.attempt.status, "PROMOTED");
  assert.equal(reviewed.indexingStatus, "READY");
  assert.equal(store.upload.evidenceStatus, "READY");
  assert.equal(store.upload.indexingStatus, "READY");
  assert.equal(store.upload.extractionMethod, "ocr-reviewed-v1");
  assert.equal(
    store.upload.extractedText,
    "Survey note page one.\n\nSurvey note page two.",
  );
  assert.equal(store.getIndexCalls(), 1);

  const replay = await reviewWorkspaceUploadOcrAttempt({
    projectId: "project-public",
    uploadId: store.upload.id,
    attemptId: queued.attempt.id,
    userId: "user-1",
    decision: "APPROVE",
    deps: store.deps,
  });
  assert.equal(replay.attempt.status, "PROMOTED");
  assert.equal(store.getIndexCalls(), 1);
});

test("accepted OCR can remain readable while downstream indexing failure stays visible", async () => {
  const store = makeStore();
  store.failIndexing();
  const queued = await queue(store);
  await start(store, queued.attempt.id);
  await complete(store, queued.attempt.id);

  const reviewed = await reviewWorkspaceUploadOcrAttempt({
    projectId: "project-public",
    uploadId: store.upload.id,
    attemptId: queued.attempt.id,
    userId: "user-1",
    decision: "APPROVE",
    deps: store.deps,
  });

  assert.equal(reviewed.attempt.status, "PROMOTED");
  assert.equal(reviewed.indexingStatus, "FAILED");
  assert.equal(store.upload.evidenceStatus, "READY");
  assert.equal(store.upload.indexingStatus, "FAILED");
  assert.equal(store.upload.indexingError, "embedding unavailable");
});
